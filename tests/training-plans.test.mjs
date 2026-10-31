import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { load } from "./support/load-module.mjs";
const coach = { id: "coach", email: "coach@example.test", admin: false };
const athlete = { id: "athlete", email: "athlete@example.test", admin: false };
const other = { id: "other", email: "other@example.test", admin: true };
const outsider = { id: "outsider", email: "outsider@example.test", admin: true };
const details = (extra = {}) => ({ title: "Easy run", sport: "run", notes: "Comfortable effort", plannedMinutes: 40, plannedKm: null, actualMinutes: null, actualKm: null, effort: null, status: "planned", ...extra });
const step = (extra = {}) => ({ kind: "work", unit: "minutes", amount: 3, target: "effort", low: 4, high: 6, notes: "Relax", ...extra });
const structure = () => [{ repeat: 1, steps: [step({ kind: "warmup", amount: 10 })] }, { repeat: 6, steps: [step(), step({ kind: "recovery", amount: 1, target: "none", low: null, high: null })] }, { repeat: 1, steps: [step({ kind: "cooldown", amount: 10 })] }];
const workout = (extra = {}) => ({ ...details(), id: randomUUID(), kind: "workout", date: "2026-10-12", version: 0, ...extra });
const session = (day = 0, extra = {}) => ({ id: randomUUID(), day, workout: details(extra) });
const plan = (extra = {}) => ({ id: randomUUID(), version: 0, title: "Two-week foundation", description: "Build a repeatable training routine.", weeks: 2, sessions: [session(0, { structure: structure() }), session(3), session(7)], ...extra });
async function fixture(t) {
  const db = new PGlite(); t.after(() => db.close());
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated");
  for (const name of ["002_marketplace", "008_training_workspace", "009_training_coaching", "010_structured_training_plans", "010_structured_training_plans"]) await db.exec(readFileSync(new URL(`../db/migrations/${name}.sql`, import.meta.url), "utf8"));
  for (const c of [coach, outsider]) await db.query("INSERT INTO marketplace_coaches(user_id,name,bio,credentials,status) VALUES($1,$1,$2,'Experienced coach','approved')", [c.id, "Coaching biography with enough information for testing."]);
  class Pool { on() {} query = (sql, params) => db.query(sql, params); async connect() { return { query: this.query, release() {} }; } }
  let actor = coach;
  const env = { TRAINING_WORKSPACE: "on", MARKETPLACE_MODE: "pilot", MARKETPLACE_APP_URL: "http://localhost:3010", MARKETPLACE_DATABASE_URL: "postgresql://localhost/fixture", NEXT_PUBLIC_SUPABASE_URL: "https://fixture.test", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture" };
  const mocks = { "server-only": {}, pg: { Pool }, "@/lib/marketplace-auth": { requireMarketplaceActor: async () => actor } };
  const globals = { Request, Response, process: { env } }; const cache = new Map();
  const get = (file) => load(file, mocks, globals, cache);
  const store = get("src/lib/training-plans-store.ts"); const { parsePlanAction } = get("src/lib/training-plans-input.ts");
  const training = get("src/lib/training-store.ts"); const { parseTrainingAction } = get("src/lib/training-input.ts"); const { trainingInputEntry } = get("src/lib/training.ts");
  const coaching = get("src/lib/training-coaching-store.ts");
  const mutate = (body, who = coach) => store.writeTrainingPlan(who, parsePlanAction(body));
  const save = async (p, who = coach) => (await mutate({ action: "save", plan: p }, who)).plan;
  const routes = get("src/app/api/marketplace/training/plans/route.ts");
  const links = [];
  for (const who of [athlete, other]) {
    const id = randomUUID(); links.push(id);
    await coaching.writeTrainingCoaching(coach, { action: "invite", id, name: who.id, email: who.email });
    await coaching.writeTrainingCoaching(who, { action: "accept", id, version: 1 });
  }
  const assign = (p, extra = {}) => ({ action: "assign", id: randomUUID(), planId: p.id, version: p.version, startDate: "2026-10-12", athletes: links, ...extra });
  const read = (who = athlete, from = "2026-10-12", to = "2026-10-25") => training.readTraining(who, from, to);
  const saveWorkout = (entry, who = athlete) => training.writeTraining(who, parseTrainingAction({ action: "save", entry: trainingInputEntry(entry) }));
  const post = async (body, who = coach, origin = env.MARKETPLACE_APP_URL) => { actor = who; return routes.POST(new Request(`${env.MARKETPLACE_APP_URL}/api/marketplace/training/plans`, { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) })); };
  const readHTTP = async (query = "", who = coach) => { actor = who; return routes.GET(new Request(`${env.MARKETPLACE_APP_URL}/api/marketplace/training/plans${query}`)); };
  return { db, store, training, coaching, get, globals, parsePlanAction, mutate, save, assign, read, saveWorkout, links, post, readHTTP, trainingInputEntry };
}

