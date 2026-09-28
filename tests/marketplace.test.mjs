import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { load } from "./support/load-module.mjs";
import { launchReadiness } from "../scripts/check-launch-readiness.mjs";

const env = {
  MARKETPLACE_MODE: "pilot", MARKETPLACE_APP_URL: "http://localhost:3010", MARKETPLACE_DATABASE_URL: "postgresql://localhost/marketplace_fixture",
  NEXT_PUBLIC_SUPABASE_URL: "https://test-only.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-fixture-not-a-key", MARKETPLACE_ADMIN_USER_IDS: "user_admin",
};
const globals = { process: { env }, Request, Response };
const coach = { id: "user_coach", email: "coach@example.test", admin: false };
const runner = { id: "user_runner", email: "runner@example.test", admin: false };
const other = { id: "user_other", email: "other@example.test", admin: false };
const admin = { id: "user_admin", email: "admin@example.test", admin: true };
const application = { action: "apply", name: "Test coach", bio: "A test-only coaching profile for verifying the application workflow.", credentials: "Test qualification; not a real public coach." };
const proposal = () => ({ action: "service", id: randomUUID(), title: "Test coaching service", description: "A test-only service description with weekly coaching support.", amount: 12500, currency: "usd", durationWeeks: 4 });

async function fixture(t) {
  const db = new PGlite();
  await db.exec(readFileSync(new URL("../db/migrations/002_marketplace.sql", import.meta.url), "utf8"));
  // Reapplying the same explicit migration is safe.
  await db.exec(readFileSync(new URL("../db/migrations/002_marketplace.sql", import.meta.url), "utf8"));
  t.after(() => db.close());
  let released = 0;
  const query = (sql, params) => db.query(sql, params);
  class Pool { on() {} query = query; async connect() { return { query, release() { released++; } }; } }
  const mocks = { "server-only": {}, pg: { Pool } };
  const store = load("src/lib/marketplace-store.ts", mocks, globals);
  return { ...store, db, mocks, released: () => released };
}

test("account configuration fails closed; admin status uses exact server-owned IDs", () => {
  const off = load("src/lib/marketplace-config.ts", { "server-only": {} });
  assert.equal(off.marketplaceEnabled(), false);
  assert.throws(() => off.marketplaceOrigin(), /not open/);
  const config = load("src/lib/marketplace-config.ts", { "server-only": {} }, globals);
  assert.equal(config.marketplaceOrigin(), "http://localhost:3010");
  assert.equal(config.marketplaceAdmin("user_admin"), true);
  assert.equal(config.marketplaceAdmin("admin"), false);
  for (const url of ["https://anystride.com/elsewhere", "https://anystride.com?redirect=bad", "http://anystride.com", "https://user:password@anystride.com"]) {
    const invalid = load("src/lib/marketplace-config.ts", { "server-only": {} }, { process: { env: { ...env, MARKETPLACE_APP_URL: url } } });
    assert.throws(() => invalid.marketplaceOrigin(), /incomplete/);
  }
});

test("managed authentication rejects missing sessions and unverified email, ignoring editable roles", async () => {
  let userId = null;
  let verified = false;
  const auth = load("src/lib/marketplace-auth.ts", { "server-only": {}, "./supabase-server": {
    accountAuthClient: async () => ({ auth: { getUser: async () => ({ error: null, data: { user: userId ? { id: userId, email: "RUNNER@example.test", email_confirmed_at: verified ? "2026-09-12" : null, user_metadata: { admin: true } } : null } }) } }),
  } }, globals);
  await assert.rejects(auth.requireMarketplaceActor(), (e) => e.status === 401);
  userId = runner.id;
  await assert.rejects(auth.requireMarketplaceActor(), (e) => e.status === 403);
  verified = true;
  const result = await auth.requireMarketplaceActor();
  assert.equal(result.id, runner.id);
  assert.equal(result.email, runner.email);
  assert.equal(result.admin, false);
});

test("marketplace input rejects forged ownership, approval, payment fields and malformed actions", () => {
  const { parseMarketplaceAction: parse } = load("src/lib/marketplace-input.ts", { "server-only": {} });
  assert.equal(parse(application).name, application.name);
  assert.equal(parse(proposal()).amount, 12500);
  for (const extra of [{ admin: true }, { status: "approved" }, { userId: other.id }, { stripeAccount: "acct_other" }, { checkoutUrl: "https://bad.test" }]) assert.throws(() => parse({ ...application, ...extra }));
  for (const amount of [-1, 0, 1.1, 100001, "12500"]) assert.throws(() => parse({ ...proposal(), amount }));
  for (const action of ["constructor", "__proto__", "checkout"]) assert.throws(() => parse({ action }));
  assert.throws(() => parse({ action: "inquire", id: randomUUID(), serviceId: randomUUID(), message: "Please tell me about this coaching service.", shareWithCoach: false }), /Confirm/);
});

