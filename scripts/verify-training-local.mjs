import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

// Real HTTP → local Auth → local Postgres verification. Never reads hosted credentials.
const root = dirname(dirname(fileURLToPath(import.meta.url)));
if (!/^project_id\s*=\s*"anystride-local"\s*$/m.test(readFileSync(join(root, "supabase/config.toml"), "utf8")) || existsSync(join(root, "supabase/.temp/project-ref"))) throw new Error("Use the unlinked local project.");
const status = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], { cwd: root, env: { ...process.env, DOCKER_HOST: `unix://${join(homedir(), ".colima/anystride/docker.sock")}` }, stdio: ["ignore", "pipe", "ignore"] }));
const database = new URL(status.DB_URL);
if (status.API_URL !== "http://127.0.0.1:54321" || database.protocol !== "postgresql:" || database.hostname !== "127.0.0.1" || database.port !== "54322" || database.pathname !== "/postgres") throw new Error("Local endpoints required.");
database.pathname = "/anystride_marketplace_test";
const pool = new Pool({ connectionString: database.toString(), max: 1 });
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const origin = "http://localhost:3010";
const created = [];
async function account(email) {
  // Dedicated test identities only; never change an existing person's password or session.
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw new Error(`Create a fresh local test identity (${email}): ${error.message}`);
  created.push(data.user.id);
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw link.error;
  const jar = new Map();
  const auth = createServerClient(status.API_URL, status.PUBLISHABLE_KEY || status.ANON_KEY, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (values) => values.forEach(({ name, value }) => jar.set(name, value)) } });
  const verified = await auth.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: "magiclink" });
  if (verified.error) throw verified.error;
  return { id: data.user.id, email, cookie: () => [...jar].map(([name, value]) => `${name}=${value}`).join("; ") };
}
async function request(actor, path, body, expected = 200) {
  const response = await fetch(`${origin}${path}`, { method: body ? "POST" : "GET", headers: { ...(actor ? { Cookie: actor.cookie() } : {}), ...(body ? { Origin: origin, "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), redirect: "manual" });
  const text = await response.text();
  assert.equal(response.status, expected, `${path}: ${text.slice(0, 200)}`);
  assert.match(response.headers.get("cache-control") || "", path.startsWith("/api/") ? /private.*no-store/ : /no-cache|private.*no-store/);
  return text.startsWith("{") ? JSON.parse(text) : text;
}
const base = "/api/marketplace/training";
const range = "from=2026-10-12&to=2026-10-18";
try {
  const coach = await account("training-coach@local.invalid");
  const athlete = await account("training-athlete@local.invalid");
  const other = await account("training-other@local.invalid");
  await pool.query("INSERT INTO marketplace_coaches(user_id,name,bio,credentials,status) VALUES($1,'Integration Test Coach',$2,'Local test credentials','approved')", [coach.id, "Synthetic coaching profile used only by local integration verification."]);
  await request(null, `${base}?${range}`, undefined, 401);
  await request(null, `${base}/plans`, undefined, 401);
  const relationship = randomUUID();
  await request(coach, `${base}/coaching`, { action: "invite", id: relationship, name: "Integration Athlete", email: athlete.email });
  await request(coach, `${base}?${range}&athlete=${relationship}`, undefined, 403);
  const invitation = (await request(athlete, `${base}/coaching?${range}`)).coaches[0];
  assert.equal(invitation.id, relationship);
  await request(other, `${base}/coaching`, { action: "accept", id: relationship, version: invitation.version }, 404);
  await request(athlete, `${base}/coaching`, { action: "accept", id: relationship, version: invitation.version });
  const entry = { id: randomUUID(), kind: "workout", date: "2026-10-12", version: 0, title: "HTTP integration run", sport: "run", notes: "Easy effort", plannedMinutes: 40, plannedKm: 6, actualMinutes: null, actualKm: null, effort: null, status: "planned" };
  await request(coach, `${base}/coaching`, { action: "assign", athletes: [relationship], entry });
  assert.equal((await request(athlete, `${base}?${range}`)).entries[0].assignedBy, coach.id);
  assert.equal((await request(other, `${base}?${range}`)).entries.length, 0);
  const activities = [{ sourceId: "strava-file:101010101", entry: { ...entry, id: randomUUID(), notes: "", plannedMinutes: null, plannedKm: null, actualMinutes: 42, actualKm: 6.2, status: "completed" }, match: { id: entry.id, version: 1 } }];
  assert.equal((await request(athlete, `${base}/import`, { activities })).imported, 1);
  assert.equal((await request(athlete, `${base}/import`, { activities })).duplicates, 1);
  const result = (await request(coach, `${base}?${range}&athlete=${relationship}`)).entries[0];
  assert.equal(result.actualMinutes, 42); assert.equal(result.plannedMinutes, 40); assert.equal(result.coachCanEdit, false);
  await request(coach, `${base}?athlete=${relationship}`, { action: "delete", id: entry.id, version: result.version }, 403);
  const roster = await request(coach, `${base}/coaching?${range}`);
  assert.equal(roster.athletes[0].completed, 1);
  const secondRelationship = randomUUID();
  await request(coach, `${base}/coaching`, { action: "invite", id: secondRelationship, name: "Second Athlete", email: other.email });
  await request(other, `${base}/coaching`, { action: "accept", id: secondRelationship, version: 1 });
  const instruction = { kind: "work", unit: "minutes", amount: 3, target: "effort", low: 4, high: 6, notes: "Stay smooth" };
  const planWorkout = { title: "Structured progression", sport: "run", notes: "Keep the recovery easy.", plannedMinutes: null, plannedKm: null, actualMinutes: null, actualKm: null, effort: null, status: "planned", structure: [{ repeat: 4, steps: [instruction, { ...instruction, kind: "recovery", amount: 1 }] }] };
  const template = { id: randomUUID(), version: 0, title: "HTTP two-week plan", description: "Local verification", weeks: 2, sessions: [1, 3, 7].map((day) => ({ id: randomUUID(), day, workout: planWorkout })) };
  const savedPlan = (await request(coach, `${base}/plans`, { action: "save", plan: template })).plan;
  assert.equal(savedPlan.sessions[0].workout.plannedMinutes, 16);
  const selection = { planId: savedPlan.id, version: savedPlan.version, startDate: "2026-10-12", athletes: [relationship, secondRelationship] };
  const preview = (await request(coach, `${base}/plans`, { action: "preview", ...selection })).preview;
  assert.equal(preview.totalWorkouts, 6); assert.equal(preview.endDate, "2026-10-25");
  const assignment = { action: "assign", id: randomUUID(), ...selection };
  assert.equal((await request(coach, `${base}/plans`, assignment)).workouts, 6);
  assert.equal((await request(coach, `${base}/plans`, assignment)).replayed, true);
  const planRange = "from=2026-10-12&to=2026-10-25";
  const planEntries = (await request(athlete, `${base}?${planRange}`)).entries.filter((e) => e.planAssignmentId);
  assert.equal(planEntries.length, 3); assert.equal(planEntries[0].structure[0].repeat, 4);
  assert.equal(planEntries[2].date, "2026-10-19");
  await request(coach, `${base}/plans`, { action: "save", plan: { ...savedPlan, title: "Updated library version" } });
  assert.equal((await request(athlete, `${base}?${planRange}`)).entries.find((e) => e.planAssignmentId).planTitle, savedPlan.title);
  const editable = (entry) => Object.fromEntries(Object.entries(entry).filter(([key]) => !["assignedBy", "sourceId", "coachCanEdit", "planTitle", "planAssignmentId"].includes(key)));
  await request(athlete, base, { action: "save", entry: { ...editable(planEntries[0]), status: "completed", actualMinutes: 17, actualKm: 3 } });
  await request(athlete, base, { action: "save", entry: { ...editable(planEntries[1]), status: "skipped" } });
  const history = await request(coach, `${base}/plans`);
  const assignedPlan = history.assignments.find((a) => a.relationshipId === relationship);
  assert.equal((await request(coach, `${base}/plans`, { action: "remove", id: assignedPlan.id })).removed, 1);
  assert.equal((await request(athlete, `${base}?${planRange}`)).entries.filter((e) => e.planAssignmentId).length, 2);
  assert.equal((await request(other, `${base}?${planRange}`)).entries.filter((e) => e.planAssignmentId).length, 3);
  await request(coach, `${base}/plans`, { action: "delete", id: savedPlan.id, version: 2 });
  assert.equal((await request(coach, `${base}/plans`, assignment)).replayed, true);
  await request(coach, `${base}/plans?id=${savedPlan.id}`, undefined, 404);
  const largeTemplate = { ...template, id: randomUUID(), title: "HTTP 24-week load check", weeks: 24, sessions: Array.from({ length: 168 }, (_, day) => ({ id: randomUUID(), day, workout: planWorkout })) };
  const largePlan = (await request(coach, `${base}/plans`, { action: "save", plan: largeTemplate })).plan;
  const started = performance.now();
  const bulk = await request(coach, `${base}/plans`, { action: "assign", id: randomUUID(), planId: largePlan.id, version: largePlan.version, startDate: "2027-01-04", athletes: [relationship, secondRelationship] });
  const elapsed = Math.round(performance.now() - started);
  assert.equal(bulk.workouts, 336);
  const stored = await pool.query("SELECT count(*)::int AS count FROM training_entries WHERE assigned_by=$1 AND plan_title=$2", [coach.id, largePlan.title]);
  assert.equal(stored.rows[0].count, 336);
  assert.ok(Buffer.byteLength(JSON.stringify(bulk)) < 512);
  console.log(`Local bulk sample: 336 workouts persisted in ${elapsed} ms; confirmation ${Buffer.byteLength(JSON.stringify(bulk))} bytes (not a production load benchmark).`);
  assert.match(await request(coach, "/account/plans"), /Plan library/);
  // Also exercise server-rendered pages, without a browser.
  assert.match(await request(coach, "/account/athletes"), /Your athletes/);
  assert.match(await request(coach, `/account/training?date=2026-10-12&athlete=${relationship}`), /Integration Athlete/);
  assert.match(await request(athlete, "/account/training?date=2026-10-12"), /Bring in Strava activities/);
  // Real HTTP/Auth/Postgres sharing checks with synthetic cache rows only.
  // Never call OAuth, sync, or disconnect routes against the live provider.
  await pool.query('UPDATE training_usage SET requests=0 WHERE user_id=ANY($1::text[])',[created]);
  await request(null, "/api/strava/activities", undefined, 401);
  await request(coach, `/api/strava/activities?athlete=${relationship}`, undefined, 400);
  assert.equal((await request(athlete, "/api/strava/activities")).connected,false);
  const generation=randomUUID();
  await pool.query("INSERT INTO strava_connections(user_id,athlete_id,generation,tokens,scopes) VALUES($1,9000000000001,$2,'synthetic-test-no-provider-token','activity:read activity:read_all')",[athlete.id,generation]);
  for(let i=0;i<53;i++) {
    const summary={id:9000000000100+i,title:i===52?'PRIVATE FIXTURE':'Shared test run',sport:'Run',date:new Date(Date.now()-86400000).toISOString().slice(0,19),distance:5000,movingSeconds:1500,elapsedSeconds:1550,elevation:30,device:null};
    await pool.query("INSERT INTO strava_activity_cache(user_id,activity_id,summary,expires_at,started_at,coach_visible) VALUES($1,$2,$3,now()+interval '1 hour',now()-interval '1 day',$4)",[athlete.id,summary.id,JSON.stringify(summary),i!==52]);
  }
  const sharedPath=`/api/strava/coach-activities?relationship=${relationship}`;
  await request(coach,sharedPath,undefined,403);
  const permission=async()=> (await request(athlete,'/api/strava/sharing')).coaches.find(c=>c.id===relationship);
  const body=(p,enabled)=>({id:p.id,connection:p.connection,version:p.version,relationshipVersion:p.relationshipVersion,enabled});
  let consent=await permission(); assert.equal(consent.shared,false);
  await request(coach,'/api/strava/sharing',body(consent,true),403);
  await request(athlete,'/api/strava/sharing',body(consent,true));
  const calendarPath='/api/strava/calendar?from=2026-10-12&to=2026-10-18';
  const currentWorkout=(await request(athlete,`${base}?${range}`)).entries.find(e=>e.id===entry.id);
  const matchBody={action:'match',activityId:9000000000100,workoutId:entry.id,workoutVersion:currentWorkout.version,connection:generation};
  await request(coach,'/api/strava/calendar',matchBody,409);
  await request(athlete,'/api/strava/calendar',matchBody);
  await request(athlete,'/api/strava/calendar',matchBody);
  const ownPage=await request(athlete,calendarPath);
  // Fetch every bounded page; match may be on the second page of this busy week.
  const ownPages=[ownPage];
  while(ownPages.at(-1).nextCursor)ownPages.push(await request(athlete,`${calendarPath}&cursor=${ownPages.at(-1).nextCursor}`));
  const matched=ownPages.flatMap(p=>p.activities).find(a=>a.id===matchBody.activityId);
  assert.equal(matched.match.workoutId,entry.id);assert.equal(matched.calendarDate,'2026-10-12');
  const coachPages=[await request(coach,`${calendarPath}&relationship=${relationship}`)];
  while(coachPages.at(-1).nextCursor)coachPages.push(await request(coach,`${calendarPath}&relationship=${relationship}&cursor=${coachPages.at(-1).nextCursor}`));
  assert.ok(coachPages.flatMap(p=>p.activities).some(a=>a.match?.workoutId===entry.id));
  assert.ok(!JSON.stringify(coachPages).includes('PRIVATE FIXTURE'));
  const afterMatch=(await request(athlete,`${base}?${range}`)).entries.find(e=>e.id===entry.id);
  assert.deepEqual(afterMatch,currentWorkout,'matching never overwrites saved results');
  await request(athlete,'/api/strava/calendar',{action:'unmatch',activityId:matchBody.activityId,matchId:matched.match.id});
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM strava_workout_matches WHERE user_id=$1',[athlete.id])).rows[0].n,0);
  await request(athlete,'/api/strava/calendar',matchBody);
  const first=await request(coach,sharedPath); assert.equal(first.activities.length,50); assert.ok(first.nextCursor);
  const second=await request(coach,`${sharedPath}&cursor=${encodeURIComponent(first.nextCursor)}`); assert.equal(second.activities.length,2); assert.equal(second.nextCursor,null);
  assert.ok(!JSON.stringify([first,second]).includes('PRIVATE FIXTURE'));
  assert.equal(new Set([...first.activities,...second.activities].map(a=>a.id)).size,52);
  await request(other,sharedPath,undefined,403);
  await request(null,sharedPath,undefined,401);
  assert.match(await request(coach,`/account/athletes/${relationship}/activities`),/Shared Strava activities/);
  assert.match(await request(athlete,'/account/connections'),/Coach sharing/);
  consent=await permission(); await request(athlete,'/api/strava/sharing',body(consent,false));
  await request(coach,sharedPath,undefined,403);
  assert.equal((await request(coach,`${calendarPath}&relationship=${relationship}`)).activities.length,0);
  await request(athlete,'/api/strava/sharing',body(consent,true),409);
  consent=await permission(); await request(athlete,'/api/strava/sharing',body(consent,true));
  // Connection generation changes invalidate prior permission and stale forms.
  consent=await permission();
  await pool.query('UPDATE strava_connections SET generation=$2 WHERE user_id=$1',[athlete.id,randomUUID()]);
  await request(coach,sharedPath,undefined,403);
  assert.equal((await request(coach,`${calendarPath}&relationship=${relationship}`)).activities.length,0);
  await request(athlete,'/api/strava/sharing',body(consent,true),409);
  consent=await permission(); await request(athlete,'/api/strava/sharing',body(consent,true));
  await request(athlete, `${base}/coaching`, { action: "revoke", id: relationship, version: 2 });
  await request(coach, `${base}?${range}&athlete=${relationship}`, undefined, 403);
  await request(coach,sharedPath,undefined,403);
  await pool.query('DELETE FROM strava_connections WHERE user_id=$1',[athlete.id]);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM strava_coach_sharing WHERE user_id=$1',[athlete.id])).rows[0].n,0);
  assert.equal((await request(athlete, `${base}?${range}`)).entries[0].actualMinutes, 42);
  console.log("PASS: real local sign-in, invitation, consent, assignment, import matching/retry, progress, structured multiweek plans, group assignment/retry, safe removal, page rendering, explicit Strava consent, calendar overlays, athlete matching/undo, preserved results, private filtering, pagination, reconnection, isolation and revocation.");
} finally {
  if (created.length) {
    await pool.query("DELETE FROM strava_connections WHERE user_id=ANY($1::text[])",[created]);
    await pool.query("DELETE FROM training_plan_assignments WHERE coach_id=ANY($1::text[]) OR athlete_id=ANY($1::text[])", [created]);
    await pool.query("DELETE FROM training_plans WHERE coach_id=ANY($1::text[])", [created]);
    await pool.query("DELETE FROM training_relationships WHERE coach_id=ANY($1::text[]) OR athlete_id=ANY($1::text[])", [created]);
    await pool.query("DELETE FROM training_entries WHERE user_id=ANY($1::text[])", [created]);
    await pool.query("DELETE FROM training_usage WHERE user_id=ANY($1::text[])", [created]);
    await pool.query("DELETE FROM marketplace_coaches WHERE user_id=ANY($1::text[])", [created]);
    for (const id of created) { const result = await admin.auth.admin.deleteUser(id); if (result.error) throw result.error; }
  }
  await pool.end();
}