test("structured steps validate targets, repeats and payload bounds and derive complete totals only", () => {
  const { parseTrainingAction: parse } = load("src/lib/training-input.ts", { "server-only": {} });
  const { structureTotals, structureText } = load("src/lib/workout-structure.ts");
  const result = parse({ action: "save", entry: workout({ structure: structure() }) }).entry;
  assert.equal(result.plannedMinutes, 44); assert.equal(structureTotals(result.structure).count, 14);
  assert.match(structureText(result.structure), /6×/);
  const mixed = [{ repeat: 2, steps: [step({ unit: "km", amount: 0.4, target: "pace", low: 270, high: 300 }), step({ kind: "recovery", amount: 2 })] }];
  const parsed = parse({ action: "save", entry: workout({ plannedMinutes: null, plannedKm: null, structure: mixed }) }).entry;
  assert.equal(parsed.plannedMinutes, null); assert.equal(parsed.plannedKm, null);
  assert.match(structureText(mixed), /4:30–5:00/);
  const distances = [{ repeat: 4, steps: [step({ unit: "km", amount: 1 })] }];
  assert.equal(parse({ action: "save", entry: workout({ structure: distances }) }).entry.plannedKm, 4);
  for (const bad of [
    [{ repeat: 0, steps: [step()] }], [{ repeat: 1.5, steps: [step()] }], [{ repeat: 31, steps: [step()] }],
    [{ repeat: 1, steps: [] }], [{ repeat: 1, steps: [step({ unit: "open", amount: 3 })] }],
    [{ repeat: 1, steps: [step({ low: 9, high: 2 })] }], [{ repeat: 1, steps: [step({ target: "pace", low: 30, high: 300 })] }],
    [{ repeat: 1, steps: [step({ target: "heartRate", low: 0, high: 900 })] }], [{ repeat: 1, steps: [step({ target: "none", low: 1 })] }],
    [{ repeat: 1, steps: [step({ notes: "x".repeat(81) })] }], [{ repeat: 1, steps: [step({ actualMinutes: 2 })] }],
    [{ repeat: 30, steps: Array.from({ length: 7 }, () => step()) }], [{ repeat: 1, steps: Array.from({ length: 25 }, () => step()) }],
  ]) assert.throws(() => parse({ action: "save", entry: workout({ structure: bad }) }), undefined, JSON.stringify(bad));
  assert.throws(() => parse({ action: "save", entry: workout({ plannedKm: 0.1, structure: mixed }) }), /smaller/);
  assert.throws(() => parse({ action: "save", entry: workout({ notes: "界".repeat(1000), structure: [{ repeat: 1, steps: Array.from({ length: 24 }, () => step({ notes: "界".repeat(80) })) }] }) }), /too large/);
});

test("structured calendar and library saves remain repeat-safe and preserve instructions on Strava matching", async (t) => {
  const f = await fixture(t); const input = workout({ structure: structure() });
  const saved = (await f.saveWorkout(input)).entry;
  assert.equal(saved.plannedMinutes, 44);
  assert.equal((await f.saveWorkout(input)).entry.version, 1);
  const lib = (await f.saveWorkout({ ...input, id: randomUUID(), kind: "template", date: null })).entry;
  assert.equal(lib.structure[1].repeat, 6);
  const { importTraining, parseTrainingImport } = f.get("src/lib/training-import.ts");
  const item = { sourceId: "strava-file:98765", entry: workout({ notes: "", plannedMinutes: null, plannedKm: null, status: "completed", actualMinutes: 47, actualKm: 8 }), match: { id: saved.id, version: 1 } };
  const result = await importTraining(athlete, parseTrainingImport({ activities: [item] }));
  assert.equal(result.entries[0].structure[1].repeat, 6); assert.equal(result.entries[0].plannedMinutes, 44);
  assert.equal((await f.read()).entries[0].actualMinutes, 47);
});

