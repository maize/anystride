import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { load } from "./support/load-module.mjs";

const runner = { id: "runner_fixture", email: "runner@example.test", admin: false };
const coach = { id: "coach_fixture", email: "coach@example.test", admin: false };
const admin = { id: "reviewer_fixture", email: "reviewer@example.test", admin: true };
const origin = "http://localhost:3010";
const offer = { id: "sandbox-package", title: "Sandbox coaching package", amount: 5000, currency: "usd", fee: 500, coachAccount: "acct_coach", approved: true };
const baseEnv = {
  MARKETPLACE_MODE: "pilot", MARKETPLACE_APP_URL: origin, MARKETPLACE_DATABASE_URL: "postgresql://localhost/marketplace_fixture",
  NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture",
  MARKETPLACE_SANDBOX_WORKSPACES: "on", STRIPE_PAYMENTS_MODE: "test", STRIPE_SECRET_KEY: "sk_test_fixture",
  STRIPE_WEBHOOK_SECRET: "whsec_fixture", STRIPE_PLATFORM_ACCOUNT_ID: "acct_platform", STRIPE_APP_URL: origin,
  PAYMENTS_DATABASE_URL: "postgresql://localhost/payments_fixture", STRIPE_TEST_OFFERS: JSON.stringify([offer]),
};

async function fixture(t) {
  const db = new PGlite();
  t.after(() => db.close());
  for (const file of ["001_test_payments.sql", "002_marketplace.sql", "004_test_workspaces.sql", "004_test_workspaces.sql"]) {
    await db.exec(readFileSync(new URL(`../db/migrations/${file}`, import.meta.url), "utf8"));
  }
  const requestId = randomUUID(), serviceId = randomUUID();
  const env = { ...baseEnv, STRIPE_TEST_SERVICE_BINDINGS: JSON.stringify([{ serviceId, coachUserId: coach.id, offerId: offer.id }]) };
  const query = (sql, params) => db.query(sql, params);
  class Pool { on() {} query = query; async connect() { return { query, release() {} }; } }
  let params, canonical, creates = 0;
  const stripe = {
    accounts: { retrieve: async (id) => id ? { id: "acct_coach", country: "US", details_submitted: true, charges_enabled: true, payouts_enabled: true, capabilities: { transfers: "active" } } : { id: "acct_platform", country: "US" } },
    checkout: { sessions: {
      create: async (value, options) => { params = value; creates++; assert.equal(options.idempotencyKey, `anystride-test-${requestId}`);
        canonical = { id: "cs_test_fixture", mode: "payment", status: "open", payment_status: "unpaid", payment_intent: null, livemode: false, client_reference_id: requestId, metadata: value.metadata, amount_total: offer.amount, currency: offer.currency, url: "https://checkout.stripe.com/c/pay/cs_test_fixture" }; return canonical; },
      retrieve: async () => canonical,
    } },
    paymentIntents: { retrieve: async () => canonical.payment_intent },
  };
  const mocks = { "server-only": {}, pg: { Pool }, "./stripe": { testStripe: () => stripe } };
  const globals = { process: { env }, Request, Response };
  const cache = new Map();
  const store = load("src/lib/marketplace-store.ts", mocks, globals, cache);
  const workspaces = load("src/lib/sandbox-workspace.ts", mocks, globals, cache);
  const webhook = load("src/lib/payment-webhook.ts", mocks, globals, cache);
  await store.actOnMarketplace(coach, { action: "apply", name: "Fixture coach", bio: "Synthetic profile used only in disposable integration tests.", credentials: "Fixture only, not a real qualification." });
  await store.actOnMarketplace(admin, { action: "review", target: "coach", id: coach.id, status: "approved", version: 1 });
  await store.actOnMarketplace(coach, { action: "service", id: serviceId, title: offer.title, description: "Synthetic coaching package for the sandbox milestone test.", amount: offer.amount, currency: offer.currency, durationWeeks: 4 });
  await store.actOnMarketplace(admin, { action: "review", target: "service", id: serviceId, status: "approved", version: 1 });
  await store.actOnMarketplace(runner, { action: "inquire", id: requestId, serviceId, message: "Synthetic goal: complete a practice training block." });
  await store.actOnMarketplace(coach, { action: "respond", id: requestId, status: "accepted" });
  async function pay() {
    canonical = { ...canonical, status: "complete", payment_status: "paid", payment_intent: {
      id: "pi_test_fixture", livemode: false, status: "succeeded", amount: offer.amount, amount_received: offer.amount, currency: offer.currency,
      application_fee_amount: offer.fee, transfer_data: { destination: offer.coachAccount }, metadata: params.payment_intent_data.metadata,
      latest_charge: { paid: true, refunded: false, disputed: false, amount_refunded: 0 },
    } };
    await webhook.processTestEvent(stripe, { id: "evt_paid", type: "checkout.session.completed", livemode: false, data: { object: canonical } });
  }
  async function refund() {
    canonical.payment_intent.latest_charge.refunded = true;
    await webhook.processTestEvent(stripe, { id: "evt_refund", type: "charge.refunded", livemode: false, data: { object: { payment_intent: "pi_test_fixture" } } });
  }
  return { ...workspaces, db, env, requestId, serviceId, pay, refund, creates: () => creates, params: () => params };
}

