import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { load } from "./support/load-module.mjs";
const coach = { id: "coach", email: "coach@example.test", admin: false };
const athlete = { id: "athlete", email: "athlete@example.test", admin: false };
const other = { id: "other", email: "other@example.test", admin: true };
const coach2 = { id: "coach2", email: "coach2@example.test", admin: false };
const origin = "http://localhost:3010";
const workout = (extra = {}) => ({ id: randomUUID(), kind: "workout", date: "2026-10-12", version: 0, title: "Easy run", sport: "run", notes: "Keep it comfortable.", plannedMinutes: 40, plannedKm: 6, actualMinutes: null, actualKm: null, effort: null, status: "planned", ...extra });
async function fixture(t) {
  const db = new PGlite(); t.after(() => db.close());
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated");
  for (const name of ["002_marketplace", "008_training_workspace", "009_training_coaching", "010_structured_training_plans"]) await db.exec(readFileSync(new URL(`../db/migrations/${name}.sql`, import.meta.url), "utf8"));
  for (const c of [coach, coach2]) await db.query("INSERT INTO marketplace_coaches(user_id,name,bio,credentials,status) VALUES($1,$2,$3,$4,'approved')", [c.id, c.id, "Coaching biography with enough detail for testing.", "Experienced coach credentials"]);
  class Pool { on() {} query = (sql, params) => db.query(sql, params); async connect() { return { query: this.query, release() {} }; } }
  let actor = coach;
  const mocks = { "server-only": {}, pg: { Pool }, "@/lib/marketplace-auth": { requireMarketplaceActor: async () => actor } };
  const globals = { Request, Response, TextEncoder, process: { env: { TRAINING_WORKSPACE: "on", MARKETPLACE_MODE: "pilot", MARKETPLACE_APP_URL: origin, MARKETPLACE_DATABASE_URL: "postgresql://localhost/fixture", NEXT_PUBLIC_SUPABASE_URL: "https://fixture.test", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture" } } };
  const cache = new Map(); const loadModule = (path) => load(path, mocks, globals, cache);
  const store = loadModule("src/lib/training-store.ts");
  const coaching = loadModule("src/lib/training-coaching-store.ts");
  const { parseCoachingAction } = loadModule("src/lib/training-coaching-input.ts");
  const { parseTrainingAction } = loadModule("src/lib/training-input.ts");
  const { trainingInputEntry } = loadModule("src/lib/training.ts");
  const imports = loadModule("src/lib/training-import.ts");
  const routes = { coaching: loadModule("src/app/api/marketplace/training/coaching/route.ts"), training: loadModule("src/app/api/marketplace/training/route.ts"), import: loadModule("src/app/api/marketplace/training/import/route.ts") };
  const mutate = (who, input) => coaching.writeTrainingCoaching(who, parseCoachingAction(input));
  const invite = async (who = athlete, by = coach) => { const result = await mutate(by, { action: "invite", id: randomUUID(), name: who.id, email: who.email }); return result.invited; };
  const accept = (id, who = athlete, version = 1) => mutate(who, { action: "accept", id, version });
  const read = (who, id) => store.readTraining(who, "2026-10-12", "2026-10-18", id);
  const roster = (who) => coaching.readTrainingRoster(who, "2026-10-12", "2026-10-18");
  const save = (who, entry, id) => store.writeTraining(who, parseTrainingAction({ action: "save", entry: trainingInputEntry(entry) }), id);
  const importItems = (who, activities) => imports.importTraining(who, imports.parseTrainingImport({ activities }));
  const post = (route, who, body, query = "", requestOrigin = origin) => { actor = who; return routes[route].POST(new Request(`${origin}/api/marketplace/training/${route}${query}`, { method: "POST", headers: { origin: requestOrigin, "Content-Type": "application/json" }, body: JSON.stringify(body) })); };
  return { db, globals, store, mutate, invite, accept, read, roster, save, importItems, post, imports, loadModule };
}
const imported = (extra = {}) => ({ sourceId: "strava-file:123456789", entry: workout({ notes: "", plannedMinutes: null, plannedKm: null, status: "completed", actualMinutes: 42, actualKm: 6.2 }), match: null, ...extra });

test("coach invitation → athlete consent → assignment → results → roster → revoke works across HTTP and SQL", async (t) => {
  const f = await fixture(t);
  const invitation = { action: "invite", id: randomUUID(), name: "Runner One", email: athlete.email };
  assert.equal((await f.post("coaching", coach, invitation)).status, 200);
  assert.equal((await f.roster(athlete)).coaches[0].status, "pending");
  await assert.rejects(f.read(coach, invitation.id), (e) => e.status === 403);
  assert.equal((await f.post("coaching", other, { action: "accept", id: invitation.id, version: 1 })).status, 404);
  assert.equal((await f.post("coaching", athlete, { action: "accept", id: invitation.id, version: 1 })).status, 200);
  assert.equal((await f.post("coaching", athlete, { action: "accept", id: invitation.id, version: 1 })).status, 200);
  const entry = workout();
  assert.equal((await f.post("coaching", coach, { action: "assign", athletes: [invitation.id], entry })).status, 200);
  const assigned = (await f.read(athlete)).entries[0];
  assert.equal(assigned.assignedBy, coach.id); assert.equal(assigned.title, entry.title);
  assert.equal((await f.read(coach, invitation.id)).entries[0].coachCanEdit, true);
  const completed = await f.post("training", athlete, { action: "save", entry: { ...entry, version: 1, status: "completed", actualMinutes: 44, actualKm: 6.4, effort: 4 } });
  assert.equal(completed.status, 200);
  const roster = await f.roster(coach);
  assert.equal(roster.athletes[0].completed, 1); assert.equal(roster.athletes[0].actualMinutes, 44);
  assert.equal((await f.read(coach, invitation.id)).entries[0].coachCanEdit, false);
  assert.equal((await f.post("coaching", athlete, { action: "revoke", id: invitation.id, version: 2 })).status, 200);
  await assert.rejects(f.read(coach, invitation.id), (e) => e.status === 403);
  assert.equal((await f.read(athlete)).entries[0].actualMinutes, 44);
});

test("coach permissions exclude other coaches, private libraries, own-athlete results and admin bypass", async (t) => {
  const f = await fixture(t); const id = await f.invite(); await f.accept(id);
  const id2 = await f.invite(athlete, coach2); await f.accept(id2);
  const own = (await f.save(athlete, workout())).entry;
  const assigned = (await f.save(coach, workout(), id)).entry;
  await f.save(athlete, workout({ kind: "template", date: null, title: "Private library" }));
  await f.save(coach, workout({ kind: "template", date: null, title: "Coach library" }));
  assert.equal((await f.read(coach, id)).templates[0].title, "Coach library");
  await assert.rejects(f.save(coach, { ...own, title: "Intrusion" }, id), (e) => e.status === 403);
  await assert.rejects(f.save(coach2, { ...assigned, title: "Intrusion" }, id2), (e) => e.status === 403);
  await assert.rejects(f.save(coach, { ...assigned, status: "completed", actualMinutes: 40 }, id), (e) => e.status === 403);
  await assert.rejects(f.save(coach, workout({ kind: "template", date: null }), id), (e) => e.status === 403);
  await assert.rejects(f.read(other, id), (e) => e.status === 403);
  await f.save(coach, { ...assigned, title: "Adjusted plan" }, id);
  await f.db.query("UPDATE marketplace_coaches SET status='suspended' WHERE user_id=$1", [coach.id]);
  await assert.rejects(f.read(coach, id), (e) => e.status === 403);
  assert.equal((await f.roster(coach)).athletes.length, 0);
  await f.mutate(athlete, { action: "revoke", id, version: 2 });
});

test("expired, declined and revoked invitations require fresh consent and reject stale acceptance", async (t) => {
  const f = await fixture(t); const id = await f.invite();
  await f.db.query("UPDATE training_relationships SET expires_at=now()-interval '1 day' WHERE id=$1", [id]);
  assert.equal((await f.roster(athlete)).coaches.length, 0);
  await assert.rejects(f.accept(id), (e) => e.status === 403);
  assert.equal(await f.invite(), id);
  await assert.rejects(f.accept(id), (e) => e.status === 409);
  await f.mutate(athlete, { action: "decline", id, version: 2 });
  await f.invite(); await f.accept(id, athlete, 4);
  await f.db.query("UPDATE training_usage SET writes=20000,requests=60 WHERE user_id=$1", [athlete.id]);
  await f.mutate(athlete, { action: "revoke", id, version: 5 });
  await assert.rejects(f.read(coach, id), (e) => e.status === 403);
  await f.invite(); await assert.rejects(f.accept(id, athlete, 4), (e) => e.status === 409);
});

test("group assignment is atomic, repeatable and charged per athlete", async (t) => {
  const f = await fixture(t); const a = await f.invite(); const b = await f.invite(other); await f.accept(a); await f.accept(b, other);
  const entry = workout(); const action = { action: "assign", athletes: [a, b], entry };
  const before = (await f.db.query("SELECT writes FROM training_usage WHERE user_id=$1", [coach.id])).rows[0].writes;
  await f.mutate(coach, action); await f.mutate(coach, action);
  assert.equal((await f.read(athlete)).entries.length, 1); assert.equal((await f.read(other)).entries.length, 1);
  assert.equal((await f.db.query("SELECT writes FROM training_usage WHERE user_id=$1", [coach.id])).rows[0].writes, before + 4);
  await f.db.query("UPDATE training_usage SET writes=19999 WHERE user_id=$1", [coach.id]);
  await assert.rejects(f.mutate(coach, { ...action, entry: workout() }), (e) => e.status === 429);
  await f.db.query("UPDATE training_usage SET writes=0 WHERE user_id=$1", [coach.id]);
  await f.db.query(`INSERT INTO training_entries(user_id,id,kind,scheduled_date,details) SELECT $1,gen_random_uuid(),kind,scheduled_date,details FROM training_entries CROSS JOIN generate_series(1,19) WHERE user_id=$1`, [other.id]);
  await assert.rejects(f.mutate(coach, { ...action, entry: workout() }), /20 workouts/);
  assert.equal((await f.read(athlete)).entries.length, 1);
  await f.mutate(other, { action: "revoke", id: b, version: 2 });
  await assert.rejects(f.mutate(coach, { ...action, entry: workout({ date: "2026-10-13" }) }), (e) => e.status === 403);
  assert.equal((await f.read(athlete)).entries.length, 1);
});

test("coach and invitation capacity, body limits, cross origin and input injection are enforced", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.post("coaching", other, { action: "invite", id: randomUUID(), name: "Test", email: athlete.email })).status, 403);
  assert.equal((await f.post("coaching", coach, { action: "invite", id: randomUUID(), name: "Test", email: coach.email })).status, 400);
  assert.equal((await f.post("coaching", coach, { action: "assign", athletes: Array.from({ length: 21 }, () => randomUUID()), entry: workout() })).status, 400);
  assert.equal((await f.post("coaching", coach, { action: "assign", athletes: [randomUUID()], entry: workout({ assignedBy: coach.id }) })).status, 400);
  assert.equal((await f.post("coaching", coach, {}, "", "https://evil.test")).status, 403);
  assert.equal((await f.post("coaching", coach, { junk: "x".repeat(9000) })).status, 413);
  await f.db.query(`INSERT INTO training_relationships(id,coach_id,athlete_email,athlete_name) SELECT gen_random_uuid(),$1,'person'||n||'@example.test','Test' FROM generate_series(1,100) n`, [coach.id]);
  await assert.rejects(f.invite(), (e) => e.status === 429);
  for (const role of ["anon", "authenticated"]) { await f.db.exec(`SET ROLE ${role}`); await assert.rejects(f.db.query("SELECT * FROM training_relationships"), /permission denied/); await assert.rejects(f.db.query("TRUNCATE training_relationships"), /permission denied/); await f.db.exec("RESET ROLE"); }
});