test("plan drafts persist with ownership, versions and retry safety through HTTP", async (t) => {
  const f = await fixture(t); const p = plan();
  assert.equal((await f.post({ action: "save", plan: p })).status, 200);
  const saved = await f.save(p); assert.equal(saved.version, 1); assert.equal(saved.sessions[0].workout.plannedMinutes, 44);
  const listResponse = await f.readHTTP(); assert.match(listResponse.headers.get("cache-control"), /private, no-store/);
  const list = await listResponse.json(); assert.equal(list.plans[0].sessionCount, 3); assert.equal(list.plans[0].sessions, undefined);
  const read = await f.readHTTP(`?id=${p.id}`); assert.equal((await read.json()).plan.title, p.title);
  assert.equal((await f.readHTTP(`?id=${p.id}`, outsider)).status, 404);
  assert.equal((await f.readHTTP("", athlete)).status, 403);
  const edited = await f.save({ ...saved, title: "Updated template" }); assert.equal(edited.version, 2);
  await assert.rejects(f.save({ ...saved, description: "Stale changes" }), (e) => e.status === 409);
  await f.mutate({ action: "delete", id: p.id, version: 1 }, outsider);
  assert.equal((await f.store.readTrainingPlan(coach, p.id)).version, 2);
});

test("preview and atomic group assignment preserve dates and steps; template edits cannot change assigned copies", async (t) => {
  const f = await fixture(t); const p = await f.save(plan()); const request = f.assign(p);
  const { id, ...previewBody } = request; void id;
  const preview = await f.mutate({ ...previewBody, action: "preview" });
  assert.equal(preview.preview.endDate, "2026-10-25"); assert.equal(preview.preview.totalWorkouts, 6);
  assert.equal((await f.read()).entries.length, 0);
  const before = (await f.db.query("SELECT writes FROM training_usage WHERE user_id=$1", [coach.id])).rows[0].writes;
  assert.equal((await f.mutate(request)).workouts, 6);
  const rows = (await f.read()).entries; assert.equal(rows.length, 3);
  assert.deepEqual([...rows.map((e) => e.date)].sort(), ["2026-10-12", "2026-10-15", "2026-10-19"]);
  assert.equal(rows[0].structure[1].repeat, 6); assert.equal(rows[0].assignedBy, coach.id); assert.equal(rows[0].planTitle, p.title);
  assert.equal((await f.read(other)).entries.length, 3);
  assert.equal((await f.db.query("SELECT writes FROM training_usage WHERE user_id=$1", [coach.id])).rows[0].writes, before + 6);
  assert.equal((await f.mutate(request)).replayed, true);
  assert.equal((await f.db.query("SELECT writes FROM training_usage WHERE user_id=$1", [coach.id])).rows[0].writes, before + 6);
  await f.save({ ...p, title: "Renamed", sessions: p.sessions.map((s) => ({ ...s, workout: { ...s.workout, title: "Different workout" } })) });
  assert.equal((await f.read()).entries[0].title, "Easy run"); assert.equal((await f.mutate(request)).replayed, true);
  await assert.rejects(f.mutate({ ...request, startDate: "2026-10-13" }), (e) => e.status === 409);
  await assert.rejects(f.mutate(f.assign({ ...p, version: 2 })), /already assigned/);
});

test("removing assignments preserves completed, skipped and unrelated workouts, even after template deletion", async (t) => {
  const f = await fixture(t); const p = await f.save(plan()); const request = f.assign(p); await f.mutate(request);
  const entries = (await f.read()).entries;
  await f.saveWorkout({ ...entries[0], status: "completed", actualMinutes: 45 });
  await f.saveWorkout({ ...entries[1], status: "skipped" });
  const personal = (await f.saveWorkout(workout({ title: "Personal run" }))).entry;
  await f.mutate({ action: "delete", id: p.id, version: 1 });
  assert.equal((await f.mutate(request)).replayed, true);
  const history = await f.store.readTrainingPlans(coach);
  const assignment = history.assignments.find((a) => a.relationshipId === f.links[0]);
  await assert.rejects(f.mutate({ action: "remove", id: assignment.id }, outsider), (e) => e.status === 404);
  const result = await f.mutate({ action: "remove", id: assignment.id }); assert.equal(result.removed, 1);
  assert.equal((await f.mutate({ action: "remove", id: assignment.id })).removed, 0);
  const remaining = (await f.read()).entries;
  assert.equal(remaining.length, 3); assert.ok(remaining.some((e) => e.id === personal.id));
  assert.ok(remaining.some((e) => e.status === "completed")); assert.ok(remaining.some((e) => e.status === "skipped"));
  assert.equal((await f.read(other)).entries.length, 3);
  assert.equal((await f.mutate(request)).removed, 1);
});