test("sandbox workspace is off by default, rejects live credentials, production and mismatched origins", () => {
  for (const overrides of [{ MARKETPLACE_SANDBOX_WORKSPACES: "off" }, { VERCEL_ENV: "production" }, { STRIPE_SECRET_KEY: "sk_live_fixture" }, { STRIPE_APP_URL: "https://elsewhere.test" }, { STRIPE_PAYMENTS_MODE: "live" }]) {
    const mod = load("src/lib/sandbox-workspace.ts", { "server-only": {} }, { process: { env: { ...baseEnv, ...overrides } } });
    assert.equal(mod.sandboxWorkspaceEnabled(), false);
  }
});

test("SQL milestone: independent approval → runner checkout → verified payment → two-person workspace → refund lock", async (t) => {
  const f = await fixture(t);
  await assert.rejects(f.readSandboxWorkspace(runner, f.requestId), /locked/);
  await assert.rejects(f.startSandboxCheckout(coach, f.requestId), /Only the requesting runner/);
  await assert.rejects(f.startSandboxCheckout(admin, f.requestId), /not found/);
  const checkout = await f.startSandboxCheckout(runner, f.requestId);
  assert.equal(checkout.testMode, true);
  assert.equal(f.params().customer_email, runner.email);
  await f.startSandboxCheckout(runner, f.requestId);
  assert.equal(f.creates(), 1);
  await assert.rejects(f.writeSandboxMessage(runner, f.requestId, randomUUID(), "Before payment"), /locked/);
  await f.pay();
  const id = randomUUID();
  await f.writeSandboxMessage(runner, f.requestId, id, "My synthetic running goal.");
  await f.writeSandboxMessage(runner, f.requestId, id, "My synthetic running goal.");
  await f.writeSandboxMessage(coach, f.requestId, randomUUID(), "Your synthetic first check-in.");
  const view = await f.readSandboxWorkspace(coach, f.requestId);
  assert.equal(view.messages.length, 2);
  assert.equal(view.messages[0].sender_role, "runner");
  assert.equal(view.messages[1].mine, true);
  assert.equal("sender_id" in view.messages[0], false);
  await assert.rejects(f.readSandboxWorkspace(admin, f.requestId), /not found/);
  await assert.rejects(f.writeSandboxMessage(coach, f.requestId, id, "Changed owner"), /already used/);
  await f.refund();
  await assert.rejects(f.readSandboxWorkspace(coach, f.requestId), /locked/);
  await assert.rejects(f.writeSandboxMessage(runner, f.requestId, randomUUID(), "After refund"), /locked/);
  assert.equal((await f.db.query("SELECT count(*)::int AS n FROM stripe_test_workspace_messages")).rows[0].n, 2);
});

test("purchase history belongs to the paying athlete and records verified payment states", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.sandboxPurchaseHistory(runner)).length, 0, "Acceptance alone is not a purchase");
  await f.startSandboxCheckout(runner, f.requestId);
  assert.equal((await f.sandboxPurchaseHistory(runner))[0].status, "pending");
  await f.pay();
  const [paid] = await f.sandboxPurchaseHistory(runner);
  assert.equal(paid.status, "paid");
  assert.equal(paid.amount, offer.amount);
  assert.equal(paid.service_snapshot.title, offer.title);
  assert.equal("payment_hash" in paid, false);
  assert.equal("test_email" in paid, false);
  for (const actor of [coach, admin]) assert.equal((await f.sandboxPurchaseHistory(actor)).length, 0);
  await f.refund();
  await f.db.query("UPDATE marketplace_requests SET status='cancelled'");
  assert.equal((await f.sandboxPurchaseHistory(runner))[0].status, "refunded", "History survives withdrawal");
  await f.db.query("UPDATE stripe_test_workspaces SET payment_hash='tampered'");
  assert.equal((await f.sandboxPurchaseHistory(runner)).length, 0, "Mismatched bookings are never reported as paid");
  f.env.VERCEL_ENV = "production";
  assert.equal((await f.sandboxPurchaseHistory(runner)).length, 0);
});