test("Strava import matches assignments, preserves plans, deduplicates across retries, and remains owner-scoped", async (t) => {
  const f = await fixture(t); const id = await f.invite(); await f.accept(id);
  const plan = (await f.save(coach, workout(), id)).entry;
  const item = imported({ match: { id: plan.id, version: plan.version } });
  const response = await f.post("import", athlete, { activities: [item] });
  assert.equal(response.status, 200); assert.equal((await response.json()).imported, 1);
  const saved = (await f.read(athlete)).entries[0];
  assert.equal(saved.plannedMinutes, 40); assert.equal(saved.actualMinutes, 42); assert.equal(saved.notes, plan.notes); assert.equal(saved.assignedBy, coach.id); assert.equal(saved.sourceId, item.sourceId);
  const retry = await f.importItems(athlete, [item]); assert.equal(retry.imported, 0); assert.equal(retry.duplicates, 1);
  assert.equal((await f.read(coach, id)).entries[0].actualKm, 6.2);
  await assert.rejects(f.importItems(other, [item]), (e) => e.status === 409);
  await f.importItems(other, [imported()]); assert.equal((await f.read(other)).entries.length, 1);
  await assert.rejects(f.save(coach, { ...saved, title: "Overwrite" }, id), (e) => e.status === 403);
  await f.store.writeTraining(athlete, { action: "delete", id: saved.id, version: saved.version });
  await f.importItems(athlete, [imported()]); assert.equal((await f.read(athlete)).entries.length, 1);
});

