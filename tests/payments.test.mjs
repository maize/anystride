import assert from "node:assert/strict";
import { test } from "node:test";
import Stripe from "stripe";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { load } from "./support/load-module.mjs";

const id = "6e75ac8c-c743-43c7-a913-cc264ac6036e";
const token = "test-operator-credential-at-least-32-characters";
const offer = { id: "test-consultation", title: "Test consultation", coachAccount: "acct_coach", amount: 5000, currency: "usd", fee: 500, approved: true };
const env = {
  STRIPE_PAYMENTS_MODE: "test", STRIPE_SECRET_KEY: "sk_test_fixture",
  STRIPE_WEBHOOK_SECRET: "whsec_fixture", STRIPE_PLATFORM_ACCOUNT_ID: "acct_platform",
  STRIPE_APP_URL: "http://localhost:3010", PAYMENTS_DATABASE_URL: "postgresql://localhost/isolated_test",
  PAYMENTS_ADMIN_TOKEN: token, STRIPE_TEST_OFFERS: JSON.stringify([offer]),
};
const globals = (overrides = {}) => ({ process: { env: { ...env, ...overrides } }, Response, Request });
const input = { bookingId: id, offerId: offer.id, email: "runner@example.com" };
const request = (body = input, auth = `Bearer ${token}`) => new Request("http://localhost/api/stripe/checkout", {
  method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body),
});
const booking = () => ({
  id, amount: 5000, currency: "usd", fee: 500, coach_account: "acct_coach", status: "pending",
  checkout_session_id: "cs_test_fixture", payment_intent_id: null, created_at: new Date(),
});
const session = () => ({
  id: "cs_test_fixture", mode: "payment", status: "complete", payment_status: "paid", livemode: false,
  client_reference_id: id, metadata: { app: "anystride", booking_id: id }, amount_total: 5000, currency: "usd",
  payment_intent: { id: "pi_fixture", livemode: false, amount: 5000, amount_received: 5000, currency: "usd",
    application_fee_amount: 500, transfer_data: { destination: "acct_coach" }, status: "succeeded",
    metadata: { app: "anystride", booking_id: id }, latest_charge: { paid: true, refunded: false, disputed: false, amount_refunded: 0 } },
});

test("real SQL: checkout persists, verified payment is deduplicated, refunds cannot be undone by stale events", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(readFileSync(new URL("../db/migrations/001_test_payments.sql", import.meta.url), "utf8"));
  const query = (sql, params) => db.query(sql, params);
  class Pool { query = query; async connect() { return { query, release() {} }; } }
  let creates = 0;
  let canonical = { ...session(), status: "open", payment_status: "unpaid", payment_intent: null, url: "https://checkout.stripe.com/c/pay/cs_test_fixture" };
  const stripe = {
    accounts: { retrieve: async (account) => account ? { id: "acct_coach", country: "US", details_submitted: true, charges_enabled: true, payouts_enabled: true, capabilities: { transfers: "active" } } : { id: "acct_platform", country: "US" } },
    checkout: { sessions: { create: async (_params, options) => { creates++; assert.equal(options.idempotencyKey, `anystride-test-${id}`); return canonical; }, retrieve: async () => canonical } },
    paymentIntents: { retrieve: async () => canonical.payment_intent },
  };
  const mocks = { pg: { Pool }, "./stripe": { testStripe: () => stripe } };
  const cache = new Map();
  const checkout = load("src/lib/payment-checkout.ts", mocks, globals(), cache);
  const webhook = load("src/lib/payment-webhook.ts", mocks, globals(), cache);
  await checkout.createTestCheckout(input);
  await checkout.createTestCheckout(input);
  assert.equal(creates, 1);
  const record = async () => (await db.query("SELECT * FROM stripe_test_bookings WHERE id=$1", [id])).rows[0];
  assert.equal((await record()).status, "pending");
  canonical = session();
  const event = { id: "evt_sql_paid", type: "checkout.session.completed", livemode: false, data: { object: canonical } };
  await webhook.processTestEvent(stripe, event);
  await webhook.processTestEvent(stripe, event);
  assert.equal((await record()).status, "paid");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM stripe_test_events")).rows[0].n, 1);
  await assert.rejects(checkout.createTestCheckout(input), /no longer payable/);
  canonical = { ...session(), amount_total: 1 };
  await assert.rejects(webhook.processTestEvent(stripe, { ...event, id: "evt_sql_tampered" }), /does not match/);
  assert.equal((await record()).status, "paid");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM stripe_test_events")).rows[0].n, 1);
  canonical = session();
  canonical.payment_intent.latest_charge.refunded = true;
  await webhook.processTestEvent(stripe, { id: "evt_sql_refund", type: "charge.refunded", livemode: false, data: { object: { payment_intent: "pi_fixture" } } });
  assert.equal((await record()).status, "refunded");
  canonical = session();
  await webhook.processTestEvent(stripe, { ...event, id: "evt_sql_stale_paid" });
  assert.equal((await record()).status, "refunded");
});

