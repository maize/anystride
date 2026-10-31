import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { load } from "./support/load-module.mjs";

const athlete = { id: "athlete-one", email: "one@example.test", admin: false };
const other = { id: "athlete-two", email: "two@example.test", admin: true };
const env = { TRAINING_WORKSPACE: "on", MARKETPLACE_MODE: "pilot", MARKETPLACE_APP_URL: "http://localhost:3010", MARKETPLACE_DATABASE_URL: "postgresql://localhost/training_test", NEXT_PUBLIC_SUPABASE_URL: "https://example.test", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture" };
const workout = (extra = {}) => ({ id: randomUUID(), kind: "workout", date: "2026-10-12", version: 0, title: "Easy run", sport: "run", notes: "Keep it comfortable.", plannedMinutes: 40, plannedKm: 6, actualMinutes: null, actualKm: null, effort: null, status: "planned", ...extra });
async function fixture(t) {
  const db = new PGlite();
  const sql = readFileSync(new URL("../db/migrations/008_training_workspace.sql", import.meta.url), "utf8");
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated;");
  await db.exec(readFileSync(new URL("../db/migrations/002_marketplace.sql", import.meta.url), "utf8"));
  await db.exec(sql); await db.exec(sql);
  const coachingSql = readFileSync(new URL("../db/migrations/009_training_coaching.sql", import.meta.url), "utf8");
  await db.exec(coachingSql); await db.exec(coachingSql);
  await db.exec(readFileSync(new URL("../db/migrations/010_structured_training_plans.sql", import.meta.url), "utf8"));
  t.after(() => db.close());
  class Pool { on() {} query = (sql, params) => db.query(sql, params); async connect() { return { query: this.query, release() {} }; } }
  const mocks = { "server-only": {}, pg: { Pool }, "@/lib/marketplace-auth": { requireMarketplaceActor: async () => athlete } };
  const globals = { process: { env: { ...env } }, Request, Response };
  const cache = new Map();
  const store = load("src/lib/training-store.ts", mocks, globals, cache);
  const { parseTrainingAction: parse } = load("src/lib/training-input.ts", mocks, globals, cache);
  const route = load("src/app/api/marketplace/training/route.ts", mocks, globals, cache);
  const { trainingInputEntry } = load("src/lib/training.ts", mocks, globals, cache);
  return { db, store, parse, route, globals, save: (entry, actor = athlete) => store.writeTraining(actor, parse({ action: "save", entry: trainingInputEntry(entry) })), read: (actor = athlete) => store.readTraining(actor, "2026-10-12", "2026-10-18") };
}

test("training input rejects ownership injection, invalid dates, metrics and template results", () => {
  const { parseTrainingAction: parse, trainingRange } = load("src/lib/training-input.ts", { "server-only": {} });
  assert.equal(parse({ action: "save", entry: workout() }).entry.title, "Easy run");
  for (const extra of [{ userId: other.id }, { date: "2026-02-30" }, { date: "1999-12-31" }, { notes: "a".repeat(1001) }, { title: "\n" }, { sport: "unknown" }, { version: -1 }, { plannedMinutes: NaN }, { plannedKm: "6" }, { effort: 0 }, { actualKm: 7 }, { kind: "template", date: "2026-10-12" }, { kind: "template", date: null, status: "completed" }]) {
    assert.throws(() => parse({ action: "save", entry: workout(extra) }), undefined, JSON.stringify(extra));
  }
  assert.throws(() => trainingRange("2026-10-01", "2026-11-01"));
  assert.throws(() => trainingRange("2026-11-01", "2026-10-01"));
  assert.equal(trainingRange("2026-10-01", "2026-10-31").to, "2026-10-31");
});

test("create, retry, reschedule, log results, conflict and delete persist with account isolation", async (t) => {
  const f = await fixture(t);
  const input = workout();
  const first = (await f.save(input)).entry;
  assert.equal(first.version, 1);
  assert.equal((await f.save(input)).entry.version, 1);
  assert.equal((await f.read()).entries.length, 1);
  assert.equal((await f.read(other)).entries.length, 0);
  await assert.rejects(f.save({ ...first, title: "Hijacked" }, other), /removed/);
  await f.store.writeTraining(other, { action: "delete", id: first.id, version: 1 });
  assert.equal((await f.read()).entries.length, 1);
  const changed = { ...first, date: "2026-10-14", status: "completed", actualMinutes: 42, actualKm: 6.3, effort: 4 };
  const saved = (await f.save(changed)).entry;
  assert.equal(saved.version, 2);
  assert.equal((await f.save(changed)).entry.version, 2);
  await assert.rejects(f.save({ ...first, title: "Stale edit" }), /another session/);
  assert.equal((await f.read()).entries[0].actualKm, 6.3);
  await assert.rejects(f.store.writeTraining(athlete, { action: "delete", id: first.id, version: 1 }), /another session/);
  await f.store.writeTraining(athlete, { action: "delete", id: first.id, version: 2 });
  await f.store.writeTraining(athlete, { action: "delete", id: first.id, version: 2 });
  assert.equal((await f.read()).entries.length, 0);
});

test("library copies do not inherit results or change the original", async (t) => {
  const f = await fixture(t);
  const template = (await f.save(workout({ kind: "template", date: null }))).entry;
  const copy = (await f.save({ ...template, id: randomUUID(), version: 0, kind: "workout", date: "2026-10-12" })).entry;
  await f.save({ ...copy, status: "completed", actualMinutes: 35, actualKm: 6, effort: 3 });
  const result = await f.read();
  assert.equal(result.templates[0].status, "planned");
  assert.equal(result.templates[0].actualMinutes, null);
  assert.equal(result.entries[0].actualMinutes, 35);
  assert.equal((await f.read(other)).templates.length, 0);
});

test("durable monthly and burst quotas reset, stay bounded, and keep saved data", async (t) => {
  const f = await fixture(t);
  const saved = (await f.save(workout())).entry;
  await f.db.query("UPDATE training_usage SET writes=2000 WHERE user_id=$1", [athlete.id]);
  await assert.rejects(f.save(workout()), (error) => error.status === 429);
  assert.equal((await f.read()).entries.length, 1);
  await f.db.query("UPDATE training_usage SET reads=10000 WHERE user_id=$1", [athlete.id]);
  await assert.rejects(f.read(), (error) => error.status === 429);
  await f.db.query("UPDATE training_usage SET month='2000-01-01',minute=now()-interval '2 minutes',requests=60 WHERE user_id=$1", [athlete.id]);
  const reset = await f.read();
  assert.equal(reset.usage.reads, 1); assert.equal(reset.usage.writes, 0);
  await f.db.query("UPDATE training_usage SET requests=60,minute=date_trunc('minute',now()) WHERE user_id=$1", [athlete.id]);
  await assert.rejects(f.save({ ...saved, title: "Blocked burst" }), (error) => error.status === 429);
  assert.equal((await f.db.query("SELECT count(*)::int AS count FROM training_usage")).rows[0].count, 1);
  assert.equal((await f.db.query("SELECT details->>'title' AS title FROM training_entries")).rows[0].title, "Easy run");
});

test("daily and library capacity limits prevent unbounded collections", async (t) => {
  const f = await fixture(t);
  const sample = (await f.save(workout())).entry;
  await f.db.query(`INSERT INTO training_entries(user_id,id,kind,scheduled_date,details)
    SELECT $1,gen_random_uuid(),'workout','2026-10-12',details FROM training_entries CROSS JOIN generate_series(1,19) WHERE id=$2`, [athlete.id, sample.id]);
  await assert.rejects(f.save(workout()), /20 workouts/);
  await f.save({ ...sample, title: "Editing a full day is allowed" });
  await f.db.query(`INSERT INTO training_entries(user_id,id,kind,details)
    SELECT $1,gen_random_uuid(),'template',details FROM training_entries CROSS JOIN generate_series(1,100) WHERE id=$2`, [athlete.id, sample.id]);
  await assert.rejects(f.save(workout({ kind: "template", date: null })), /storage allowance/);
  const row = (await f.db.query("SELECT id FROM training_entries WHERE kind='template' LIMIT 1")).rows[0];
  await f.store.writeTraining(athlete, { action: "delete", id: row.id, version: 1 });
  await f.save(workout({ kind: "template", date: null }));
  assert.equal((await f.read()).templates.length, 100);
  await f.db.query(`INSERT INTO training_entries(user_id,id,kind,scheduled_date,details)
    SELECT $1,gen_random_uuid(),'workout',DATE '2000-01-01'+(n/20)::int,details FROM training_entries CROSS JOIN generate_series(1,19980) n WHERE id=$2`, [athlete.id, sample.id]);
  await assert.rejects(f.save(workout({ date: "2026-10-13" })), /storage allowance/);
});

test("HTTP boundary blocks cross-origin, oversized, injected and unauthenticated requests", async (t) => {
  const f = await fixture(t);
  const request = (body, origin = env.MARKETPLACE_APP_URL) => new Request(`${env.MARKETPLACE_APP_URL}/api/marketplace/training`, { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await f.route.POST(request({ action: "save", entry: workout() }, "https://evil.test"))).status, 403);
  assert.equal((await f.route.POST(request({ action: "save", entry: workout({ notes: "a".repeat(9000) }) }))).status, 413);
  assert.equal((await f.route.POST(request({ action: "save", entry: workout(), userId: other.id }))).status, 400);
  const response = await f.route.POST(request({ action: "save", entry: workout() }));
  assert.equal(response.status, 200); assert.match(response.headers.get("Cache-Control"), /private, no-store/);
  const read = await f.route.GET(new Request(`${env.MARKETPLACE_APP_URL}/api/marketplace/training?from=2026-10-12&to=2026-10-18`));
  assert.equal((await read.json()).entries.length, 1);
  assert.equal((await f.route.GET(new Request(`${env.MARKETPLACE_APP_URL}/api/marketplace/training?from=2026-10-12&to=2026-10-18&userId=other`))).status, 400);
  const authCache = new Map();
  const { MarketplaceError } = load("src/lib/marketplace-config.ts", { "server-only": {} }, {}, authCache);
  const unauthorized = load("src/app/api/marketplace/training/route.ts", { "server-only": {}, "@/lib/marketplace-auth": { requireMarketplaceActor: async () => { throw new MarketplaceError("Sign in to continue.", 401); } } }, {}, authCache);
  assert.equal((await unauthorized.GET(new Request("http://localhost/api/marketplace/training?from=2026-10-12&to=2026-10-18"))).status, 401);
  f.globals.process.env.TRAINING_WORKSPACE = "off";
  assert.equal((await f.route.POST(request({ action: "save", entry: workout() }))).status, 404);
});

test("browser roles cannot read or truncate private training tables", async (t) => {
  const f = await fixture(t);
  await f.save(workout());
  for (const role of ["anon", "authenticated"]) {
    await f.db.exec(`SET ROLE ${role}`);
    await assert.rejects(f.db.query("SELECT * FROM training_entries"), /permission denied/);
    await assert.rejects(f.db.query("TRUNCATE training_entries"), /permission denied/);
    await assert.rejects(f.db.query("SELECT * FROM training_usage"), /permission denied/);
    await f.db.exec("RESET ROLE");
  }
});

test("weekly summaries never substitute planned metrics; CSV escapes formulas and quotes", () => {
  const { trainingTotals, trainingCsv, trainingWeek, shiftTrainingDate } = load("src/lib/training.ts");
  const entries = [workout(), workout({ status: "completed", actualMinutes: 42, actualKm: 6.3 }), workout({ status: "skipped" }), workout({ status: "completed" })];
  const totals = trainingTotals(entries);
  assert.equal(totals.plannedMinutes, 160); assert.equal(totals.actualMinutes, 42); assert.equal(totals.completed, 2); assert.equal(totals.skipped, 1);
  assert.equal(trainingWeek("2026-10-18"), "2026-10-12");
  assert.equal(shiftTrainingDate("2026-03-07", 2), "2026-03-09");
  const csv = trainingCsv([workout({ title: '=HYPERLINK("evil")', notes: "line one\nline two" })]);
  assert.ok(csv.includes('"\'=HYPERLINK(""evil"")"'));
  assert.ok(csv.includes('"line one\nline two"'));
});