test("preview is revalidated on save: expired access, changed plans, quotas and full days cannot leave partial plans", async (t) => {
  const f = await fixture(t); const p = await f.save(plan());
  await f.saveWorkout(workout(), other);
  await f.db.query(`INSERT INTO training_entries(user_id,id,kind,scheduled_date,details) SELECT $1,gen_random_uuid(),kind,scheduled_date,details FROM training_entries CROSS JOIN generate_series(1,19) WHERE user_id=$1`, [other.id]);
  await assert.rejects(f.mutate(f.assign(p)), /20 workouts/);
  assert.equal((await f.read()).entries.length, 0);
  assert.equal((await f.db.query("SELECT count(*)::int AS n FROM training_plan_assignments")).rows[0].n, 0);
  await f.db.query("DELETE FROM training_entries WHERE user_id=$1", [other.id]);
  await f.db.query("UPDATE training_usage SET writes=19999 WHERE user_id=$1", [coach.id]);
  await assert.rejects(f.mutate(f.assign(p)), (e) => e.status === 429);
  assert.equal((await f.read()).entries.length, 0);
  await f.db.query("UPDATE training_usage SET writes=0 WHERE user_id=$1", [coach.id]);
  const action = f.assign(p); const { id, ...review } = action; void id;
  await f.mutate({ ...review, action: "preview" });
  await f.save({ ...p, description: "New instructions" });
  await assert.rejects(f.mutate(action), /plan changed/);
  await f.coaching.writeTrainingCoaching(other, { action: "revoke", id: f.links[1], version: 2 });
  await assert.rejects(f.mutate(f.assign({ ...p, version: 2 })), (e) => e.status === 403);
  assert.equal((await f.read()).entries.length, 0);
});

test("database failure during the bulk insert rolls back receipts, every athlete and the usage charge", async (t) => {
  const f = await fixture(t); const p = await f.save(plan());
  const before = (await f.db.query("SELECT writes FROM training_usage WHERE user_id=$1", [coach.id])).rows[0].writes;
  await f.db.exec(`CREATE FUNCTION fail_plan_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.user_id='other' THEN RAISE EXCEPTION 'simulated database failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_plan_insert BEFORE INSERT ON training_entries FOR EACH ROW EXECUTE FUNCTION fail_plan_insert();`);
  await assert.rejects(f.mutate(f.assign(p)), /simulated database failure/);
  assert.equal((await f.read()).entries.length, 0);
  assert.equal((await f.db.query("SELECT count(*)::int AS n FROM training_plan_assignments")).rows[0].n, 0);
  assert.equal((await f.db.query("SELECT writes FROM training_usage WHERE user_id=$1", [coach.id])).rows[0].writes, before);
});

test("plan limits bound template payloads, copies, calendars and retained records", async (t) => {
  const f = await fixture(t);
  const many = await f.save(plan({ weeks: 24, sessions: Array.from({ length: 168 }, (_, day) => session(day)) }));
  const third = { id: "third", email: "third@example.test", admin: false }; const link = randomUUID();
  await f.coaching.writeTrainingCoaching(coach, { action: "invite", id: link, name: "Third", email: third.email });
  await f.coaching.writeTrainingCoaching(third, { action: "accept", id: link, version: 1 });
  await assert.rejects(f.mutate(f.assign(many, { athletes: [...f.links, link] })), /at most 2/);
  await assert.rejects(f.mutate(f.assign(many, { startDate: "2100-12-20" })), /whole plan/);
  assert.throws(() => f.parsePlanAction({ action: "save", plan: plan({ weeks: 1 }) }), /within/);
  assert.throws(() => f.parsePlanAction({ action: "save", plan: plan({ weeks: 25 }) }), /24 weeks/);
  assert.throws(() => f.parsePlanAction({ action: "save", plan: plan({ sessions: Array.from({ length: 169 }, () => session()) }) }), /168/);
  assert.throws(() => f.parsePlanAction({ action: "save", plan: plan({ sessions: [session(0, { status: "completed" })] }) }), /planned/);
  assert.throws(() => f.parsePlanAction({ action: "save", plan: plan({ sessions: [session(0, { assignedBy: coach.id })] }) }));
  assert.throws(() => f.parsePlanAction({ action: "save", plan: plan({ weeks: 24, sessions: Array.from({ length: 168 }, (_, day) => session(day, { notes: "界".repeat(1000) })) }) }), /too large/);
  await f.db.query("INSERT INTO training_plans(coach_id,id,title,description,weeks,sessions) SELECT $1,gen_random_uuid(),'Template','',1,'[]'::jsonb FROM generate_series(1,49)", [coach.id]);
  await assert.rejects(f.save(plan()), /50 plans/);
  await f.db.query("DELETE FROM training_plans WHERE coach_id=$1 AND id<>$2", [coach.id, many.id]);
  const empty = await f.save(plan({ sessions: [] }));
  await assert.rejects(f.mutate(f.assign(empty)), /at least one/);
});

