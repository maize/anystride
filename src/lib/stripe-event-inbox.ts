import "server-only";
import Stripe from "stripe";
import { Pool } from "pg";
import { X509Certificate } from "node:crypto";
import { PaymentError } from "./payment-config";

// Observation only: this inbox never updates bookings or grants coach access.
const eventObjects: Record<string, string> = {
  "checkout.session.completed": "checkout.session",
  "checkout.session.async_payment_succeeded": "checkout.session",
  "checkout.session.async_payment_failed": "checkout.session",
  "checkout.session.expired": "checkout.session",
  "charge.refunded": "charge",
  "charge.dispute.created": "dispute",
  "charge.dispute.updated": "dispute",
  "charge.dispute.closed": "dispute",
};

export function liveInboxConfig() {
  const env = process.env;
  if (env.STRIPE_WEBHOOK_MODE !== "live-inbox") throw new PaymentError("Live event inbox is disabled.");
  if (!/^whsec_[A-Za-z0-9]+$/.test(env.STRIPE_LIVE_WEBHOOK_SECRET ?? "") ||
      !/^acct_[A-Za-z0-9]+$/.test(env.STRIPE_LIVE_PLATFORM_ACCOUNT_ID ?? "")) {
    throw new PaymentError("Live event inbox setup is incomplete.");
  }
  // Reusing the existing Anystride database is an explicit operator choice.
  const source = env.STRIPE_EVENT_DATABASE_SOURCE;
  const connectionString = source === "POSTGRES_URL" ? env.POSTGRES_URL
    : source === "STRIPE_EVENT_DATABASE_URL" ? env.STRIPE_EVENT_DATABASE_URL : undefined;
  let database: URL;
  try { database = new URL(connectionString ?? ""); } catch { throw new PaymentError("Live event database is not configured."); }
  if (!["postgres:", "postgresql:"].includes(database.protocol) || !database.hostname || database.pathname === "/") {
    throw new PaymentError("Invalid live event database configuration.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(database.hostname);
  // pg connection-string SSL options otherwise override the verified TLS object.
  for (const key of [...database.searchParams.keys()]) {
    if (key.startsWith("ssl")) database.searchParams.delete(key);
  }
  const ca = env.STRIPE_EVENT_DATABASE_CA?.trim();
  if (ca) {
    try {
      if (ca.length > 16384 || !new X509Certificate(ca).ca) throw new Error("Not a CA certificate");
    } catch { throw new PaymentError("Invalid live event database CA certificate."); }
  }
  return {
    secret: env.STRIPE_LIVE_WEBHOOK_SECRET!, platform: env.STRIPE_LIVE_PLATFORM_ACCOUNT_ID!,
    database: database.toString(), ssl: local ? false as const : { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  };
}

let pool: Pool | undefined;
function eventPool(config: ReturnType<typeof liveInboxConfig>) {
  if (!pool) {
    pool = new Pool({ connectionString: config.database, ssl: config.ssl, max: 3,
      connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000, statement_timeout: 5000 });
    // Do not log driver errors: they can include connection details or event data.
    pool.on("error", () => { console.error("Stripe event database connection failed."); });
  }
  return pool;
}

export async function receiveLiveStripeEvent(raw: string, signature: string) {
  const config = liveInboxConfig();
  let event: Stripe.Event;
  try { event = Stripe.webhooks.constructEvent(raw, signature, config.secret); }
  catch { throw new PaymentError("Invalid Stripe signature.", 400); }
  // Endpoint must be registered on the platform's 'Your account', not Connect
  // or organisation/thin events. The endpoint-specific signature establishes origin.
  if (event.livemode !== true || event.account !== undefined || event.context !== undefined || event.object !== "event") {
    throw new PaymentError("Expected a live platform snapshot event.", 400);
  }
  const expectedObject = Object.hasOwn(eventObjects, event.type) ? eventObjects[event.type] : undefined;
  if (!expectedObject) return { received: true, ignored: true };
  const object = event.data?.object;
  if (!/^evt_[A-Za-z0-9_]{1,240}$/.test(event.id ?? "") || !object ||
      object.object !== expectedObject || !("id" in object) || typeof object.id !== "string" ||
      !/^[A-Za-z0-9_]{1,255}$/.test(object.id) ||
      ("livemode" in object && object.livemode !== true) ||
      !Number.isSafeInteger(event.created) || event.created <= 0 || event.created > 253402300799) {
    throw new PaymentError("Invalid Stripe event reference.", 400);
  }
  // One atomic insert; acknowledge only after commit. Duplicate delivery is safe.
  // Deliberately discard raw payload, customer email, billing data and metadata.
  const result = await eventPool(config).query(
    `INSERT INTO stripe_live_event_inbox
      (platform_account_id, event_id, event_type, object_id, object_type, stripe_created_at, api_version)
     VALUES ($1,$2,$3,$4,$5,to_timestamp($6),$7)
     ON CONFLICT (platform_account_id, event_id) DO NOTHING RETURNING event_id`,
    [config.platform, event.id, event.type, object.id, object.object, event.created, event.api_version ?? null],
  );
  return { received: true, duplicate: result.rows.length === 0 };
}
