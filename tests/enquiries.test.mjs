import assert from "node:assert/strict";
import { test } from "node:test";
import { load } from "./support/load-module.mjs";

const sample = {
  id: "3bcdd2c8-e9c7-4110-914d-44cc452e9f91", kind: "coach_match",
  name: " Test Runner ", email: " RUNNER@example.com ", goal: "marathon",
  format: "online", location: "", consent: true, companyFax: "",
};
const partner = { ...sample, kind: "partnership", organisation: "Test Running Club", interest: "race", message: "Discuss our community race." };
const request = (body = sample, headers = {}) => new Request("http://localhost/api/enquiries", {
  method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost", ...headers },
  body: typeof body === "string" ? body : JSON.stringify(body),
});

test("enquiry parser validates permission and stores only the intended fields", () => {
  const { parseEnquiry } = load("src/lib/enquiries.ts");
  const result = parseEnquiry({ ...sample, medicalHistory: "must not store", payment: "must not store" }).enquiry;
  assert.equal(result.name, "Test Runner");
  assert.equal(result.email, "runner@example.com");
  assert.equal(result.medicalHistory, undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(result.details)), { goal: "marathon", format: "online", location: "" });
  assert.equal(parseEnquiry(partner).enquiry.details.interest, "race");
  assert.equal(parseEnquiry(partner).enquiry.details.goal, undefined);
  for (const body of [null, [], {}, { ...sample, consent: false }, { ...sample, consent: "true" }, { ...sample, companyFax: "bot" }, { ...sample, email: {} }, { ...sample, id: "invalid" }, { ...sample, name: "x".repeat(121) }, { ...sample, goal: "__proto__" }, { ...sample, format: "local" }, { ...partner, interest: "constructor" }, { ...partner, message: "x".repeat(1001) }]) {
    assert.ok(parseEnquiry(body).error, JSON.stringify(body));
  }
});

function route({ configured = true, save = async () => "created", list = async () => [], token = "test-only" } = {}) {
  return load("src/app/api/enquiries/route.ts", {
    "@/lib/interest-store": { isDbConfigured: () => configured },
    "@/lib/enquiry-store": { saveEnquiry: save, listEnquiries: list },
  }, { process: { env: token ? { ADMIN_EXPORT_TOKEN: token } : {} } });
}

test("public endpoint rejects malformed/cross-origin requests before persistence", async () => {
  let writes = 0;
  const { POST } = route({ save: async () => { writes++; return "created"; } });
  for (const [req, status] of [
    [request(sample, { Origin: "https://attacker.test" }), 403],
    [request(sample, { Origin: "null" }), 403],
    [request(sample, { "Content-Type": "text/plain" }), 415],
    [request("{"), 400], [request("x".repeat(8193)), 413],
    [request({ ...sample, consent: false }), 400],
    [request({ ...sample, companyFax: "spam" }), 400],
  ]) assert.equal((await POST(req)).status, status);
  assert.equal(writes, 0);
});

test("success requires durable storage; retries and rate limits are explicit", async () => {
  assert.equal((await route({ configured: false }).POST(request())).status, 503);
  assert.equal((await route({ save: async () => { throw Error("database offline"); } }).POST(request())).status, 503);
  const created = await route().POST(request());
  assert.equal(created.status, 201);
  assert.deepEqual(await created.json(), { ok: true, created: true });
  const duplicate = await route({ save: async () => "duplicate" }).POST(request());
  assert.deepEqual(await duplicate.json(), { ok: true, created: false });
  const limited = await route({ save: async () => "limited" }).POST(request());
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("Retry-After"), "3600");
  assert.equal((await route({ save: async () => "conflict" }).POST(request())).status, 409);
});

