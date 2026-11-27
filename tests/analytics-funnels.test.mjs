import assert from "node:assert/strict";
import { test } from "node:test";
import { load } from "./support/load-module.mjs";

const item = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const order = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("funnel parameters keep enumerated commerce fields and drop identities", () => {
  const { productEventParameters, majorCurrencyValue } = load("src/lib/product-events.ts");
  const safe = productEventParameters({
    method: "email",
    entry: "checkout",
    step_name: "offer",
    step_number: 1,
    currency: "usd",
    value: 200,
    transaction_id: order.toUpperCase(),
    item_id: item,
    item_category: "package",
    item_name: "Coaching with Jane Smith",
    email: "runner@example.com",
    name: "Jane Smith",
    buyerEmail: "buyer@example.com",
    last_field: "email",
  });
  assert.deepEqual(JSON.parse(JSON.stringify(safe)), {
    method: "email",
    entry: "checkout",
    step_name: "offer",
    step_number: 1,
    last_field: "email",
    currency: "USD",
    value: 200,
    transaction_id: order,
    items: [{ item_id: item, item_category: "package", price: 200, quantity: 1 }],
  });
  assert.equal(JSON.stringify(safe).includes("example.com"), false);
  assert.equal(JSON.stringify(safe).includes("Jane"), false);
  assert.equal(majorCurrencyValue(20000), 200);
  assert.equal(majorCurrencyValue(50), null);
  assert.deepEqual(JSON.parse(JSON.stringify(productEventParameters({
    step_name: "profile",
    step_number: 2,
    currency: "aud",
    value: 0,
    item_id: "not-a-uuid",
    item_category: "plan",
    transaction_id: "pi_private",
    last_field: "runner@example.com",
    method: "password",
    entry: "admin",
  }))), {});
});

test("page paths and scroll thresholds stay on public landing pages", () => {
  const { publicPagePath, isEngagementPath, newlyReachedScrollDepths } = load("src/lib/product-events.ts");
  assert.equal(publicPagePath("/plans/couch-to-5k"), "/plans/couch-to-5k");
  assert.equal(publicPagePath("/account/orders/private"), null);
  assert.equal(publicPagePath("/plans?email=runner@example.com"), null);
  assert.equal(publicPagePath("/coaching/payment-return"), null);
  assert.equal(isEngagementPath("/coaches"), true);
  assert.equal(isEngagementPath("/coaching/with/coach-name"), true);
  assert.equal(isEngagementPath("/coaching/apply"), false);
  assert.equal(isEngagementPath("/account/sign-in"), false);
  assert.deepEqual(JSON.parse(JSON.stringify(newlyReachedScrollDepths(80, [25]))), [50, 75]);
  assert.deepEqual(JSON.parse(JSON.stringify(newlyReachedScrollDepths(Number.NaN, []))), []);
});

test("page views are sent once per pathname and engagement stays on landing pages", () => {
  const calls = [];
  const { trackPageView, trackScrollDepth, trackEngagedTime } = load("src/lib/analytics.ts", {
    "@next/third-parties/google": { sendGAEvent: (...args) => calls.push(args) },
    "./posthog": { capturePostHogProductEvent: () => { throw new Error("page views are not product events"); } },
  }, {
    process: { env: { NODE_ENV: "production" } },
    window: { location: { hostname: "anystride.com", origin: "https://anystride.com", pathname: "/plans" } },
    navigator: {},
  });
  trackPageView("/plans");
  trackPageView("/plans");
  trackPageView("/plans?email=runner@example.com");
  trackPageView("/guides/fueling-for-long-runs");
  trackPageView("/guides/fueling-for-long-runs");
  trackPageView("/account/storefront");
  trackScrollDepth("/plans", 25);
  trackScrollDepth("/plans", 30);
  trackScrollDepth("/account/training", 90);
  trackEngagedTime("/racers");
  trackEngagedTime("/coaching/apply");
  assert.deepEqual(calls.map((call) => call[1]), ["page_view", "scroll_depth", "engaged_time"]);
  assert.equal(calls[0][2].page_location, "https://anystride.com/guides/fueling-for-long-runs");
  assert.equal(calls[0][2].page_path, "/guides/fueling-for-long-runs");
  assert.equal(JSON.stringify(calls).includes("email"), false);
  assert.equal(calls[1][2].percent_scrolled, 25);
  assert.equal(calls[2][2].engagement_time_msec, 10000);
});

test("deduped events survive reloads and account hits omit personal fields", () => {
  const sent = [];
  const session = memoryStorage();
  const local = memoryStorage();
  const { trackProductEventOnce } = load("src/lib/analytics.ts", {
    "@next/third-parties/google": { sendGAEvent: () => { throw new Error("account pages must not queue gtag"); } },
  }, {
    process: { env: { NODE_ENV: "production", NEXT_PUBLIC_GA_ID: "G-TESTID" } },
    window: { location: { hostname: "anystride.com", origin: "https://anystride.com", pathname: "/account/orders/private" }, sessionStorage: session, localStorage: local },
    document: {
      cookie: "_ga=GA1.1.123.456; _ga_TESTID=GS1.1.1700000000.3.1.1700000000.0.0.0",
      getElementById: () => null,
    },
    URLSearchParams,
    navigator: { sendBeacon: (_url, body) => { sent.push(String(body)); return true; } },
    fetch: () => { throw new Error("beacon should handle the hit"); },
  });
  const purchase = { transaction_id: order, currency: "gbp", value: 19.99, item_id: item, item_category: "consultation", email: "buyer@example.com", item_name: "Jane" };
  trackProductEventOnce(`purchase:${order}`, "purchase", purchase, "local");
  trackProductEventOnce(`purchase:${order}`, "purchase", purchase, "local");
  assert.equal(sent.length, 1);
  const hit = new URLSearchParams(sent[0]);
  assert.equal(hit.get("en"), "purchase");
  assert.equal(hit.get("cid"), "123.456");
  assert.equal(hit.get("sid"), "1700000000");
  assert.equal(hit.get("ep.transaction_id"), order);
  assert.equal(hit.get("ep.currency"), "GBP");
  assert.equal(hit.get("epn.value"), "19.99");
  assert.equal(hit.get("pr1"), `id${item}~caconsultation~pr19.99~qt1`);
  assert.equal(sent[0].includes("example.com"), false);
  assert.equal(sent[0].includes("Jane"), false);
  assert.equal(sent[0].includes("/account/orders"), false);
  assert.equal(local.getItem(`anystride:event:purchase:${order}`), "1");
});

