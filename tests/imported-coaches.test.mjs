import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { load } from "./support/load-module.mjs";

const admin = { id: "fixture-admin", email: "admin@example.test", admin: true };
const athlete = { id: "fixture-athlete", email: "athlete@example.test", admin: false };
const env = {
  MARKETPLACE_MODE: "pilot", MARKETPLACE_APP_URL: "http://localhost:3010",
  MARKETPLACE_DATABASE_URL: "postgresql://localhost/imported_coach_fixture",
  NEXT_PUBLIC_SUPABASE_URL: "https://auth.example.test", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture-only",
};
const globals = { process: { env }, console: { error() {} }, Request, Response };
const inputModule = load("src/lib/imported-coach-input.ts", { "server-only": {} });
const { importedCoachCandidates: candidates } = load("src/lib/imported-coach-catalog.ts", { "server-only": {} });
const existing = candidates.find((entry) => entry.key === "vdot:alli-felsenthal");
const unpublished = candidates.find((entry) => entry.key === "vdot:adam-burum");
const details = {
  name: "Editorial Fixture Coach", city: "Brooklyn", location: "Brooklyn, New York, United States",
  format: "hybrid", focus: ["marathon"], specialties: ["Marathon coaching"], experience: "",
  blurb: "Synthetic directory profile for editorial workflow tests.",
  bio: ["Synthetic coach profile, used only in the isolated test database."],
  link: "https://fixture-coaching.example/",
};
const action = (entry = existing, overrides = {}) => inputModule.parseImportedCoachAction({
  key: entry.key, version: 0, sourceRevision: entry.sourceRevision, status: "published",
  profile: details, confirmSource: true, notes: "Private fixture note", ...overrides,
});

async function fixture(t) {
  const db = new PGlite();
  for (const name of ["002_marketplace.sql", "005_imported_coach_reviews.sql", "005_imported_coach_reviews.sql"]) {
    await db.exec(readFileSync(new URL(`../db/migrations/${name}`, import.meta.url), "utf8"));
  }
  t.after(() => db.close());
  let queries = 0;
  const query = (sql, params) => { queries++; return db.query(sql, params); };
  class Pool { on() {} query = query; async connect() { return { query, release() {} }; } }
  const mocks = { "server-only": {}, pg: { Pool } };
  return { db, mocks, queries: () => queries, ...load("src/lib/imported-coach-store.ts", mocks, globals) };
}

test("import review includes all 186 source records and freezes only the 79 legacy publications", () => {
  assert.equal(candidates.length, 186);
  assert.equal(candidates.filter((entry) => entry.legacyVisible).length, 79);
  assert.equal(unpublished.legacyVisible, false);
  assert.ok(candidates.every((entry) => /^[a-f0-9]{64}$/.test(entry.sourceRevision)));
  const legacy = readFileSync(new URL("../src/data/imported-coach-legacy.ts", import.meta.url), "utf8");
  assert.doesNotMatch(legacy, /from.*vdot-coaches/);
});

test("editorial input rejects ownership, invalid fields, unconfirmed publication and unsafe links", () => {
  const { parseImportedCoachAction: parse } = inputModule;
  const raw = { key: existing.key, version: 0, sourceRevision: existing.sourceRevision, status: "published", profile: details, confirmSource: true };
  assert.equal(parse(raw).profile.city, "Brooklyn");
  for (const fields of [{ admin: true }, { status: "approved" }, { version: -1 }, { version: "0" }, { sourceRevision: "bad" }, { confirmSource: false }]) assert.throws(() => parse({ ...raw, ...fields }));
  for (const fields of [{ verified: true }, { slug: "owned" }, { editoriallyReviewed: true }, { source: { url: "https://evil.example" } }, { focus: [] }, { focus: ["medicine"] }, { name: "<script>bad</script>" }]) assert.throws(() => parse({ ...raw, profile: { ...details, ...fields } }));
  for (const link of ["javascript:alert(1)", "https://user:secret@example.org", "http://127.0.0.1", "http://localhost", "https://vdoto2.com/running-coach/test", "https://example.org/?email=private", "https://example.org/#secret"]) assert.throws(() => parse({ ...raw, profile: { ...details, link } }));
  assert.throws(() => parse({ ...raw, status: "hidden" }), /Unexpected|Check/);
});