test("real SQL: application → independent approval → service review → private runner request → acceptance → withdrawal", async (t) => {
  const f = await fixture(t);
  const act = f.actOnMarketplace;
  const service = proposal();
  await assert.rejects(act(coach, service), (e) => e.status === 403);
  const applicationResult = await act(coach, application);
  assert.equal(applicationResult.notification.kind, "coach");
  assert.equal(applicationResult.notification.targetId, coach.id);
  assert.equal((await act(coach, application)).notification, undefined);
  assert.equal((await f.db.query("SELECT count(*)::int AS n FROM marketplace_coaches")).rows[0].n, 1);
  await assert.rejects(act(coach, { action: "review", target: "coach", id: coach.id, status: "approved", version: 1 }), (e) => e.status === 403);
  await assert.rejects(act({ ...coach, admin: true }, { action: "review", target: "coach", id: coach.id, status: "approved", version: 1 }), /different administrator/);
  await act(admin, { action: "review", target: "coach", id: coach.id, status: "approved", version: 1 });
  await assert.rejects(act(admin, { action: "review", target: "coach", id: coach.id, status: "suspended", version: 1 }), /Refresh/);
  const serviceResult = await act(coach, service);
  assert.equal(serviceResult.notification.kind, "service");
  assert.equal(serviceResult.notification.targetId, service.id);
  assert.equal((await act(coach, service)).notification, undefined);
  assert.equal((await f.marketplaceDashboard(runner)).catalog.length, 0);
  await act(admin, { action: "review", target: "service", id: service.id, status: "approved", version: 1 });
  const catalog = (await f.marketplaceDashboard(runner)).catalog;
  assert.equal(catalog.length, 1);
  assert.equal("coach_id" in catalog[0], false);
  const inquiry = { action: "inquire", id: randomUUID(), serviceId: service.id, message: "I would like to work on my first half marathon." };
  await assert.rejects(act(coach, inquiry), /own service/);
  await act(runner, inquiry);
  await act(runner, inquiry);
  await assert.rejects(act(runner, { ...inquiry, id: randomUUID() }), /already have an open/);
  await assert.rejects(act(other, { ...inquiry }), /reference is already/);
  const saved = (await f.marketplaceDashboard(runner)).requests[0];
  assert.equal(saved.service_snapshot.amount, 12500);
  assert.equal(saved.is_runner, true);
  assert.equal("runner_id" in saved, false);
  assert.equal((await f.marketplaceDashboard(other)).requests.length, 0);
  assert.equal((await f.marketplaceDashboard(other)).reviewCoaches.length, 0);
  await assert.rejects(act(other, { action: "respond", id: inquiry.id, status: "accepted" }), (e) => e.status === 404);
  await assert.rejects(act(runner, { action: "respond", id: inquiry.id, status: "accepted" }), (e) => e.status === 404);
  await act(coach, { action: "respond", id: inquiry.id, status: "accepted" });
  assert.equal((await f.marketplaceDashboard(runner)).requests[0].status, "accepted");
  await act(runner, { action: "respond", id: inquiry.id, status: "cancelled" });
  await assert.rejects(act(coach, { action: "respond", id: inquiry.id, status: "accepted" }), /already been answered/);
  assert.equal((await f.db.query("SELECT count(*)::int AS n FROM marketplace_audit")).rows[0].n, 7);
  assert.ok(f.released() >= 15);
});

test("real SQL: suspension hides services and blocks new requests and acceptance", async (t) => {
  const f = await fixture(t);
  const act = f.actOnMarketplace;
  await act(coach, application);
  await act(admin, { action: "review", target: "coach", id: coach.id, status: "approved", version: 1 });
  const service = proposal();
  await act(coach, service);
  await act(admin, { action: "review", target: "service", id: service.id, status: "approved", version: 1 });
  const inquiry = { action: "inquire", id: randomUUID(), serviceId: service.id, message: "I would like to work on my first half marathon." };
  await act(runner, inquiry);
  await act(admin, { action: "review", target: "coach", id: coach.id, status: "suspended", version: 2 });
  assert.equal((await f.marketplaceDashboard(runner)).catalog.length, 0);
  await assert.rejects(act(other, { ...inquiry, id: randomUUID() }), /not available/);
  await assert.rejects(act(coach, { action: "respond", id: inquiry.id, status: "accepted" }), /no longer available/);
  await act(runner, { action: "respond", id: inquiry.id, status: "cancelled" });
});