test("confirmed auth is signup only for a new account's first session", () => {
  const { confirmedAuthEvent, authAnalyticsCookie, parseAuthAnalyticsCookie } = load("src/lib/auth-analytics.ts");
  const now = Date.parse("2026-11-27T15:00:00Z");
  const fresh = {
    created_at: "2026-11-27T14:30:00Z",
    email_confirmed_at: "2026-11-27T14:59:30Z",
    last_sign_in_at: "2026-11-27T14:59:40Z",
  };
  assert.equal(confirmedAuthEvent(fresh, now), "sign_up");
  assert.equal(confirmedAuthEvent({ ...fresh, last_sign_in_at: "2026-11-27T15:10:00Z" }, now + 11 * 60 * 1000), "login");
  assert.equal(confirmedAuthEvent({ ...fresh, created_at: "2026-11-20T14:30:00Z" }, now), "login");
  assert.equal(confirmedAuthEvent({ ...fresh, is_anonymous: true }, now), null);
  assert.equal(confirmedAuthEvent({ created_at: fresh.created_at }, now), null);
  const cookie = authAnalyticsCookie({
    user: { ...fresh, email: "runner@example.com", id: "user-private" },
    now,
    host: "www.anystride.com",
    optOut: false,
    redirectPath: "/account/services?claim=some-coach",
    nonce: "0123456789abcdef",
  });
  assert.equal(cookie, "sign_up.coach.0123456789abcdef");
  assert.deepEqual(JSON.parse(JSON.stringify(parseAuthAnalyticsCookie(cookie))), { event: "sign_up", entry: "coach", nonce: "0123456789abcdef" });
  assert.equal(parseAuthAnalyticsCookie("sign_up.coach.runner@example.com"), null);
  assert.equal(authAnalyticsCookie({ user: fresh, now, host: "anystride.com", optOut: true, redirectPath: "/account", nonce: "0123456789abcdef" }), null);
  assert.equal(authAnalyticsCookie({ user: fresh, now, host: "preview.anystride.com", optOut: false, redirectPath: "/account/checkout/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", nonce: "0123456789abcdef" }), null);
  assert.equal(authAnalyticsCookie({ user: fresh, now, host: "anystride.com", optOut: false, redirectPath: "/account/athletes", nonce: "short" }), null);
});

test("the auth callback sets a non-identifying event cookie only after a real confirmation", async () => {
  const { NextResponse } = await import("next/server.js");
  const now = Date.now();
  const user = {
    id: "user-private",
    email: "runner@example.com",
    created_at: new Date(now - 60_000).toISOString(),
    email_confirmed_at: new Date(now - 1_000).toISOString(),
    last_sign_in_at: new Date(now - 1_000).toISOString(),
  };
  function route(result) {
    return load("src/app/account/callback/route.ts", {
      "next/server": { NextResponse, after: () => {} },
      "@/lib/marketplace-config": { marketplaceOrigin: () => "https://anystride.com" },
      "@/lib/supabase-server": { accountAuthClient: async () => ({ auth: { exchangeCodeForSession: async () => result } }) },
      "@/lib/signup-notifications": { notifyVerifiedSignup: async () => {} },
    }, { Request, Response });
  }
  const created = await route({ data: { user }, error: null }).GET(new Request("https://anystride.com/account/callback?code=ok", {
    headers: { cookie: "anystride-checkout-return=%2Faccount%2Fathletes" },
  }));
  assert.equal(created.headers.get("location"), "https://anystride.com/account/athletes");
  const signup = created.headers.getSetCookie().find((cookie) => cookie.startsWith("anystride_ae="));
  assert.match(signup, /^anystride_ae=sign_up\.invite\.[a-f0-9]{16};/);
  assert.equal(signup.includes("runner@example.com"), false);
  assert.equal(signup.includes("user-private"), false);
  const optedOut = await route({ data: { user }, error: null }).GET(new Request("https://anystride.com/account/callback?code=ok", { headers: { dnt: "1" } }));
  assert.equal(optedOut.headers.getSetCookie().some((cookie) => cookie.startsWith("anystride_ae=")), false);
  const returning = { ...user, created_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(), email_confirmed_at: new Date(now - 9 * 24 * 60 * 60 * 1000).toISOString() };
  const login = await route({ data: { user: returning }, error: null }).GET(new Request("https://www.anystride.com/account/callback?code=ok"));
  assert.match(login.headers.getSetCookie().find((cookie) => cookie.startsWith("anystride_ae=")), /^anystride_ae=login\.runner\.[a-f0-9]{16};/);
  const preview = await route({ data: { user }, error: null }).GET(new Request("https://preview.anystride.com/account/callback?code=ok"));
  assert.equal(preview.headers.get("location"), "https://anystride.com/account");
  assert.equal(preview.headers.getSetCookie().some((cookie) => cookie.startsWith("anystride_ae=")), false);
});