test("offer mismatch, changed checkout binding, unpaid states and suspended requests fail closed", async (t) => {
  const f = await fixture(t);
  f.env.STRIPE_TEST_OFFERS = JSON.stringify([{ ...offer, amount: 1 }]);
  await assert.rejects(f.startSandboxCheckout(runner, f.requestId));
  f.env.STRIPE_TEST_OFFERS = JSON.stringify([{ ...offer, amount: 6000 }]);
  await assert.rejects(f.startSandboxCheckout(runner, f.requestId), /does not match/);
  f.env.STRIPE_TEST_OFFERS = JSON.stringify([offer]);
  await f.startSandboxCheckout(runner, f.requestId);
  f.env.STRIPE_TEST_OFFERS = JSON.stringify([{ ...offer, fee: 1 }]);
  await assert.rejects(f.startSandboxCheckout(runner, f.requestId), /attempt changed/);
  f.env.STRIPE_TEST_OFFERS = JSON.stringify([offer]);
  for (const state of ["pending", "failed", "expired", "review", "refunded"]) {
    await f.db.query("UPDATE stripe_test_bookings SET status=$1", [state]);
    await assert.rejects(f.readSandboxWorkspace(runner, f.requestId), /locked/);
  }
  await f.db.query("UPDATE stripe_test_bookings SET status='pending'");
  await f.pay();
  await f.db.query("UPDATE marketplace_coaches SET status='suspended'");
  await assert.rejects(f.readSandboxWorkspace(runner, f.requestId), /not active/);
  await f.db.query("UPDATE marketplace_coaches SET status='approved'");
  await f.db.query("UPDATE stripe_test_workspaces SET payment_hash='tampered'");
  await assert.rejects(f.readSandboxWorkspace(runner, f.requestId), /locked/);
});

test("workspace message validation and RLS prevent direct client access", async (t) => {
  const f = await fixture(t);
  await f.startSandboxCheckout(runner, f.requestId); await f.pay();
  for (const text of ["", " ", "x".repeat(2001), "bad\u0000data", 1]) await assert.rejects(f.writeSandboxMessage(runner, f.requestId, randomUUID(), text));
  await f.writeSandboxMessage(coach, f.requestId, randomUUID(), "Fixture message");
  await f.db.exec("CREATE ROLE sandbox_browser; GRANT SELECT,INSERT ON stripe_test_workspaces,stripe_test_workspace_messages TO sandbox_browser; SET ROLE sandbox_browser;");
  assert.equal((await f.db.query("SELECT * FROM stripe_test_workspaces")).rows.length, 0);
  assert.equal((await f.db.query("SELECT * FROM stripe_test_workspace_messages")).rows.length, 0);
  await assert.rejects(f.db.query("INSERT INTO stripe_test_workspace_messages (id,request_id,sender_id,body) VALUES ($1,$2,$3,$4)", [randomUUID(), f.requestId, runner.id, "Direct write"]), /row-level security/);
  await f.db.exec("RESET ROLE");
});

test("account sandbox API rejects CSRF, role/price injection, non-JSON and unverified sessions before checkout", async () => {
  let calls = 0, signedIn = false;
  const { MarketplaceError } = load("src/lib/marketplace-config.ts", { "server-only": {} });
  const route = load("src/app/api/marketplace/sandbox/route.ts", {
    "server-only": {}, "@/lib/marketplace-config": { MarketplaceError, marketplaceOrigin: () => origin },
    "@/lib/marketplace-auth": { requireMarketplaceActor: async () => { if (!signedIn) throw new MarketplaceError("Sign in", 401); return runner; } },
    "@/lib/sandbox-workspace": { startSandboxCheckout: async (actor) => { assert.equal(actor.id, runner.id); calls++; return { testMode: true }; } },
  }, { Request, Response });
  const body = { action: "checkout", requestId: randomUUID() };
  const req = (value = body, source = origin, type = "application/json") => new Request(`${origin}/api/marketplace/sandbox`, { method: "POST", headers: { origin: source, "content-type": type }, body: typeof value === "string" ? value : JSON.stringify(value) });
  assert.equal((await route.POST(req())).status, 401);
  signedIn = true;
  assert.equal((await route.POST(req(body, "https://attacker.test"))).status, 403);
  assert.equal((await route.POST(req(body, origin, "text/plain"))).status, 415);
  for (const extra of [{ amount: 1 }, { email: "other@example.test" }, { coachAccount: "acct_other" }, { runnerId: "other" }, { admin: true }, { bookingId: randomUUID() }]) assert.equal((await route.POST(req({ ...body, ...extra }))).status, 400);
  assert.equal((await route.POST(req("x".repeat(8193)))).status, 413);
  assert.equal(calls, 0);
  const response = await route.POST(req());
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(calls, 1);
});
