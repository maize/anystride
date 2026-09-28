import assert from "node:assert/strict";
import { test } from "node:test";
import { rootCertificates } from "node:tls";
import { load } from "./support/load-module.mjs";

const base = { MARKETPLACE_MODE: "pilot", MARKETPLACE_APP_URL: "https://anystride.com",
  NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture",
  MARKETPLACE_DATABASE_SOURCE: "POSTGRES_URL", POSTGRES_URL: "postgresql://db.example/anystride?sslmode=no-verify",
  MARKETPLACE_PILOT_EMAILS: "owner@example.test, reviewer@example.test" };
const config = (overrides = {}) => load("src/lib/marketplace-config.ts", { "server-only": {} }, { process: { env: { ...base, ...overrides } } });

test("marketplace uses the existing database only when explicitly selected", () => {
  assert.equal(config().marketplaceEnabled(), true);
  assert.equal(config({ MARKETPLACE_DATABASE_SOURCE: "" }).marketplaceEnabled(), false);
  assert.equal(config({ MARKETPLACE_DATABASE_SOURCE: "PAYMENTS_DATABASE_URL" }).marketplaceEnabled(), false);
  assert.equal(config({ MARKETPLACE_DATABASE_SOURCE: "POSTGRES_URL", POSTGRES_URL: "", MARKETPLACE_DATABASE_URL: "postgresql://localhost/other" }).marketplaceEnabled(), false);
  assert.equal(config({ MARKETPLACE_DATABASE_SOURCE: "", MARKETPLACE_DATABASE_URL: "postgresql://localhost/marketplace" }).marketplaceEnabled(), true);
});

test("marketplace database verifies remote TLS and supports a provider CA", () => {
  const db = (overrides = {}) => load("src/lib/marketplace-database.ts", { "server-only": {} }, { process: { env: { ...base, ...overrides } } }).marketplaceDatabaseConfig();
  const remote = db({ MARKETPLACE_DATABASE_CA: rootCertificates[0] });
  assert.equal(remote.ssl.rejectUnauthorized, true);
  assert.equal(remote.ssl.ca, rootCertificates[0].trim());
  assert.equal(new URL(remote.connectionString).searchParams.has("sslmode"), false);
  assert.equal(db({ POSTGRES_URL: "postgresql://localhost/fixture" }).ssl, false);
  for (const overrides of [{ POSTGRES_URL: "https://db.example/fixture" }, { POSTGRES_URL: "postgresql://db.example/" },
    { POSTGRES_URL: "postgresql://db.example" }, { MARKETPLACE_DATABASE_CA: "invalid" }]) assert.throws(() => db(overrides));
});

test("pilot invitations are exact email matches and never grant admin privileges", () => {
  const c = config();
  assert.equal(c.marketplaceInvited("OWNER@example.test"), true);
  assert.equal(c.marketplaceInvited("owner+another@example.test"), false);
  assert.equal(c.marketplaceInvited("someone@example.test"), false);
  assert.equal(c.marketplaceAdmin("owner@example.test"), false);
  assert.equal(config({ MARKETPLACE_PILOT_EMAILS: ", ," }).marketplaceInvited("owner@example.test"), false);
});

test("uninvited email requests are acknowledged without contacting the auth provider", async () => {
  let calls = 0;
  const globals = { process: { env: base }, Request, Response };
  const { POST } = load("src/app/api/marketplace/auth/route.ts", {
    "server-only": {}, "@/lib/supabase-server": { accountAuthClient: async () => {
      calls++; return { auth: { signInWithOtp: async () => ({ error: null }), signOut: async () => ({ error: null }) } };
    } },
  }, globals);
  const request = (action, email) => new Request("https://anystride.com/api/marketplace/auth", {
    method: "POST", headers: { Origin: "https://anystride.com", "Content-Type": "application/json" }, body: JSON.stringify({ action, ...(email ? { email } : {}) }),
  });
  for (const action of ["sign-up", "sign-in"]) {
    const response = await POST(request(action, "outsider@example.test"));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { requested: true });
  }
  assert.equal(calls, 0);
  assert.equal((await POST(request("sign-up", "owner@example.test"))).status, 200);
  assert.equal(calls, 1);
  assert.equal((await POST(request("sign-out"))).status, 200);
  assert.equal(calls, 2);
});

test("existing verified sessions cannot bypass a closed pilot or a revoked invitation", async () => {
  let email = "outsider@example.test";
  const { requireMarketplaceActor } = load("src/lib/marketplace-auth.ts", {
    "server-only": {}, "./supabase-server": { accountAuthClient: async () => ({ auth: { getUser: async () => ({
      data: { user: { id: "test-user", email, email_confirmed_at: "2026-09-13", user_metadata: { admin: true } } }, error: null,
    }) } }) },
  }, { process: { env: base } });
  await assert.rejects(requireMarketplaceActor(), (error) => error.status === 403);
  email = "OWNER@example.test";
  const actor = await requireMarketplaceActor();
  assert.equal(actor.email, "owner@example.test");
  assert.equal(actor.admin, false);
  email = "outsider@example.test";
  await assert.rejects(requireMarketplaceActor(), (error) => error.status === 403);
});
