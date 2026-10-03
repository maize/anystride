import test from "node:test";
import assert from "node:assert/strict";
import { NextResponse } from "next/server.js";
import { load } from "./support/load-module.mjs";

const origin = "https://anystride.com";
const env = { MARKETPLACE_REVIEW_NOTIFICATIONS: "email", RESEND_API_KEY: "re_private_fixture", NOTIFY_FROM: "Anystride <alerts@example.test>", VERCEL_ENV: "production" };
const coach = { kind: "coach", targetId: "private-coach-id" };

function notifier(overrides = {}, fetch = async () => Response.json({ id: "email-fixture" })) {
  const logs = [];
  const mod = load("src/lib/marketplace-notifications.ts", {
    "server-only": {}, "./marketplace-config": { marketplaceOrigin: () => origin },
  }, { process: { env: { ...env, ...overrides } }, fetch, console: { error: (...args) => logs.push(args.join(" ")) } });
  return { ...mod, logs };
}

test("review alerts use fixed content, a private review link and stable per-item idempotency", async () => {
  const sent = [];
  const n = notifier({}, async (url, options) => { sent.push({ url, ...options, body: JSON.parse(options.body) }); return Response.json({ id: "email-fixture" }); });
  await n.notifyMarketplaceReview(coach);
  await n.notifyMarketplaceReview(coach);
  await n.notifyMarketplaceReview({ kind: "service", targetId: "private-service-id" });
  assert.equal(sent.length, 3);
  assert.equal(sent[0].url, "https://api.resend.com/emails");
  assert.equal(sent[0].body.to, "matthias.e.link@gmail.com");
  assert.match(sent[0].body.subject, /New coach application/);
  assert.match(sent[2].body.subject, /New coaching service proposal/);
  assert.match(sent[0].body.text, /https:\/\/anystride.com\/account\/review/);
  assert.deepEqual(Object.keys(sent[0].body).sort(), ["from", "subject", "text", "to"]);
  assert.doesNotMatch(JSON.stringify(sent[0].body), /private-coach-id|re_private_fixture/);
  assert.equal(sent[0].headers["Idempotency-Key"], sent[1].headers["Idempotency-Key"]);
  assert.notEqual(sent[0].headers["Idempotency-Key"], sent[2].headers["Idempotency-Key"]);
  assert.equal(sent[0].redirect, "error");
  assert.ok(sent[0].signal instanceof AbortSignal);
  assert.equal(n.logs.length, 0);
  await n.notifyMarketplaceReview({ kind: "service", targetId: "private-service-id", version: 3 });
  assert.notEqual(sent[2].headers["Idempotency-Key"], sent[3].headers["Idempotency-Key"]);
});

test("disabled, preview and incomplete configurations never send review mail", async () => {
  let calls = 0;
  for (const config of [
    { MARKETPLACE_REVIEW_NOTIFICATIONS: "off" }, { MARKETPLACE_REVIEW_NOTIFICATIONS: undefined },
    { VERCEL_ENV: "preview" }, { VERCEL_ENV: "development" },
    { RESEND_API_KEY: "" }, { NOTIFY_FROM: "" }, { NOTIFY_FROM: "x\r\nbcc: bad@example.test" },
    { NOTIFY_EMAIL: "one@example.test,two@example.test" },
  ]) await notifier(config, async () => { calls++; }).notifyMarketplaceReview(coach);
  assert.equal(calls, 0);
});

test("a dedicated marketplace sending key takes precedence over legacy email credentials", async () => {
  let authorization;
  const n = notifier({ MARKETPLACE_RESEND_API_KEY: "re_dedicated_fixture" }, async (_url, options) => {
    authorization = options.headers.Authorization;
    return Response.json({ id: "email-fixture" });
  });
  await n.notifyMarketplaceReview(coach);
  assert.equal(authorization, "Bearer re_dedicated_fixture");
});

test("provider rejection, timeout and malformed replies are caught without private log content", async () => {
  for (const fetch of [
    async () => new Response("private provider detail", { status: 403 }),
    async () => new Response("private provider detail", { status: 429 }),
    async () => { throw new Error("re_private_fixture private-coach-id private provider detail"); },
    async () => Response.json({}), async () => new Response("not JSON"),
  ]) {
    const n = notifier({}, fetch);
    await n.notifyMarketplaceReview(coach);
    assert.equal(n.logs.length, 1);
    assert.match(n.logs[0], /Marketplace review notification:/);
    assert.doesNotMatch(n.logs[0], /re_private_fixture|private-coach-id|private provider detail/);
  }
});

test("the API schedules review mail after persistence, strips internal IDs and never schedules on failed writes", async () => {
  let outcome = { saved: true, notification: coach };
  let fail = false;
  const scheduled = [], sent = [];
  const route = load("src/app/api/marketplace/route.ts", {
    "server-only": {}, "next/server": { NextResponse, after: (fn) => scheduled.push(fn) },
    "@/lib/marketplace-config": { marketplaceOrigin: () => origin, MarketplaceError: class extends Error {} },
    "@/lib/marketplace-auth": { requireMarketplaceActor: async () => ({ id: "coach", admin: false }) },
    "@/lib/marketplace-store": { actOnMarketplace: async () => { if (fail) throw new Error("rollback"); return outcome; } },
    "@/lib/marketplace-notifications": { notifyMarketplaceReview: async (n) => sent.push(n) },
  }, { Request, Response });
  const request = () => new Request(`${origin}/api/marketplace`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ action: "apply", name: "Fixture", bio: "A sufficiently long application description for this test.", credentials: "Fixture qualification" }) });
  const response = await route.POST(request());
  assert.deepEqual(await response.json(), { saved: true });
  assert.equal(scheduled.length, 1);
  assert.equal(sent.length, 0);
  await scheduled[0]();
  assert.equal(sent[0], coach);
  outcome = { saved: true };
  assert.equal((await route.POST(request())).status, 200);
  assert.equal(scheduled.length, 1, "Exact replay must not schedule a second alert");
  fail = true;
  assert.equal((await route.POST(request())).status, 503);
  assert.equal(scheduled.length, 1);
});

test("notification scheduling failure cannot turn a committed submission into an error", async () => {
  const logs = [];
  const route = load("src/app/api/marketplace/route.ts", {
    "server-only": {}, "next/server": { NextResponse, after: () => { throw new Error("private runtime detail"); } },
    "@/lib/marketplace-config": { marketplaceOrigin: () => origin, MarketplaceError: class extends Error {} },
    "@/lib/marketplace-auth": { requireMarketplaceActor: async () => ({ id: "coach", admin: false }) },
    "@/lib/marketplace-store": { actOnMarketplace: async () => ({ saved: true, notification: coach }) },
    "@/lib/marketplace-notifications": { notifyMarketplaceReview: async () => assert.fail("Must not execute here") },
  }, { Request, Response, console: { error: (value) => logs.push(value) } });
  const response = await route.POST(new Request(`${origin}/api/marketplace`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ action: "apply", name: "Fixture", bio: "A sufficiently long application description for this test.", credentials: "Fixture qualification" }) }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { saved: true });
  assert.equal(logs.length, 1);
  assert.doesNotMatch(logs[0], /private runtime detail/);
});