test("Stripe is off by default, rejects live keys and requires complete test configuration", () => {
  for (const overrides of [
    { STRIPE_PAYMENTS_MODE: "off" }, { STRIPE_PAYMENTS_MODE: "live" }, { STRIPE_SECRET_KEY: "sk_live_fixture" },
    { PAYMENTS_DATABASE_URL: "" }, { STRIPE_PLATFORM_ACCOUNT_ID: "" }, { STRIPE_WEBHOOK_SECRET: "" },
    { STRIPE_APP_URL: "http://example.com" }, { STRIPE_APP_URL: "https://user:pass@example.com" },
    { STRIPE_APP_URL: "https://example.com/?redirect=evil" }, { STRIPE_APP_URL: "https://example.com/path" },
  ]) assert.throws(() => load("src/lib/payment-config.ts", {}, globals(overrides)).paymentConfig());
  assert.equal(load("src/lib/payment-config.ts", {}, globals()).paymentConfig().origin, "http://localhost:3010");
});

test("operator auth is separate, bearer-only and fails closed", () => {
  const { requirePaymentOperator } = load("src/lib/payment-config.ts", {}, globals());
  requirePaymentOperator(request());
  for (const req of [request(input, "wrong"), new Request(`http://localhost/?token=${token}`)]) assert.throws(() => requirePaymentOperator(req));
  assert.throws(() => load("src/lib/payment-config.ts", {}, globals({ PAYMENTS_ADMIN_TOKEN: "short" })).requirePaymentOperator(request()));
});

test("checkout never accepts arbitrary prices, destinations or redirect URLs", () => {
  const { parseCheckout, testOffer } = load("src/lib/payment-config.ts", {}, globals());
  assert.equal(parseCheckout(input).bookingId, id);
  for (const body of [null, {}, { ...input, amount: 1 }, { ...input, coachAccount: "acct_attacker" }, { ...input, success_url: "https://attacker.test" }, { ...input, bookingId: "wrong" }, { ...input, email: "bad" }]) assert.throws(() => parseCheckout(body));
  assert.equal(testOffer(offer.id).fee, 500);
  assert.throws(() => testOffer("unknown"));
  for (const badOffer of [{ ...offer, approved: false }, { ...offer, amount: 1.2 }, { ...offer, fee: -1 }, { ...offer, fee: 5000 }, { ...offer, currency: "jpy" }]) {
    assert.throws(() => load("src/lib/payment-config.ts", {}, globals({ STRIPE_TEST_OFFERS: JSON.stringify([badOffer]) })).testOffer(offer.id));
  }
});

test("checkout parameters use fixed offers, a destination fee and no private return URL data", () => {
  const { checkoutParameters } = load("src/lib/payment-checkout.ts", {}, globals());
  const params = checkoutParameters(id, input.email, offer, "http://localhost:3010");
  assert.equal(params.line_items[0].price_data.unit_amount, 5000);
  assert.equal(params.payment_intent_data.transfer_data.destination, "acct_coach");
  assert.equal(params.payment_intent_data.application_fee_amount, 500);
  assert.equal(params.payment_intent_data.metadata.booking_id, id);
  assert.equal(params.success_url, "http://localhost:3010/coaching/payment-return");
  assert.deepEqual(Array.from(params.payment_method_types), ["card"]);
});

test("Connect readiness rejects incomplete, wrong-platform and cross-border accounts", async () => {
  const { checkTestCoach } = load("src/lib/payment-checkout.ts", {}, globals());
  const accounts = (changes = {}, platform = {}) => ({ accounts: { retrieve: async (account) => account
    ? { id: "acct_coach", country: "US", details_submitted: true, charges_enabled: true, payouts_enabled: true, capabilities: { transfers: "active" }, ...changes }
    : { id: "acct_platform", country: "US", ...platform } } });
  assert.equal((await checkTestCoach(accounts(), offer)).ready, true);
  for (const changes of [{ payouts_enabled: false }, { charges_enabled: false }, { details_submitted: false }, { capabilities: {} }, { country: "DE" }, { id: "acct_platform" }]) await assert.rejects(checkTestCoach(accounts(changes), offer));
  await assert.rejects(checkTestCoach(accounts({}, { id: "acct_other" }), offer));
});

