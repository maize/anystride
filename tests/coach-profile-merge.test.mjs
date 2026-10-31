import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { load } from "./support/load-module.mjs";

const actor = { id: "merge-coach-one", email: "coach@example.test", admin: false };
const other = { id: "merge-coach-other", email: "other@example.test", admin: true };
const profile = { slug: "existing-coach", name: "Existing Coach", city: "Online", location: "Global", format: "online", focus: ["marathon"], specialties: ["Marathon"], experience: "Ten years of coaching experience", blurb: "Coaching for runners preparing for the marathon.", bio: ["Individual running coaching based on training history and the athlete’s goals."], link: "mailto:coach@example.test", source: { name: "Coach contact", url: "mailto:coach@example.test" }, verified: false };
const websiteProfile = { ...profile, slug: "website-coach", link: "https://coaching.example/", source: { name: "Coaching website", url: "https://coaching.example/" } };
const application = { name: "My coaching name", bio: "A personal coaching approach that should stay on my own account.", credentials: "My qualifications must stay as entered." };
const env = { MARKETPLACE_MODE: "pilot", MARKETPLACE_APP_URL: "http://localhost:3010", MARKETPLACE_DATABASE_URL: "postgresql://localhost/merge_fixture", NEXT_PUBLIC_SUPABASE_URL: "https://example.test", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture" };
const globals = { process: { env }, Request, Response };
async function fixture(t) {
  const db = new PGlite(); t.after(() => db.close());
  for (const name of ["002_marketplace.sql", "006_coach_storefronts.sql", "016_service_deletion.sql", "017_coach_profile_merges.sql", "017_coach_profile_merges.sql"]) await db.exec(readFileSync(new URL(`../db/migrations/${name}`, import.meta.url), "utf8"));
  const state = { catalog: [profile, websiteProfile], authenticated: actor };
  class Pool { on() {} query = (sql, values) => db.query(sql, values); async connect() { return { query: this.query, release() {} }; } }
  const mocks = { "server-only": {}, pg: { Pool }, "@/data/coaches": { COACHES: [profile, websiteProfile] }, "./coaches": { getAllCoachesWithDiscovered: async () => state.catalog }, "@/lib/marketplace-notifications": { notifyMarketplaceReview: async () => {} } };
  const cache = new Map();
  const store = load("src/lib/coach-profile-merge-store.ts", mocks, globals, cache);
  const config = load("src/lib/marketplace-config.ts", mocks, globals, cache);
  const { POST } = load("src/app/api/marketplace/coach-profile-merge/route.ts", { ...mocks, "@/lib/marketplace-auth": { requireMarketplaceActor: async () => { if (!state.authenticated) throw new config.MarketplaceError("Sign in.", 401); return state.authenticated; } } }, globals, cache);
  const post = (body, origin = env.MARKETPLACE_APP_URL, type = "application/json") => POST(new Request(`${env.MARKETPLACE_APP_URL}/api/marketplace/coach-profile-merge`, { method: "POST", headers: { origin, "content-type": type }, body: typeof body === "string" ? body : JSON.stringify(body) }));
  const createCoach = async (person = actor, status = "approved") => db.query("INSERT INTO marketplace_coaches(user_id,name,bio,credentials,status) VALUES($1,$2,$3,$4,$5)", [person.id, application.name, application.bio, application.credentials, status]);
  return { db, state, store, post, createCoach };
}

test("merge input uses exact normalized emails and accepts no identity, ownership or approval fields", () => {
  const { normalizeCoachEmail, directoryContactEmail, parseCoachProfileMerge: parse } = load("src/lib/coach-profile-merge-input.ts", { "server-only": {} });
  assert.equal(normalizeCoachEmail(" COACH@Example.test "), actor.email);
  assert.notEqual(normalizeCoachEmail("c.oach@example.test"), actor.email);
  assert.notEqual(normalizeCoachEmail("coach+extra@example.test"), actor.email);
  assert.equal(directoryContactEmail("MAILTO:COACH%40example.test?subject=Coaching"), actor.email);
  for (const value of ["https://example.test/coach@example.test", "mailto:a@example.test,b@example.test", "mailto:%zz", "mailto:a,b@example.test"]) assert.equal(directoryContactEmail(value), null);
  assert.equal(parse({ slug: profile.slug, application }).application.name, application.name);
  for (const extra of [{ email: actor.email }, { coachId: actor.id }, { approved: true }, { admin: true }, { slug: "../review" }, { application: { ...application, status: "approved" } }, { application: { ...application, action: "review" } }]) assert.throws(() => parse({ slug: profile.slug, ...extra }));
});

test("matching uses stored contacts or published mailto, excludes hidden records, and never matches names", async (t) => {
  const f = await fixture(t);
  assert.deepEqual((await f.store.coachProfileMergeMatches(actor)).map((p) => p.slug), [profile.slug]);
  assert.equal((await f.store.coachProfileMergeMatches(other)).length, 0);
  await f.db.query("INSERT INTO coach_profile_contacts(directory_slug,email,updated_by) VALUES($1,$2,$3)", [websiteProfile.slug, actor.email, other.id]);
  assert.equal((await f.store.coachProfileMergeMatches(actor)).length, 2);
  await f.db.query("INSERT INTO coach_profile_contacts(directory_slug,email,updated_by) VALUES($1,$2,$3)", [profile.slug, other.email, other.id]);
  assert.deepEqual((await f.store.coachProfileMergeMatches(actor)).map((p) => p.slug), [websiteProfile.slug]);
  f.state.catalog = [];
  assert.equal((await f.store.coachProfileMergeMatches(actor)).length, 0);
});

test("new coach merge is pending, audited and idempotent; imported details become a private draft", async (t) => {
  const f = await fixture(t);
  const result = await f.store.mergeCoachProfile(actor, { slug: profile.slug, application });
  assert.equal(result.notification.kind, "coach");
  assert.equal((await f.db.query("SELECT status FROM marketplace_coaches WHERE user_id=$1", [actor.id])).rows[0].status, "pending");
  assert.equal((await f.store.publicCoachProfileMerges()).length, 0);
  assert.equal((await f.store.coachProfileMergeMatches(actor)).length, 0);
  const { rows: [draft] } = await f.db.query("SELECT * FROM marketplace_storefronts WHERE coach_id=$1", [actor.id]);
  assert.equal(draft.published, false); assert.equal(draft.location, profile.location); assert.equal(draft.specialties[0], "Marathon");
  assert.equal((await f.store.mergeCoachProfile(actor, { slug: profile.slug, application })).saved, true);
  assert.equal((await f.db.query("SELECT count(*)::int AS n FROM marketplace_audit WHERE action='coach-profile:merge'")).rows[0].n, 1);
  await f.db.query("UPDATE marketplace_coaches SET status='approved' WHERE user_id=$1", [actor.id]);
  const [publicLink] = await f.store.publicCoachProfileMerges();
  assert.deepEqual(Object.keys(publicLink).sort(), ["directory_slug", "status", "storefront_slug"]);
  assert.equal(publicLink.directory_slug, profile.slug); assert.equal(publicLink.storefront_slug, null);
  await f.db.query("UPDATE marketplace_storefronts SET published=true WHERE coach_id=$1", [actor.id]);
  assert.equal((await f.store.publicCoachProfileMerges())[0].storefront_slug, profile.slug);
  await f.db.query("UPDATE marketplace_coaches SET status='suspended' WHERE user_id=$1", [actor.id]);
  assert.equal((await f.store.publicCoachProfileMerges())[0].status, "suspended");
});

test("existing accounts retain their introduction, services and storefront; competing owners cannot take the profile", async (t) => {
  const f = await fixture(t); await f.createCoach();
  await f.db.query("INSERT INTO marketplace_storefronts(coach_id,slug,headline,location,specialties,approach,published) VALUES($1,'my-profile','My own profile introduction','My location','[]','My own approach should be preserved when merging.',true)", [actor.id]);
  await f.store.mergeCoachProfile(actor, { slug: profile.slug });
  const { rows: [coach] } = await f.db.query("SELECT name,bio,credentials FROM marketplace_coaches WHERE user_id=$1", [actor.id]);
  assert.equal(coach.name, application.name); assert.equal(coach.bio, application.bio); assert.equal(coach.credentials, application.credentials);
  assert.equal((await f.db.query("SELECT slug FROM marketplace_storefronts WHERE coach_id=$1", [actor.id])).rows[0].slug, "my-profile");
  await assert.rejects(f.store.mergeCoachProfile(other, { slug: profile.slug }), (e) => e.status === 404);
  await assert.rejects(f.store.mergeCoachProfile(actor, { slug: websiteProfile.slug }), (e) => e.status === 404);
});

test("merge failures roll back application creation and cannot promote suspended coaches", async (t) => {
  const f = await fixture(t);
  await f.db.exec("CREATE FUNCTION fail_merge_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='coach-profile:merge' THEN RAISE EXCEPTION 'fixture failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_merge BEFORE INSERT ON marketplace_audit FOR EACH ROW EXECUTE FUNCTION fail_merge_audit()");
  await assert.rejects(f.store.mergeCoachProfile(actor, { slug: profile.slug, application }), /fixture failure/);
  assert.equal((await f.db.query("SELECT count(*)::int AS n FROM marketplace_coaches")).rows[0].n, 0);
  assert.equal((await f.db.query("SELECT count(*)::int AS n FROM coach_profile_merges")).rows[0].n, 0);
  await f.createCoach(actor, "suspended");
  await assert.rejects(f.store.mergeCoachProfile(actor, { slug: profile.slug }), (e) => e.status === 403);
});

test("merge endpoint rejects CSRF, missing sessions, forged fields and mismatched email before any ownership write", async (t) => {
  const f = await fixture(t);
  const body = { slug: profile.slug, application };
  assert.equal((await f.post(body, "https://attacker.test")).status, 403);
  f.state.authenticated = null;
  assert.equal((await f.post(body)).status, 401);
  f.state.authenticated = actor;
  assert.equal((await f.post(body, env.MARKETPLACE_APP_URL, "text/plain")).status, 415);
  assert.equal((await f.post("{")).status, 400);
  assert.equal((await f.post({ ...body, email: actor.email })).status, 400);
  f.state.authenticated = other;
  assert.equal((await f.post(body)).status, 404);
  f.state.authenticated = actor;
  const response = await f.post(body);
  assert.equal(response.status, 200); assert.match(response.headers.get("cache-control"), /private, no-store/);
  assert.deepEqual(await response.json(), { saved: true });
});

test("merge storage denies direct browser-role access and cannot leak private contacts through public links", async (t) => {
  const f = await fixture(t);
  await f.db.exec("CREATE ROLE anon; CREATE ROLE authenticated;");
  await f.db.exec(readFileSync(new URL("../db/migrations/017_coach_profile_merges.sql", import.meta.url), "utf8"));
  const { rows } = await f.db.query("SELECT c.relrowsecurity,has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS anon_access,has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS authenticated_access FROM pg_class c WHERE c.relname IN ('coach_profile_contacts','coach_profile_merges')");
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.relrowsecurity && !row.anon_access && !row.authenticated_access));
});