test("marketplace API rejects CSRF, missing authentication, invalid bodies and private error leakage", async () => {
  let authenticated = false;
  let writes = 0;
  const { MarketplaceError } = load("src/lib/marketplace-config.ts", { "server-only": {} }, globals);
  const route = load("src/app/api/marketplace/route.ts", {
    "server-only": {},
    "@/lib/marketplace-config": { MarketplaceError, marketplaceOrigin: () => env.MARKETPLACE_APP_URL },
    "@/lib/marketplace-auth": { requireMarketplaceActor: async () => { if (!authenticated) throw new MarketplaceError("Sign in to continue.", 401); return runner; } },
    "@/lib/marketplace-store": { actOnMarketplace: async () => { writes++; return { saved: true }; }, marketplaceDashboard: async () => { throw new Error("postgres://private-password@example.test"); } },
  }, globals);
  const request = (body, origin = env.MARKETPLACE_APP_URL, type = "application/json") => new Request(`${env.MARKETPLACE_APP_URL}/api/marketplace`, { method: "POST", headers: { origin, "content-type": type }, body: typeof body === "string" ? body : JSON.stringify(body) });
  assert.equal((await route.POST(request(application, "https://attacker.test"))).status, 403);
  assert.equal((await route.POST(request(application))).status, 401);
  assert.equal(writes, 0);
  authenticated = true;
  assert.equal((await route.POST(request(application, env.MARKETPLACE_APP_URL, "text/plain"))).status, 415);
  assert.equal((await route.POST(request("{"))).status, 400);
  assert.equal((await route.POST(request("x".repeat(8193)))).status, 413);
  const saved = await route.POST(request(application));
  assert.equal(saved.status, 200);
  assert.match(saved.headers.get("cache-control"), /no-store/);
  assert.equal(writes, 1);
  const failed = await route.GET();
  assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /private-password/);
});

test("private account entry uses document navigation and analytics are excluded", () => {
  const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  const analytics = readFileSync(new URL("../src/components/SiteAnalytics.tsx", import.meta.url), "utf8");
  const account = readFileSync(new URL("../src/app/account/page.tsx", import.meta.url), "utf8");
  assert.match(layout, /<a href="\/account"/);
  assert.match(analytics, /pathname\.startsWith\("\/account\/"\)/);
  assert.match(analytics, /return null/);
  assert.match(account, /const sandboxEnabled = sandboxWorkspaceEnabled\(\)/);
  assert.match(account, /This local sandbox supports applications, enquiries and Stripe test payments/);
});

test("local marketplace runner requires an explicit test-only Stripe opt-in", () => {
  const runner = readFileSync(new URL("../scripts/local-marketplace.mjs", import.meta.url), "utf8");
  assert.match(runner, /LOCAL_MARKETPLACE_STRIPE_SANDBOX === "on"/);
  assert.match(runner, /\^sk_test_/);
  assert.match(runner, /MARKETPLACE_SANDBOX_WORKSPACES: stripeSandbox \? "on" : "off"/);
  assert.match(runner, /STRIPE_PAYMENTS_MODE: stripeSandbox \? "test" : "off"/);
});

test("readiness report lists names, never secret values or a false live-ready claim", () => {
  const report = launchReadiness({ ...env, STRIPE_SECRET_KEY: "sk_live_private", PAYMENTS_ADMIN_TOKEN: "operator-private", STRIPE_TEST_OFFERS: "broken" });
  assert.equal(report.livePayments.supported, false);
  assert.equal(report.stripeSandbox.testKey, false);
  assert.equal(report.stripeSandbox.operatorTokenStrong, false);
  assert.equal(report.stripeSandbox.offersConfigured, false);
  assert.doesNotMatch(JSON.stringify(report), /sk_live_private|operator-private|postgres:\/\/test-only/);
});

test("real SQL: RLS denies direct browser-role access even with table grants", async (t) => {
  const f = await fixture(t);
  await f.actOnMarketplace(coach, application);
  await f.db.exec("CREATE ROLE test_api_client; GRANT SELECT,INSERT,UPDATE ON marketplace_coaches TO test_api_client; SET ROLE test_api_client;");
  assert.equal((await f.db.query("SELECT * FROM marketplace_coaches")).rows.length, 0);
  await assert.rejects(f.db.query("INSERT INTO marketplace_coaches (user_id,name,bio,credentials) VALUES ($1,$2,$3,$4)", [other.id, application.name, application.bio, application.credentials]), /row-level security/);
  await f.db.exec("RESET ROLE;");
  assert.equal((await f.db.query("SELECT count(*)::int AS n FROM marketplace_coaches")).rows[0].n, 1);
});

test("real SQL: audit failure rolls back the corresponding application", async (t) => {
  const f = await fixture(t);
  await f.db.exec(`CREATE FUNCTION fail_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test audit unavailable'; END $$;
    CREATE TRIGGER test_audit_failure BEFORE INSERT ON marketplace_audit FOR EACH ROW EXECUTE FUNCTION fail_test_audit();`);
  await assert.rejects(f.actOnMarketplace(coach, application), /test audit unavailable/);
  assert.equal((await f.db.query("SELECT count(*)::int AS n FROM marketplace_coaches")).rows[0].n, 0);
  assert.equal(f.released(), 1);
});