test("import validation and stale matches roll back the entire batch without overwriting results", async (t) => {
  const f = await fixture(t);
  const plan = (await f.save(athlete, workout())).entry;
  const bad = imported({ sourceId: "strava-file:2", match: { id: plan.id, version: 5 } });
  await assert.rejects(f.importItems(athlete, [imported(), bad]), (e) => e.status === 409);
  assert.equal((await f.read(athlete)).entries.length, 1); assert.equal((await f.read(athlete)).entries[0].status, "planned");
  assert.equal((await f.post("import", athlete, { activities: [imported(), imported()] })).status, 400);
  assert.equal((await f.post("import", athlete, { activities: [imported({ sourceId: "forged:3" })] })).status, 400);
  assert.equal((await f.post("import", athlete, { activities: [imported()], ownerId: other.id })).status, 400);
  assert.equal((await f.post("import", athlete, { activities: [imported()] }, "", "https://evil.test")).status, 403);
  assert.equal((await f.post("import", athlete, { activities: [], junk: "x".repeat(65536) })).status, 413);
  await f.db.query("UPDATE training_usage SET writes=1999 WHERE user_id=$1", [athlete.id]);
  await assert.rejects(f.importItems(athlete, [imported(), imported({ sourceId: "strava-file:2" })]), (e) => e.status === 429);
  assert.equal((await f.read(athlete)).entries.length, 1);
  await f.db.query("UPDATE training_usage SET writes=0 WHERE user_id=$1", [athlete.id]);
  const noDistance = imported(); noDistance.entry.actualKm = null;
  const result = await f.importItems(athlete, [noDistance]);
  assert.equal(result.entries[0].actualKm, null);
});