test("assignment history paginates without returning plan bodies, and browser database roles have no access", async (t) => {
  const f = await fixture(t); const p = await f.save(plan({ sessions: [session()] }));
  for (let day = 1; day <= 11; day++) await f.mutate(f.assign(p, { startDate: `2026-11-${String(day).padStart(2, "0")}` }));
  const first = await f.store.readTrainingPlans(coach); assert.equal(first.assignments.length, 20); assert.ok(first.nextCursor);
  const next = await f.store.readTrainingPlans(coach, first.nextCursor); assert.equal(next.assignments.length, 2); assert.equal(next.nextCursor, null);
  assert.equal(new Set([...first.assignments, ...next.assignments].map((a) => a.id)).size, 22);
  await assert.rejects(f.store.readTrainingPlans(outsider, first.nextCursor), (e) => e.status === 404);
  for (const role of ["anon", "authenticated"]) { await f.db.exec(`SET ROLE ${role}`); for (const table of ["training_plans", "training_plan_assignments"]) { await assert.rejects(f.db.query(`SELECT * FROM ${table}`), /permission denied/); await assert.rejects(f.db.query(`TRUNCATE ${table}`), /permission denied/); } await f.db.exec("RESET ROLE"); }
});

test("plan HTTP boundaries reject cross-origin, oversized, injected and suspended-coach requests", async (t) => {
  const f = await fixture(t); const p = plan();
  assert.equal((await f.post({ action: "save", plan: p }, coach, "https://evil.test")).status, 403);
  assert.equal((await f.post({ action: "save", plan: { ...p, coachId: outsider.id } })).status, 400);
  assert.equal((await f.post({ action: "save", plan: { ...p, description: "x".repeat(280000) } })).status, 413);
  assert.equal((await f.readHTTP("?id=invalid")).status, 400);
  const saved = await f.save(p); await f.mutate(f.assign(saved));
  const assignment = (await f.store.readTrainingPlans(coach)).assignments[0];
  await f.db.query("UPDATE marketplace_coaches SET status='suspended' WHERE user_id=$1", [coach.id]);
  assert.equal((await f.post({ action: "save", plan: p })).status, 403);
  assert.equal((await f.readHTTP()).status, 403);
  await assert.rejects(f.mutate({ action: "remove", id: assignment.id }), (e) => e.status === 403);
  f.globals.process.env.TRAINING_WORKSPACE = "off";
  assert.equal((await f.readHTTP()).status, 404);
});

test("lifetime workout and receipt limits reject new assignments without deleting history", async (t) => {
  const f = await fixture(t); const p = await f.save(plan());
  const sample = (await f.saveWorkout(workout())).entry;
  await f.db.query(`INSERT INTO training_entries(user_id,id,kind,scheduled_date,details) SELECT $1,gen_random_uuid(),'workout',DATE '2000-01-01'+(n/20)::int,details FROM training_entries CROSS JOIN generate_series(1,19999) n WHERE user_id=$1 AND id=$2`, [athlete.id, sample.id]);
  await assert.rejects(f.mutate(f.assign(p)), /storage allowance/);
  await f.db.query("DELETE FROM training_entries WHERE user_id=$1", [athlete.id]);
  await f.db.query(`INSERT INTO training_plan_assignments(id,coach_id,batch_id,athlete_id,relationship_id,plan_id,plan_version,plan_title,start_date,weeks,workout_count,request_hash)
    SELECT gen_random_uuid(),$1,gen_random_uuid(),$2,$3,$4,1,'Historic',DATE '2000-01-01'+n,1,1,'historic' FROM generate_series(1,2000) n`, [coach.id, athlete.id, f.links[0], p.id]);
  await assert.rejects(f.mutate(f.assign(p)), /retained plan-assignment allowance/);
  assert.equal((await f.db.query("SELECT count(*)::int AS n FROM training_plan_assignments")).rows[0].n, 2000);
});

test("relative plan days preserve leap dates and week boundaries without timezone shifts", () => {
  const { planDates } = load("src/lib/training-plans.ts");
  const dates = planDates(plan(), "2028-02-28").map((s) => s.date);
  assert.deepEqual([...dates], ["2028-02-28", "2028-03-02", "2028-03-06"]);
  assert.equal(planDates(plan(), "2026-12-28")[2].date, "2027-01-04");
});