test("SQL review → publish → hide → republish persists, audits, and never claims ownership", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.publicImportedCoaches()).length, 79);
  const initial = (await f.importedCoachReviews(admin)).find((entry) => entry.key === existing.key);
  assert.equal(initial.status, "unreviewed");
  assert.equal(initial.visible, true);
  await f.reviewImportedCoach(admin, action());
  const publicCoach = (await f.publicImportedCoaches()).find((coach) => coach.slug === existing.slug);
  assert.equal(publicCoach.name, details.name);
  assert.equal(publicCoach.city, "Brooklyn");
  assert.equal(publicCoach.verified, false);
  assert.equal(publicCoach.editoriallyReviewed, true);
  assert.equal(publicCoach.source.url, details.link);
  for (const field of ["notes", "reviewed_by", "reviewed_at", "last_request_hash"]) assert.equal(field in publicCoach, false);
  const hide = action(existing, { version: 1, status: "hidden", profile: undefined, confirmSource: false });
  await f.reviewImportedCoach(admin, hide);
  assert.equal((await f.publicImportedCoaches()).some((coach) => coach.slug === existing.slug), false);
  const hidden = (await f.importedCoachReviews(admin)).find((entry) => entry.key === existing.key);
  assert.equal(hidden.profile.name, details.name, "hiding retains saved corrections");
  assert.equal(hidden.notes, "Private fixture note");
  await f.reviewImportedCoach(admin, action(existing, { version: 2 }));
  assert.equal((await f.publicImportedCoaches()).find((coach) => coach.slug === existing.slug).name, details.name);
  assert.equal((await f.db.query("SELECT count(*)::int AS n FROM marketplace_audit WHERE action LIKE 'imported-coach:%'")).rows[0].n, 3);
  assert.equal((await f.db.query("SELECT count(*)::int AS n FROM marketplace_coaches")).rows[0].n, 0);
});

test("new candidates stay private until approved; a saved draft hides an existing listing", async (t) => {
  const f = await fixture(t);
  await f.reviewImportedCoach(admin, action(unpublished, { status: "draft", confirmSource: false }));
  assert.equal((await f.publicImportedCoaches()).some((coach) => coach.slug === unpublished.slug), false);
  await f.reviewImportedCoach(admin, action(unpublished, { version: 1 }));
  assert.equal((await f.publicImportedCoaches()).some((coach) => coach.slug === unpublished.slug), true);
  await f.reviewImportedCoach(admin, action(existing, { status: "draft", confirmSource: false }));
  assert.equal((await f.publicImportedCoaches()).some((coach) => coach.slug === existing.slug), false);
});

test("admin authorization precedes SQL; stale versions, stale sources, excluded and duplicate profiles are blocked", async (t) => {
  const f = await fixture(t);
  await assert.rejects(f.importedCoachReviews(athlete), (e) => e.status === 403);
  await assert.rejects(f.reviewImportedCoach(athlete, action()), (e) => e.status === 403);
  assert.equal(f.queries(), 0);
  await assert.rejects(f.reviewImportedCoach(admin, action(existing, { sourceRevision: "0".repeat(64) })), (e) => e.status === 409);
  await f.reviewImportedCoach(admin, action());
  await f.reviewImportedCoach(admin, action());
  assert.equal((await f.db.query("SELECT count(*)::int AS n FROM marketplace_audit")).rows[0].n, 1, "exact retry is idempotent");
  await assert.rejects(f.reviewImportedCoach(admin, action(existing, { profile: { ...details, name: "Conflicting edit" } })), (e) => e.status === 409);
  await assert.rejects(f.reviewImportedCoach(admin, action(candidates.find((entry) => entry.importStatus === "duplicate"))), /excluded/);
  await assert.rejects(f.reviewImportedCoach(admin, action(unpublished)), /already exists/);
  const rls = await f.db.query("SELECT relrowsecurity FROM pg_class WHERE relname='imported_coach_reviews'");
  assert.equal(rls.rows[0].relrowsecurity, true);
});