test("Strava CSV handles quoted commas, duplicate distance headers, miles, local dates and invalid rows", () => {
  const { parseStravaExport, stravaEntry } = load("src/lib/training-strava.ts", {}, { TextEncoder });
  const header = "Activity ID,Activity Date,Activity Name,Activity Type,Elapsed Time,Distance,Distance";
  const csv = `\uFEFF${header}\r\n123,"Oct 12, 2026, 7:10:00 AM","Run, with friends",Run,2520,6.20,6200\r\n124,2026-10-13T23:00:00-08:00,Ride,Ride,3600,10,16093.44\r\n125,2026-02-30,Invalid,Run,10,0,0\r\n123,2026-10-12,Duplicate,Run,2520,6.20,6200`;
  const result = parseStravaExport(csv, "km");
  assert.equal(result.activities.length, 2); assert.equal(result.warnings.length, 2);
  assert.equal(result.activities[0].km, 6.2); assert.equal(result.activities[0].minutes, 42); assert.equal(result.activities[0].title, "Run, with friends");
  assert.equal(result.activities[1].date, "2026-10-13"); assert.equal(result.activities[1].sport, "bike");
  assert.equal(parseStravaExport(csv, "miles").activities[1].km, 16.09);
  const noDistance = parseStravaExport(`${header}\n126,2026-10-14,Strength,WeightTraining,1800,,`, "km");
  assert.equal(noDistance.activities[0].km, null); assert.equal(noDistance.activities[0].sport, "strength");
  assert.equal(stravaEntry(result.activities[0], randomUUID()).status, "completed");
  assert.throws(() => parseStravaExport("Name,Date\na,b", "km"), /English column/);
  assert.throws(() => parseStravaExport(`${header}\n"unclosed`, "km"), /quoted field/);
  assert.throws(() => parseStravaExport(`${header}\n"closed"oops`, "km"), /malformed/);
  assert.throws(() => parseStravaExport("a".repeat(5 * 1024 * 1024 + 1), "km"), /5 MB/);
  assert.throws(() => parseStravaExport(`${header}\n${"a,b,c,d,e,f,g\n".repeat(5001)}`, "km"), /5,000/);
});

test("approved coaches retain their library allowance after 2,000 assignments, while athlete links stay capped", async (t) => {
  const f = await fixture(t);
  await f.save(coach, workout({ kind: "template", date: null }));
  await f.db.query("UPDATE training_usage SET writes=2000 WHERE user_id=$1", [coach.id]);
  await f.save(coach, workout({ kind: "template", date: null }));
  await f.db.query("UPDATE training_usage SET writes=20000 WHERE user_id=$1", [coach.id]);
  await assert.rejects(f.save(coach, workout()), (e) => e.status === 429);
  await f.db.query("UPDATE training_usage SET writes=0 WHERE user_id=$1", [coach.id]);
  const id = await f.invite();
  for (let i = 0; i < 5; i++) {
    const c = `extra-coach-${i}`;
    await f.db.query("INSERT INTO marketplace_coaches(user_id,name,bio,credentials,status) VALUES($1,$1,$2,$3,'approved')", [c, "A sufficiently descriptive biography for this coach.", "Coaching experience"]);
    await f.db.query("INSERT INTO training_relationships(id,coach_id,athlete_email,athlete_name,athlete_id,status) VALUES($1,$2,$3,'Runner',$4,'active')", [randomUUID(), c, athlete.email, athlete.id]);
  }
  await assert.rejects(f.accept(id), (e) => e.status === 429);
  assert.equal((await f.roster(athlete)).coaches.filter((c) => c.status === "active").length, 5);
});