test("checkout endpoint authorizes and validates before any payment creation", async () => {
  let calls = 0;
  const { POST } = load("src/app/api/stripe/checkout/route.ts", { "@/lib/payment-checkout": { createTestCheckout: async () => { calls++; return { testMode: true }; } } }, globals());
  assert.equal((await POST(request(input, "wrong"))).status, 401);
  assert.equal((await POST(request("{"))).status, 400);
  assert.equal((await POST(request("x".repeat(4097)))).status, 413);
  assert.equal((await POST(request({ ...input, amount: 1 }))).status, 400);
  assert.equal(calls, 0);
  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(calls, 1);
});

test("only a complete, correctly routed payment records paid status", () => {
  const { verifiedPaymentState } = load("src/lib/payment-webhook.ts", {}, globals());
  assert.equal(verifiedPaymentState(booking(), session()), "paid");
  assert.equal(verifiedPaymentState(booking(), { ...session(), payment_status: "unpaid" }), "pending");
  assert.equal(verifiedPaymentState(booking(), { ...session(), payment_intent: null, payment_status: "unpaid", status: "expired" }), "expired");
  for (const bad of [{ ...session(), livemode: true }, { ...session(), amount_total: 1 }, { ...session(), currency: "eur" }, { ...session(), id: "cs_other" }, { ...session(), client_reference_id: "other" }, { ...session(), payment_intent: null }]) assert.throws(() => verifiedPaymentState(booking(), bad));
  for (const changes of [{ amount: 1 }, { transfer_data: { destination: "acct_other" } }, { application_fee_amount: 0 }, { latest_charge: null }, { metadata: {} }]) assert.throws(() => verifiedPaymentState(booking(), { ...session(), payment_intent: { ...session().payment_intent, ...changes } }));
});

test("refunds and disputes flag bookings, and old events cannot restore a held booking", () => {
  const { verifiedPaymentState } = load("src/lib/payment-webhook.ts", {}, globals());
  for (const [change, expected] of [[{ refunded: true }, "refunded"], [{ disputed: true }, "review"], [{ amount_refunded: 100 }, "review"]]) {
    const s = session(); Object.assign(s.payment_intent.latest_charge, change);
    assert.equal(verifiedPaymentState(booking(), s), expected);
  }
  assert.equal(verifiedPaymentState({ ...booking(), status: "review" }, session()), "review");
  assert.equal(verifiedPaymentState({ ...booking(), status: "refunded" }, session()), "refunded");
});

test("real Stripe signature verification rejects forged, altered, expired and oversized events", async () => {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  let handled = 0;
  const { POST } = load("src/app/api/stripe/webhook/route.ts", {
    "@/lib/stripe": { testStripe: () => stripe },
    "@/lib/payment-webhook": { processTestEvent: async () => { handled++; } },
  }, globals());
  const payload = JSON.stringify({ id: "evt_fixture", type: "checkout.session.completed", livemode: false, data: { object: session() } });
  const sign = (timestamp) => stripe.webhooks.generateTestHeaderString({ payload, secret: env.STRIPE_WEBHOOK_SECRET, timestamp });
  const webhook = (body, signature) => new Request("http://localhost/api/stripe/webhook", { method: "POST", headers: signature ? { "Stripe-Signature": signature } : {}, body });
  assert.equal((await POST(webhook(payload))).status, 400);
  assert.equal((await POST(webhook(payload, "forged"))).status, 400);
  assert.equal((await POST(webhook(`${payload} `, sign()))).status, 400);
  assert.equal((await POST(webhook(payload, sign(Math.floor(Date.now() / 1000) - 600)))).status, 400);
  assert.equal((await POST(webhook("x".repeat(262145), sign()))).status, 413);
  assert.equal(handled, 0);
  assert.equal((await POST(webhook(payload, sign()))).status, 200);
  assert.equal(handled, 1);
});

test("webhook replay is deduplicated and canonical state is read within the booking transaction", async () => {
  const event = { id: "evt_fixture", type: "checkout.session.completed", livemode: false, data: { object: session() } };
  for (const duplicate of [false, true]) {
    const calls = [];
    const client = { query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.startsWith("SELECT *")) return { rows: [booking()] };
      if (sql.startsWith("SELECT id")) return { rows: duplicate ? [{ id: event.id }] : [] };
      return { rows: [] };
    } };
    const stripe = { checkout: { sessions: { retrieve: async () => { calls.push({ sql: "stripe-read" }); return session(); } } } };
    const { processTestEvent } = load("src/lib/payment-webhook.ts", { "./payment-store": { paymentTransaction: async (fn) => fn(client) } }, globals());
    await processTestEvent(stripe, event);
    assert.ok(calls[0].sql.includes("FOR UPDATE"));
    assert.equal(calls.filter(c => c.sql === "stripe-read").length, duplicate ? 0 : 1);
    assert.equal(calls.filter(c => c.sql.startsWith("UPDATE")).length, duplicate ? 0 : 1);
    if (!duplicate) assert.equal(calls.find(c => c.sql.startsWith("UPDATE")).params[1], "paid");
    await assert.rejects(processTestEvent(stripe, { ...event, livemode: true }));
    await assert.rejects(processTestEvent(stripe, { ...event, account: "acct_connected" }));
  }
});

