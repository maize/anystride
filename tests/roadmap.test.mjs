import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import vm from "node:vm";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);

// Execute the actual TS modules with isolated dependency boundaries; no network or credentials.
function load(file, mocks = {}, globals = {}) {
  const filename = resolve(root, file);
  const code = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const compiled = { exports: {} };
  const localRequire = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith(".") || name.startsWith("@/")) {
      const target = name.startsWith("@/") ? resolve(root, "src", name.slice(2)) : resolve(dirname(filename), name);
      return load(`${target}.ts`, mocks, globals);
    }
    return require(name);
  };
  vm.runInNewContext(code, { module: compiled, exports: compiled.exports, require: localRequire, process: { env: {} }, Buffer, AbortSignal, ...globals }, { filename });
  return compiled.exports;
}

test("product parameters discard inputs and malformed identifiers", () => {
  const { productEventParameters } = load("src/lib/product-events.ts");
  const result = productEventParameters({ plan_slug: "couch-to-5k", start_date: "2026-09-12", email: "runner@example.com", weekly_base: 30, race_slug: "https://example.com", guide_slug: "x".repeat(101), link_kind: "results" });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { plan_slug: "couch-to-5k", link_kind: "results" });
});

test("product analytics guards local, preview, opt-out, invalid events and provider failure", () => {
  function client(hostname, env = "production", navigator = {}, send = () => {}) {
    return load("src/lib/analytics.ts", { "@next/third-parties/google": { sendGAEvent: send } }, { process: { env: { NODE_ENV: env } }, window: { location: { hostname } }, navigator }).trackProductEvent;
  }
  const calls = [];
  const send = (...args) => calls.push(args);
  for (const host of ["localhost", "127.0.0.1", "anystride-preview.vercel.app", "anystride.com.attacker.test"]) client(host, "production", {}, send)("plan_activated");
  client("anystride.com", "development", {}, send)("plan_activated");
  client("anystride.com", "production", { doNotTrack: "1" }, send)("plan_activated");
  client("anystride.com", "production", { globalPrivacyControl: true }, send)("plan_activated");
  client("anystride.com", "production", {}, send)("unexpected_event");
  assert.equal(calls.length, 0);
  client("anystride.com", "production", {}, send)("plan_activated", { plan_slug: "couch-to-5k", start_date: "2026-09-12" });
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), ["event", "plan_activated", { plan_slug: "couch-to-5k" }]);
  assert.doesNotThrow(() => client("anystride.com", "production", {}, () => { throw Error("blocked"); })("plan_print"));
});

test("IndexNow accepts only explicit canonical batches and deduplicates", () => {
  const { changedPagePaths } = load("src/lib/indexnow.ts");
  const allowed = ["/", "/guides/fueling-for-long-runs"];
  assert.equal(changedPagePaths({ paths: ["/", "/"] }, allowed).length, 1);
  for (const body of [null, {}, { paths: [] }, { paths: ["https://anystride.com/"] }, { paths: ["/?q=1"] }, { paths: ["/#x"] }, { paths: ["/guides/fueling-long-runs"] }, { paths: ["/", "/missing"] }, { paths: [42] }, { paths: Array(101).fill("/") }]) {
    assert.equal(changedPagePaths(body, allowed), null);
  }
});

test("IndexNow route fails closed and never fetches invalid batches", async () => {
  let requests = 0;
  const mocks = { "@/lib/site-urls": { BASE: "https://anystride.com", getAllSitePaths: () => ["/"] } };
  const globals = { fetch: async () => { requests++; return new Response(null, { status: 200 }); } };
  const request = (body, token = "test-secret") => new Request("http://localhost/api/indexnow", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
  const disabled = load("src/app/api/indexnow/route.ts", mocks, globals);
  assert.equal((await disabled.POST(request('{"paths":["/"]}'))).status, 503);
  const enabled = load("src/app/api/indexnow/route.ts", mocks, { ...globals, process: { env: { INDEXNOW_SECRET: "test-secret" } } });
  assert.equal((await enabled.POST(request('{"paths":["/"]}', "wrong"))).status, 401);
  assert.equal((await enabled.POST(request("not JSON"))).status, 400);
  assert.equal((await enabled.POST(request('{"paths":["/missing"]}'))).status, 400);
  assert.equal((await enabled.POST(request("x".repeat(17000)))).status, 413);
  assert.equal(requests, 0);
  const response = await enabled.POST(request('{"paths":["/","/"]}'));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).submitted, 1);
  assert.equal(requests, 1);
});