test("private export requires bearer auth and is never cacheable", async () => {
  let reads = 0;
  const { GET } = route({ list: async () => { reads++; return [{ id: sample.id }]; } });
  assert.equal((await GET(new Request("http://localhost/api/enquiries?token=test-only"))).status, 401);
  assert.equal(reads, 0);
  assert.equal((await route({ token: null }).GET(new Request("http://localhost/api/enquiries"))).status, 404);
  const response = await GET(new Request("http://localhost/api/enquiries", { headers: { Authorization: "Bearer test-only" } }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex");
  assert.equal((await response.json()).count, 1);
});

test("store wraps insert, deduplication and limits in a transaction and releases connections", async () => {
  const { parseEnquiry } = load("src/lib/enquiries.ts");
  for (const scenario of ["created", "duplicate", "conflict", "email-limit", "global-limit", "failure"]) {
    const calls = [];
    let released = false;
    const client = {
      release: () => { released = true; },
      query: async (sql, params) => {
        calls.push({ sql, params });
        if (sql.startsWith("SELECT id")) {
          const saved = parseEnquiry(sample).enquiry;
          return { rows: ["duplicate", "conflict"].includes(scenario) ? [{ ...saved, name: scenario === "conflict" ? "Different person" : saved.name, consent_version: saved.consentVersion }] : [] };
        }
        if (sql.includes("count(*)")) return { rows: [{ total: scenario === "global-limit" ? 100 : 0, per_email: scenario === "email-limit" ? 3 : 0 }] };
        if (sql.includes("INSERT INTO") && scenario === "failure") throw Error("write failed");
        return { rows: [] };
      },
    };
    const { saveEnquiry } = load("src/lib/enquiry-store.ts", { "./interest-store": { getPool: () => ({ query: async () => ({ rows: [] }), connect: async () => client }) } });
    if (scenario === "failure") await assert.rejects(saveEnquiry(parseEnquiry(sample).enquiry));
    else assert.equal(await saveEnquiry(parseEnquiry(sample).enquiry), scenario.endsWith("limit") ? "limited" : scenario);
    assert.equal(calls[0].sql, "BEGIN");
    assert.ok(calls.some(({ sql }) => sql.includes("pg_advisory_xact_lock")));
    assert.equal(calls.at(-1).sql, scenario === "failure" ? "ROLLBACK" : "COMMIT");
    assert.equal(calls.filter(({ sql }) => sql.includes("INSERT INTO")).length, ["created", "failure"].includes(scenario) ? 1 : 0);
    assert.equal(released, true);
  }
});

test("new pages are canonical and commercial analytics omit lead details", () => {
  const { getAllSitePaths } = load("src/lib/site-urls.ts");
  assert.ok(getAllSitePaths().includes("/coaching/match"));
  assert.ok(getAllSitePaths().includes("/partners"));
  assert.ok(!getAllSitePaths().includes("/clinics"));
  assert.ok(getAllSitePaths().includes("/partners/race-hubs"));
  const { productEventParameters } = load("src/lib/product-events.ts");
  const safe = productEventParameters({ ...sample, coach_slug: "test-coach", message: "private message" });
  assert.deepEqual(JSON.parse(JSON.stringify(safe)), { coach_slug: "test-coach" });
});

const hub = { ...partner, interest: "race_hub" };

test("retired clinic interests are rejected and race hubs need an organisation and message", () => {
  const { parseEnquiry } = load("src/lib/enquiries.ts");
  assert.ok(parseEnquiry(hub).enquiry);
  for (const body of [
    { ...partner, interest: "clinic_attend", topic: "training" },
    { ...partner, interest: "clinic_host", topic: "strength" },
    { ...hub, organisation: "" }, { ...hub, message: "" },
    { ...hub, organisation: {} }, { ...hub, organisation: "x".repeat(161) },
    { ...hub, message: {} }, { ...hub, message: "x".repeat(1001) },
  ]) assert.ok(parseEnquiry(body).error, JSON.stringify(body));
  const details = parseEnquiry({ ...hub, topic: "strength", participantList: "do not store" }).enquiry.details;
  assert.equal(details.topic, undefined);
  assert.equal(details.participantList, undefined);
});

test("pilot requests pass only validated fields to the existing private store", async () => {
  for (const body of [hub]) {
    let saved;
    const { POST } = route({ save: async (enquiry) => { saved = enquiry; return "created"; } });
    const response = await POST(request({ ...body, payment: "never store", participantList: "never store" }));
    assert.equal(response.status, 201);
    assert.equal(saved.kind, "partnership");
    assert.equal(saved.details.interest, body.interest);
    assert.equal(saved.payment, undefined);
    assert.equal(saved.details.participantList, undefined);
    assert.equal((await route({ configured: false }).POST(request(body))).status, 503);
    assert.deepEqual(await (await route({ save: async () => "duplicate" }).POST(request(body))).json(), { ok: true, created: false });
  }
});

test("pilot analytics classify outcomes without passing any form answers", () => {
  const { enquiryProductEvent, PRODUCT_EVENTS, productEventParameters } = load("src/lib/product-events.ts");
  for (const [kind, interest, expected] of [
    ["coach_match", undefined, "coach_match_request"],
    ["partnership", "race_hub", "race_hub_enquiry"],
    ["partnership", "race", "partnership_enquiry"],
  ]) {
    assert.equal(enquiryProductEvent(kind, interest), expected);
    assert.ok(PRODUCT_EVENTS.includes(expected));
  }
  assert.ok(!PRODUCT_EVENTS.includes("clinic_interest"));
  assert.deepEqual(JSON.parse(JSON.stringify(productEventParameters({ ...hub, athlete: "private", raceDate: "2026-10-10" }))), {});
});
