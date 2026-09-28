import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { rootCertificates } from "node:tls";
import Stripe from "stripe";
import { PGlite } from "@electric-sql/pglite";
import { load } from "./support/load-module.mjs";

const env = {
  STRIPE_WEBHOOK_MODE: "live-inbox", STRIPE_LIVE_WEBHOOK_SECRET: "whsec_fixture",
  STRIPE_LIVE_PLATFORM_ACCOUNT_ID: "acct_fixture", STRIPE_EVENT_DATABASE_SOURCE: "STRIPE_EVENT_DATABASE_URL",
  STRIPE_EVENT_DATABASE_URL: "postgresql://localhost/inbox_fixture",
};
const event = (changes = {}) => ({ id: "evt_fixture", object: "event", type: "checkout.session.completed", livemode: true,
  created: Math.floor(Date.now() / 1000), api_version: "2026-08-27.dahlia",
  data: { object: { id: "cs_live_fixture", object: "checkout.session", livemode: true,
    customer_email: "private@example.com", metadata: { sensitive: "never persist" } } }, ...changes });
const sign = (body, timestamp) => Stripe.webhooks.generateTestHeaderString({ payload: body, secret: env.STRIPE_LIVE_WEBHOOK_SECRET, timestamp });

function fixture(query, overrides = {}, poolOptions = []) {
  class Pool {
    constructor(options) { poolOptions.push(options); }
    on() {}
    query = query;
  }
  const globals = { process: { env: { ...env, ...overrides } }, Request, Response, console };
  const mocks = { "server-only": {}, stripe: { default: Stripe }, pg: { Pool } };
  const cache = new Map();
  return {
    inbox: load("src/lib/stripe-event-inbox.ts", mocks, globals, cache),
    route: load("src/app/api/stripe/live-webhook/route.ts", mocks, globals, cache),
  };
}
const request = (body, signature = sign(body)) => new Request("https://anystride.example/api/stripe/live-webhook", {
  method: "POST", body, headers: signature ? { "stripe-signature": signature } : {},
});

test("live inbox requires explicit configuration but no Stripe API credential", async () => {
  const { inbox } = fixture(async () => ({ rows: [{}] }));
  assert.equal(inbox.liveInboxConfig().platform, "acct_fixture");
  const raw = JSON.stringify(event());
  assert.equal((await inbox.receiveLiveStripeEvent(raw, sign(raw))).received, true);
  for (const overrides of [
    { STRIPE_WEBHOOK_MODE: "off" }, { STRIPE_WEBHOOK_MODE: "test" }, { STRIPE_LIVE_WEBHOOK_SECRET: "" },
    { STRIPE_LIVE_PLATFORM_ACCOUNT_ID: "bad" }, { STRIPE_EVENT_DATABASE_SOURCE: "" },
    { STRIPE_EVENT_DATABASE_SOURCE: "PAYMENTS_DATABASE_URL" }, { STRIPE_EVENT_DATABASE_URL: "https://db.example/db" },
    { STRIPE_EVENT_DATABASE_URL: "postgresql://localhost/" },
  ]) assert.throws(() => fixture(async () => {}, overrides).inbox.liveInboxConfig());
});

test("remote database always uses certificate verification, including provider URL SSL overrides", async () => {
  const options = [];
  const { inbox } = fixture(async () => ({ rows: [{}] }), {
    STRIPE_EVENT_DATABASE_SOURCE: "POSTGRES_URL",
    POSTGRES_URL: "postgresql://db.example/anystride?sslmode=no-verify&sslrootcert=untrusted",
  }, options);
  const raw = JSON.stringify(event());
  await inbox.receiveLiveStripeEvent(raw, sign(raw));
  assert.equal(options[0].ssl.rejectUnauthorized, true);
  assert.equal(new URL(options[0].connectionString).searchParams.has("sslmode"), false);
  assert.equal(new URL(options[0].connectionString).searchParams.has("sslrootcert"), false);
});

test("provider CA is scoped to the inbox pool, and malformed certificates fail closed", () => {
  const config = fixture(async () => {}, {
    STRIPE_EVENT_DATABASE_URL: "postgresql://db.example/anystride", STRIPE_EVENT_DATABASE_CA: rootCertificates[0],
  }).inbox.liveInboxConfig();
  assert.equal(config.ssl.ca, rootCertificates[0].trim());
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.throws(() => fixture(async () => {}, { STRIPE_EVENT_DATABASE_CA: "not-a-certificate" }).inbox.liveInboxConfig(), /CA certificate/);
});

