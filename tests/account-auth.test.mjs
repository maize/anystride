import test from "node:test";
import assert from "node:assert/strict";
import { load } from "./support/load-module.mjs";

const origin = "https://anystride.com";
const globals = { Request, Response };
const request = (body, requestOrigin = origin) => new Request(`${origin}/api/marketplace/auth`, { method: "POST", headers: { origin: requestOrigin, "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) });

test("passwordless auth requires same-origin JSON and never accepts user roles or redirects", async () => {
  let calls = 0;
  let sent;
  const config = load("src/lib/marketplace-config.ts", { "server-only": {} });
  const { POST } = load("src/app/api/marketplace/auth/route.ts", {
    "@/lib/marketplace-config": { ...config, marketplaceOrigin: () => origin },
    "@/lib/supabase-server": { accountAuthClient: async () => ({ auth: {
      signInWithOtp: async (options) => { calls++; sent = options; return { error: null }; },
      signOut: async (options) => { calls++; assert.equal(options.scope, "local"); return { error: null }; },
    } }) },
  }, globals);
  assert.equal((await POST(request({ action: "sign-in", email: "runner@example.test" }, "https://attacker.test"))).status, 403);
  for (const body of ["{", {}, { action: "sign-in", email: "invalid" }, { action: "sign-up", email: "runner@example.test", admin: true }, { action: "sign-in", email: "runner@example.test", redirect: "https://attacker.test" }]) assert.equal((await POST(request(body))).status, 400);
  assert.equal((await POST(request("x".repeat(2049)))).status, 413);
  assert.equal(calls, 0);
  const result = await POST(request({ action: "sign-in", email: "RUNNER@example.test" }));
  assert.equal(result.status, 200);
  assert.match(result.headers.get("cache-control"), /no-store/);
  assert.equal(sent.email, "runner@example.test");
  assert.equal(sent.options.shouldCreateUser, false);
  assert.equal(sent.options.emailRedirectTo, `${origin}/account/callback`);
  await POST(request({ action: "sign-up", email: "runner@example.test" }));
  assert.equal(sent.options.shouldCreateUser, true);
  assert.equal((await POST(request({ action: "sign-out" }))).status, 200);
});

test("email rate limits and provider failures do not leak account or key details", async () => {
  let failure = { status: 429, message: "private account detail" };
  const config = load("src/lib/marketplace-config.ts", { "server-only": {} });
  const { POST } = load("src/app/api/marketplace/auth/route.ts", {
    "@/lib/marketplace-config": { ...config, marketplaceOrigin: () => origin },
    "@/lib/supabase-server": { accountAuthClient: async () => ({ auth: { signInWithOtp: async () => ({ error: failure }) } }) },
  }, globals);
  const body = { action: "sign-in", email: "runner@example.test" };
  const limited = await POST(request(body));
  assert.equal(limited.status, 429);
  assert.doesNotMatch(await limited.text(), /private account detail/);
  failure = { status: 400, code: "user_not_found" };
  assert.equal((await POST(request(body))).status, 200);
  failure = { status: 403, code: "otp_disabled" };
  assert.equal((await POST(request(body))).status, 200);
  failure = { status: 503, message: "private database detail" };
  const offline = await POST(request(body));
  assert.equal(offline.status, 503);
  assert.doesNotMatch(await offline.text(), /private database detail/);
});

test("callback exchanges one-time codes and uses a fixed redirect, never a supplied host or next URL", async () => {
  let code;
  let fail = false;
  const { GET } = load("src/app/account/callback/route.ts", {
    "@/lib/marketplace-config": { marketplaceOrigin: () => origin },
    "@/lib/supabase-server": { accountAuthClient: async () => ({ auth: { exchangeCodeForSession: async (value) => { code = value; return { error: fail ? { message: "private provider failure" } : null }; } } }) },
  }, globals);
  const ok = await GET(new Request("https://untrusted-host.test/account/callback?code=test-one-time-code&next=https://attacker.test"));
  assert.equal(ok.status, 307);
  assert.equal(code, "test-one-time-code");
  assert.equal(ok.headers.get("location"), `${origin}/account`);
  assert.equal(ok.headers.get("referrer-policy"), "no-referrer");
  fail = true;
  const rejected = await GET(new Request(`${origin}/account/callback?code=private-one-time-code`));
  assert.equal(rejected.status, 400);
  assert.doesNotMatch(await rejected.text(), /private-one-time-code|private provider failure/);
  assert.equal((await GET(new Request(`${origin}/account/callback`))).status, 400);
});

test("callback failure explains browser mismatch without exposing tokens or changing authentication", async () => {
  let calls = 0;
  const { GET } = load("src/app/account/callback/route.ts", {
    "@/lib/marketplace-config": { marketplaceOrigin: () => origin },
    "@/lib/supabase-server": { accountAuthClient: async (writable) => {
      assert.equal(writable, true);
      return { auth: { exchangeCodeForSession: async () => { calls++; throw new Error("private auth details"); } } };
    } },
  }, globals);
  for (const query of ["", `?code=${"x".repeat(2049)}`, "?code=private-token&next=https://attacker.test"]) {
    const response = await GET(new Request(`${origin}/account/callback${query}`));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("location"), null);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.equal(response.headers.get("x-robots-tag"), "noindex");
    assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
    const html = await response.text();
    assert.match(html, /same browser and browser profile/);
    assert.match(html, /newest email link/);
    assert.match(html, /href="\/account"/);
    assert.match(html, /href="\/account\/sign-in"/);
    assert.doesNotMatch(html, /private-token|private auth details|attacker\.test|<script/i);
  }
  assert.equal(calls, 1, "Missing and oversized codes must not contact the provider");
});

test("server identity verification distinguishes provider outage from signed-out users", async () => {
  const env = { MARKETPLACE_MODE: "pilot", MARKETPLACE_APP_URL: origin, MARKETPLACE_DATABASE_URL: "test", NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture" };
  const { requireMarketplaceActor } = load("src/lib/marketplace-auth.ts", {
    "server-only": {}, "./supabase-server": { accountAuthClient: async () => ({ auth: { getUser: async () => ({ data: { user: null }, error: { status: 503 } }) } }) },
  }, { process: { env } });
  await assert.rejects(requireMarketplaceActor(), (error) => error.status === 503);
});