test("payment transactions commit or roll back and always release connections", async () => {
  for (const fail of [false, true]) {
    const calls = [];
    class Pool { async connect() { return { query: async (sql) => { calls.push(sql); }, release: () => calls.push("release") }; } }
    const { paymentTransaction } = load("src/lib/payment-store.ts", { pg: { Pool } }, globals());
    if (fail) await assert.rejects(paymentTransaction(async () => { throw Error("db offline"); }));
    else assert.equal(await paymentTransaction(async () => "ok"), "ok");
    assert.equal(calls[0], "BEGIN");
    assert.equal(calls.at(-2), fail ? "ROLLBACK" : "COMMIT");
    assert.equal(calls.at(-1), "release");
  }
});

test("payment return is never proof of payment and exposes no booking data", async () => {
  const response = load("src/app/coaching/payment-return/route.ts", {}, globals()).GET();
  assert.equal(response.headers.get("x-robots-tag"), "noindex");
  const html = await response.text();
  assert.match(html, /does not confirm a payment/);
  assert.match(html, /href="\/account\/coaching#purchases"/);
});

function checkoutHarness() {
  let row;
  let failAttach = false;
  const keys = [];
  let retrieves = 0;
  const openSession = { ...session(), payment_intent: null, payment_status: "unpaid", status: "open", url: "https://checkout.stripe.com/c/pay/cs_test_fixture" };
  const stripe = {
    accounts: { retrieve: async (account) => account
      ? { id: "acct_coach", country: "US", details_submitted: true, charges_enabled: true, payouts_enabled: true, capabilities: { transfers: "active" } }
      : { id: "acct_platform", country: "US" } },
    checkout: { sessions: {
      create: async (_params, options) => { keys.push(options.idempotencyKey); return openSession; },
      retrieve: async () => { retrieves++; return openSession; },
    } },
  };
  const client = { query: async (sql, values) => {
    if (sql.startsWith("SELECT *")) return { rows: [row] };
    if (sql.startsWith("UPDATE")) {
      if (failAttach) throw Error("connection lost after Stripe created session");
      row.checkout_session_id = values[1];
    }
    return { rows: [] };
  } };
  const pool = { query: async (_sql, values) => {
    row ??= { ...booking(), checkout_session_id: null, request_hash: values[1], checkout_params: JSON.parse(values[8]) };
  } };
  const loaded = load("src/lib/payment-checkout.ts", {
    "./stripe": { testStripe: () => stripe },
    "./payment-store": { paymentPool: () => pool, paymentTransaction: async (fn) => fn(client) },
  }, globals());
  return { run: loaded.createTestCheckout, keys, get row() { return row; }, get retrieves() { return retrieves; }, set failAttach(value) { failAttach = value; } };
}

test("checkout retries recover a failed DB attachment with the same Stripe idempotency key", async () => {
  const harness = checkoutHarness();
  harness.failAttach = true;
  await assert.rejects(harness.run(input));
  assert.ok(harness.row, "attempt remains durably recorded before Stripe call");
  harness.failAttach = false;
  assert.equal((await harness.run(input)).testMode, true);
  assert.equal(harness.keys.length, 2);
  assert.equal(harness.keys[0], harness.keys[1]);
  await harness.run(input);
  assert.equal(harness.keys.length, 2, "existing session is retrieved, not recreated");
  assert.equal(harness.retrieves, 1);
});

test("conflicting, already paid and old uncertain bookings cannot create another checkout", async () => {
  const harness = checkoutHarness();
  await harness.run(input);
  await assert.rejects(harness.run({ ...input, email: "different@example.com" }), /different details/);
  harness.row.status = "paid";
  await assert.rejects(harness.run(input), /no longer payable/);
  harness.row.status = "pending";
  harness.row.checkout_session_id = null;
  harness.row.created_at = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await assert.rejects(harness.run(input), /operator reconciliation/);
  assert.equal(harness.keys.length, 1);
});

test("webhook persistence failures request a retry instead of acknowledging payment", async () => {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const { POST } = load("src/app/api/stripe/webhook/route.ts", {
    "@/lib/stripe": { testStripe: () => stripe },
    "@/lib/payment-webhook": { processTestEvent: async () => { throw Error("test persistence failed"); } },
  }, globals());
  const payload = JSON.stringify({ id: "evt_fixture", livemode: false, type: "checkout.session.completed", data: { object: session() } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: env.STRIPE_WEBHOOK_SECRET });
  const response = await POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", headers: { "Stripe-Signature": signature }, body: payload }));
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /test persistence failed/);
});