test("real signatures: missing, forged, altered, expired and oversized deliveries never reach SQL", async () => {
  let writes = 0;
  const { route } = fixture(async () => { writes++; return { rows: [{}] }; });
  const raw = JSON.stringify(event());
  for (const req of [request(raw, ""), request(raw, "invalid"), request(`${raw} `, sign(raw)),
    request(raw, sign(raw, Math.floor(Date.now() / 1000) - 600))]) {
    assert.equal((await route.POST(req)).status, 400);
  }
  assert.equal((await route.POST(request("x".repeat(262145)))).status, 413);
  assert.equal(writes, 0);
});

test("test, Connect, organisation, thin and malformed events cannot enter the live inbox", async () => {
  let writes = 0;
  const { route } = fixture(async () => { writes++; return { rows: [{}] }; });
  for (const change of [{ livemode: false }, { account: "acct_coach" }, { context: "acct_platform" },
    { object: "v2.core.event" }, { id: "bad" }, { created: -1 }, { data: {} },
    { data: { object: { id: "cs_test_fixture", object: "checkout.session", livemode: false } } },
    { data: { object: { id: "ch_fixture", object: "charge", livemode: true } } }]) {
    assert.equal((await route.POST(request(JSON.stringify(event(change))))).status, 400);
  }
  assert.equal(writes, 0);
});

test("unsupported events are explicitly ignored without storing payloads", async () => {
  let writes = 0;
  const { route } = fixture(async () => { writes++; return { rows: [{}] }; });
  for (const type of ["customer.created", "constructor", "__proto__"]) {
    const response = await route.POST(request(JSON.stringify(event({ type }))));
    assert.deepEqual(await response.json(), { received: true, ignored: true });
  }
  assert.equal(writes, 0);
});

test("database failure is retryable and never exposes driver credentials", async () => {
  const { route } = fixture(async () => { throw new Error("postgresql://sensitive-password@private-db"); });
  const response = await route.POST(request(JSON.stringify(event())));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Event storage unavailable. Retry delivery." });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("real SQL: durable reference-only inbox, deduplication, RLS and no paid-state mutation", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const migration = readFileSync(new URL("../db/migrations/003_stripe_live_event_inbox.sql", import.meta.url), "utf8");
  await db.exec(migration);
  await db.exec(migration);
  const { route } = fixture((sql, params) => db.query(sql, params));
  const raw = JSON.stringify(event());
  assert.deepEqual(await (await route.POST(request(raw))).json(), { received: true, duplicate: false });
  assert.deepEqual(await (await route.POST(request(raw))).json(), { received: true, duplicate: true });
  // Out-of-order events are retained as references, never interpreted as access.
  const refund = JSON.stringify(event({ id: "evt_refund", type: "charge.refunded", created: 1700000000,
    data: { object: { id: "ch_fixture", object: "charge", livemode: true } } }));
  assert.equal((await route.POST(request(refund))).status, 200);
  const { rows } = await db.query("SELECT * FROM stripe_live_event_inbox");
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.status === "received" && row.livemode === true));
  assert.equal(JSON.stringify(rows).includes("private@example.com"), false);
  assert.equal(JSON.stringify(rows).includes("never persist"), false);
  assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE relname='stripe_live_event_inbox'")).rows[0].relrowsecurity, true);
  await db.exec("CREATE ROLE inbox_browser; GRANT USAGE ON SCHEMA public TO inbox_browser; GRANT SELECT ON stripe_live_event_inbox TO inbox_browser; SET ROLE inbox_browser;");
  assert.equal((await db.query("SELECT * FROM stripe_live_event_inbox")).rows.length, 0);
  await db.exec("RESET ROLE;");
  await assert.rejects(db.query("UPDATE stripe_live_event_inbox SET status='paid'"));
});

test("disabled route returns 503 without touching Stripe or the database", async () => {
  let writes = 0;
  const { route } = fixture(async () => { writes++; }, { STRIPE_WEBHOOK_MODE: "off" });
  assert.equal((await route.POST(request("{}", ""))).status, 503);
  assert.equal(writes, 0);
});