test("IndexNow reports upstream failures instead of false success", async () => {
  const mocks = { "@/lib/site-urls": { BASE: "https://anystride.com", getAllSitePaths: () => ["/"] } };
  for (const fetch of [async () => new Response(null, { status: 429 }), async () => { throw Error("timeout"); }]) {
    const { POST } = load("src/app/api/indexnow/route.ts", mocks, { process: { env: { CRON_SECRET: "test" } }, fetch });
    const response = await POST(new Request("http://localhost/api/indexnow", { method: "POST", headers: { Authorization: "Bearer test" }, body: '{"paths":["/"]}' }));
    assert.equal(response.status, 502);
  }
});

test("guides, sitemap and redirect agree on the single canonical fueling page", async () => {
  const { GUIDES } = load("src/data/guides.ts");
  assert.equal(GUIDES.filter((guide) => guide.slug.includes("fueling")).length, 1);
  assert.equal(new Set(GUIDES.map((guide) => guide.slug)).size, GUIDES.length);
  const guide = GUIDES.find((guide) => guide.slug === "fueling-for-long-runs");
  assert.equal(guide.sources.length, 3);
  const sitemap = load("src/app/sitemap.ts").default();
  assert.equal(sitemap.some((entry) => entry.url.endsWith("/fueling-long-runs")), false);
  assert.equal(sitemap.find((entry) => entry.url.endsWith(`/guides/${guide.slug}`)).lastModified, guide.updated);
  assert.equal(sitemap.find((entry) => entry.url === "https://anystride.com/calculator").lastModified, undefined);
  assert.equal(new Set(sitemap.map((entry) => entry.url)).size, sitemap.length);
  const redirects = await load("next.config.ts").default.redirects();
  assert.equal(redirects[0].destination, `/guides/${guide.slug}`);
  assert.equal(redirects[0].permanent, true);
});

test("weekly report uses complete days and reports zero-count product events", async () => {
  const reports = [];
  class MockOAuth {
    setCredentials() {}
    async getAccessToken() { return { token: "test-only" }; }
  }
  const { fetchWeekly } = load("src/lib/ga.ts", {
    "google-auth-library": { OAuth2Client: MockOAuth },
  }, {
    process: { env: { GOOGLE_OAUTH_REFRESH_TOKEN: "test", GOOGLE_OAUTH_CLIENT_ID: "test", GOOGLE_OAUTH_CLIENT_SECRET: "test" } },
    fetch: async (_url, options) => {
      const body = JSON.parse(options.body);
      reports.push(body);
      const isProductReport = body.dimensionFilter?.filter?.inListFilter;
      return new Response(JSON.stringify(isProductReport ? {
        dimensionHeaders: [{ name: "eventName" }],
        metricHeaders: [{ name: "eventCount" }, { name: "totalUsers" }],
        rows: [{ dimensionValues: [{ value: "plan_activated" }], metricValues: [{ value: "3" }, { value: "2" }] }],
      } : {}));
    },
  });
  const report = await fetchWeekly(7);
  assert.equal(reports.length, 5);
  assert.ok(reports.every((body) => body.dateRanges[0].startDate === "7daysAgo" && body.dateRanges[0].endDate === "yesterday"));
  assert.equal(report.productEvents.length, 8);
  assert.equal(report.productEvents.find((row) => row.eventName === "plan_activated").eventCount, 3);
  assert.equal(report.productEvents.find((row) => row.eventName === "plan_activated").totalUsers, 2);
  assert.equal(report.productEvents.find((row) => row.eventName === "plan_print").eventCount, 0);
});
