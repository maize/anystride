import { timingSafeEqual } from "node:crypto";

export class PaymentError extends Error {
  constructor(message: string, public status = 503) { super(message); }
}

export interface TestOffer {
  id: string;
  title: string;
  coachAccount: string;
  amount: number;
  currency: "usd" | "eur" | "gbp";
  fee: number;
  approved: true;
}

export function paymentConfig() {
  const env = process.env;
  // Deliberately no live branch: live payments require a separately reviewed release.
  if (env.STRIPE_PAYMENTS_MODE !== "test" || !/^sk_test_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY ?? "")) {
    throw new PaymentError("Stripe test payments are not configured.");
  }
  if (!/^acct_[A-Za-z0-9]+$/.test(env.STRIPE_PLATFORM_ACCOUNT_ID ?? "") || !env.PAYMENTS_DATABASE_URL || !env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")) {
    throw new PaymentError("Stripe test setup is incomplete.");
  }
  let origin: URL;
  try { origin = new URL(env.STRIPE_APP_URL ?? ""); } catch { throw new PaymentError("Set a fixed payment return origin."); }
  const local = ["localhost", "127.0.0.1"].includes(origin.hostname);
  if ((origin.protocol !== "https:" && !(local && origin.protocol === "http:")) || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/") {
    throw new PaymentError("Invalid payment return origin.");
  }
  return { key: env.STRIPE_SECRET_KEY!, platform: env.STRIPE_PLATFORM_ACCOUNT_ID!, webhookSecret: env.STRIPE_WEBHOOK_SECRET!, origin: origin.origin };
}

/** Private server configuration until authenticated coach offer management exists. */
export function testOffer(id: string): TestOffer {
  let offers: unknown;
  try { offers = JSON.parse(process.env.STRIPE_TEST_OFFERS ?? "[]"); } catch { throw new PaymentError("Invalid test offer configuration."); }
  if (!Array.isArray(offers) || offers.length > 20) throw new PaymentError("Invalid test offer configuration.");
  const matches = offers.filter((o) => o && typeof o === "object" && o.id === id);
  if (matches.length !== 1) throw new PaymentError("Approved test offer not found.", 404);
  const o = matches[0];
  if (o.approved !== true || typeof o.title !== "string" || !o.title.trim() || o.title.length > 160 ||
      !/^acct_[A-Za-z0-9]+$/.test(o.coachAccount ?? "") ||
      !["usd", "eur", "gbp"].includes(o.currency) || !Number.isSafeInteger(o.amount) || o.amount < 100 || o.amount > 100000 ||
      !Number.isSafeInteger(o.fee) || o.fee < 0 || o.fee >= o.amount) throw new PaymentError("Invalid test offer configuration.");
  return { id, title: o.title.trim(), coachAccount: o.coachAccount, amount: o.amount, currency: o.currency, fee: o.fee, approved: true };
}

export function requirePaymentOperator(request: Request) {
  const token = process.env.PAYMENTS_ADMIN_TOKEN;
  if (!token || token.length < 32) throw new PaymentError("Payment administration is disabled.", 404);
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${token}`);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) throw new PaymentError("Unauthorized.", 401);
}

export function parseCheckout(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new PaymentError("Invalid test booking.", 400);
  const b = body as Record<string, unknown>;
  if (Object.keys(b).some((key) => !["bookingId", "offerId", "email"].includes(key)) ||
      typeof b.bookingId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(b.bookingId) ||
      typeof b.offerId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b.offerId) || b.offerId.length > 80 ||
      typeof b.email !== "string" || b.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) throw new PaymentError("Provide a booking UUID, approved offer ID and test email only.", 400);
  return { bookingId: b.bookingId.toLowerCase(), offerId: b.offerId, email: b.email.toLowerCase() };
}