test("source changes retain saved corrections and require another source check", async (t) => {
  const f = await fixture(t);
  await f.reviewImportedCoach(admin, action());
  await f.db.query("UPDATE imported_coach_reviews SET source_revision=$1 WHERE entry_key=$2", ["0".repeat(64), existing.key]);
  const reviewed = (await f.importedCoachReviews(admin)).find((entry) => entry.key === existing.key);
  assert.equal(reviewed.sourceChanged, true);
  assert.equal(reviewed.profile.city, details.city);
  assert.equal(reviewed.profile.name, details.name);
  assert.equal((await f.publicImportedCoaches()).find((coach) => coach.slug === existing.slug).name, details.name);
  await f.reviewImportedCoach(admin, action(existing, { version: 1 }));
  assert.equal((await f.importedCoachReviews(admin)).find((entry) => entry.key === existing.key).sourceChanged, false);
});

test("new ready imports do not become public without an editorial decision", () => {
  const future = { ...unpublished, importStatus: "ready", profile: { ...existing.profile, slug: unpublished.slug } };
  const f = load("src/lib/imported-coach-store.ts", {
    "server-only": {}, "./imported-coach-catalog": { importedCoachCandidates: [future] },
  }, globals);
  assert.equal(f.applyImportedCoachReviews([]).length, 0);
});

test("unavailable review storage fails closed, and catalog resolution cannot bypass hidden profiles", async () => {
  class Pool { on() {} async connect() { throw new Error("private database credential"); } }
  const f = load("src/lib/imported-coach-store.ts", { "server-only": {}, pg: { Pool } }, globals);
  assert.equal((await f.publicImportedCoaches()).length, 0);
  const { COACHES } = load("src/data/coaches.ts");
  const core = load("src/lib/coaches.ts", {
    "./imported-coach-store": { publicImportedCoaches: async () => [] },
    "./discovered-coach-store": { loadDiscoveredCoaches: async () => [{ ...existing.profile, slug: "rediscovered-copy" }] },
  });
  const catalog = await core.getAllCoachesWithDiscovered();
  assert.equal(catalog.length, COACHES.filter((coach) => !coach.discoveredFrom).length);
  assert.equal(await core.getCoachBySlugWithDiscovered(existing.slug), undefined);
  assert.equal(catalog.some((coach) => coach.slug === "rediscovered-copy"), false);
  const paths = load("src/lib/site-urls.ts", { "@/lib/coaches": core, "./coaches": core });
  assert.equal((await paths.getAllSitePathsWithDiscovered()).includes(`/coaching/${existing.slug}`), false);
});

test("review endpoint rejects CSRF, oversized/forged data and non-admins; invalidation failure does not undo a save", async () => {
  let actor = athlete;
  let writes = 0;
  const api = load("src/app/api/marketplace/imported-coaches/route.ts", {
    "server-only": {}, "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
    "next/cache": { revalidatePath() { throw new Error("cache unavailable"); } },
    "@/lib/marketplace-auth": { requireMarketplaceActor: async () => actor },
    "@/lib/imported-coach-store": { reviewImportedCoach: async () => { writes++; return { saved: true }; } },
  }, globals);
  const raw = { key: existing.key, version: 0, sourceRevision: existing.sourceRevision, status: "published", profile: details, confirmSource: true };
  const request = (body = raw, origin = env.MARKETPLACE_APP_URL, type = "application/json") => new Request(`${env.MARKETPLACE_APP_URL}/api/marketplace/imported-coaches`, { method: "POST", headers: { origin, "content-type": type }, body: JSON.stringify(body) });
  assert.equal((await api.POST(request())).status, 403);
  actor = admin;
  assert.equal((await api.POST(request(raw, "https://bad.example"))).status, 403);
  assert.equal((await api.POST(request(raw, env.MARKETPLACE_APP_URL, "text/plain"))).status, 415);
  assert.equal((await api.POST(request({ ...raw, profile: { ...details, verified: true } }))).status, 400);
  assert.equal((await api.POST(request({ ...raw, notes: "x".repeat(17000) }))).status, 413);
  assert.equal(writes, 0);
  const saved = await api.POST(request());
  assert.equal(saved.status, 200);
  assert.deepEqual(await saved.json(), { saved: true });
  assert.equal(saved.headers.get("cache-control"), "private, no-store");
  assert.equal(writes, 1);
});
