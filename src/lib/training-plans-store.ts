import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { MarketplaceActor } from "./marketplace-auth";
import { MarketplaceError } from "./marketplace-config";
import { marketplaceTransaction } from "./marketplace-store";
import { lockTrainingUsers, requireTraining, requireTrainingCoach, trainingScope } from "./training-access";
import { trainingMeter } from "./training-store";
import { isTrainingDate, shiftTrainingDate, TRAINING_LIMITS } from "./training";
import { canonicalTrainingJson } from "./workout-structure";
import { PLAN_LIMITS, planDates, type PlanLibrary, type PlanPreview, type TrainingPlan } from "./training-plans";
import type { PlanAction } from "./training-plans-input";

const fail = (message: string, status = 409): never => { throw new MarketplaceError(message, status); };
async function planRow(client: PoolClient, coach: string, id: string) {
  const { rows: [row] } = await client.query<TrainingPlan>("SELECT id,version,title,description,weeks,sessions FROM training_plans WHERE coach_id=$1 AND id=$2", [coach, id]);
  if (!row) return fail("This plan is unavailable. Reload your plan library.", 404);
  return row;
}
async function history(client: PoolClient, actor: MarketplaceActor, before?: string) {
  let cursor;
  if (before) {
    const { rows: [row] } = await client.query("SELECT created_at::text,id FROM training_plan_assignments WHERE coach_id=$1 AND id=$2", [actor.id, before]);
    if (!row) return fail("This history page is unavailable. Reload recent assignments.", 404);
    cursor = row;
  }
  const { rows } = await client.query(`SELECT a.id,a.plan_title,a.start_date::text,a.weeks,a.workout_count,a.status,a.relationship_id,r.athlete_name,
    (r.status='active' AND r.athlete_id=a.athlete_id) AS can_manage
    FROM training_plan_assignments a JOIN training_relationships r ON r.id=a.relationship_id
    WHERE a.coach_id=$1 ${cursor ? "AND (a.created_at,a.id)<($3::timestamptz,$4::uuid)" : ""}
    ORDER BY a.created_at DESC,a.id DESC LIMIT $2`, cursor ? [actor.id, PLAN_LIMITS.historyPage + 1, cursor.created_at, cursor.id] : [actor.id, PLAN_LIMITS.historyPage + 1]);
  return { assignments: rows.slice(0, PLAN_LIMITS.historyPage).map((r) => ({ id: r.id, planTitle: r.plan_title, athleteName: r.athlete_name, startDate: r.start_date, weeks: r.weeks, workoutCount: r.workout_count, status: r.status, relationshipId: r.relationship_id, canManage: r.can_manage })), nextCursor: rows.length > PLAN_LIMITS.historyPage ? rows[PLAN_LIMITS.historyPage - 1].id as string : null };
}
export async function readTrainingPlans(actor: MarketplaceActor, before?: string): Promise<PlanLibrary> {
  requireTraining();
  return marketplaceTransaction(async (client) => {
    await lockTrainingUsers(client, [actor.id]); await requireTrainingCoach(client, actor); await trainingMeter(client, actor, "reads");
    const { rows: plans } = await client.query("SELECT id,version,title,description,weeks,jsonb_array_length(sessions)::int AS \"sessionCount\" FROM training_plans WHERE coach_id=$1 ORDER BY updated_at DESC,id LIMIT $2", [actor.id, PLAN_LIMITS.plans]);
    return { plans, ...await history(client, actor, before) };
  });
}
export async function readTrainingPlan(actor: MarketplaceActor, id: string) {
  requireTraining();
  return marketplaceTransaction(async (client) => {
    await lockTrainingUsers(client, [actor.id]); await requireTrainingCoach(client, actor); await trainingMeter(client, actor, "reads");
    return planRow(client, actor.id, id);
  });
}
async function assignmentScopes(client: PoolClient, actor: MarketplaceActor, athletes: string[]) {
  const candidates = await client.query<{ id: string; athlete_id: string }>("SELECT id,athlete_id FROM training_relationships WHERE id=ANY($1::uuid[]) AND coach_id=$2 AND status='active'", [athletes, actor.id]);
  if (candidates.rows.length !== athletes.length) return fail("Every athlete must have an active connection. Refresh your roster.", 403);
  await lockTrainingUsers(client, [actor.id, ...candidates.rows.map((r) => r.athlete_id)]);
  await requireTrainingCoach(client, actor);
  const current = await client.query<{ id: string; athlete_id: string }>("SELECT id,athlete_id FROM training_relationships WHERE id=ANY($1::uuid[]) AND coach_id=$2 AND status='active'", [athletes, actor.id]);
  if (current.rows.length !== candidates.rows.length || current.rows.some((r) => !candidates.rows.some((old) => old.id === r.id && old.athlete_id === r.athlete_id))) return fail("The athlete connections changed. Refresh your selection.", 403);
  const scopes = [];
  for (const id of athletes) scopes.push({ ...await trainingScope(client, actor, id), relationshipId: id });
  if (new Set(scopes.map((s) => s.owner)).size !== scopes.length) return fail("Select each athlete only once.", 400);
  return scopes;
}
export async function writeTrainingPlan(actor: MarketplaceActor, action: PlanAction) {
  requireTraining();
  return marketplaceTransaction(async (client) => {
    if (action.action === "remove") {
      const { rows: [candidate] } = await client.query("SELECT * FROM training_plan_assignments WHERE coach_id=$1 AND id=$2", [actor.id, action.id]);
      if (!candidate) return fail("This assignment is unavailable.", 404);
      const scope = await trainingScope(client, actor, candidate.relationship_id);
      if (scope.owner !== candidate.athlete_id) return fail("The athlete connection changed.", 403);
      const { rows: [assignment] } = await client.query("SELECT status FROM training_plan_assignments WHERE coach_id=$1 AND id=$2 FOR UPDATE", [actor.id, action.id]);
      const { rows } = await client.query("SELECT id FROM training_entries WHERE user_id=$1 AND assigned_by=$2 AND plan_assignment_id=$3 AND details->>'status'='planned' FOR UPDATE", [scope.owner, actor.id, action.id]);
      await trainingMeter(client, actor, "writes", assignment.status === "removed" ? 1 : Math.max(1, rows.length), true);
      if (assignment.status === "removed") return { saved: true, removed: 0 };
      await client.query("DELETE FROM training_entries WHERE user_id=$1 AND id=ANY($2::uuid[])", [scope.owner, rows.map((r) => r.id)]);
      await client.query("UPDATE training_plan_assignments SET status='removed' WHERE coach_id=$1 AND id=$2", [actor.id, action.id]);
      return { saved: true, removed: rows.length };
    }
    if (action.action === "save" || action.action === "delete") {
      await lockTrainingUsers(client, [actor.id]); await requireTrainingCoach(client, actor); await trainingMeter(client, actor, "writes", 1, true);
      const id = action.action === "save" ? action.plan.id : action.id;
      const { rows: [existing] } = await client.query<TrainingPlan>("SELECT id,version,title,description,weeks,sessions FROM training_plans WHERE coach_id=$1 AND id=$2 FOR UPDATE", [actor.id, id]);
      if (action.action === "delete") {
        if (existing && existing.version !== action.version) return fail("This plan changed. Reload before deleting it.");
        await client.query("DELETE FROM training_plans WHERE coach_id=$1 AND id=$2", [actor.id, id]);
        return { saved: true, plan: null };
      }
      const plan = action.plan;
      if (existing) {
        const same = ["title", "description", "weeks", "sessions"].every((key) => canonicalTrainingJson(existing[key as keyof TrainingPlan]) === canonicalTrainingJson(plan[key as keyof TrainingPlan]));
        if (same && (existing.version === plan.version || existing.version === plan.version + 1)) return { saved: true, plan: existing };
        if (existing.version !== plan.version) return fail("This plan changed in another session. Copy any edits you need, then reload it.");
      } else {
        if (plan.version !== 0) return fail("This plan was removed. Reload the library.");
        const { rows: [count] } = await client.query("SELECT count(*)::int AS count FROM training_plans WHERE coach_id=$1", [actor.id]);
        if (count.count >= PLAN_LIMITS.plans) return fail("Your library holds up to 50 plans. Delete an unused template first.", 429);
      }
      const { rows: [saved] } = existing
        ? await client.query<TrainingPlan>("UPDATE training_plans SET title=$3,description=$4,weeks=$5,sessions=$6::jsonb,version=version+1,updated_at=now() WHERE coach_id=$1 AND id=$2 RETURNING id,version,title,description,weeks,sessions", [actor.id, plan.id, plan.title, plan.description, plan.weeks, JSON.stringify(plan.sessions)])
        : await client.query<TrainingPlan>("INSERT INTO training_plans(coach_id,id,title,description,weeks,sessions) VALUES($1,$2,$3,$4,$5,$6::jsonb) RETURNING id,version,title,description,weeks,sessions", [actor.id, plan.id, plan.title, plan.description, plan.weeks, JSON.stringify(plan.sessions)]);
      return { saved: true, plan: saved };
    }
    const scopes = await assignmentScopes(client, actor, action.athletes);
    const requestHash = createHash("sha256").update(canonicalTrainingJson({ planId: action.planId, version: action.version, startDate: action.startDate, athletes: action.athletes })).digest("hex");
    if (action.action === "assign") {
      const { rows } = await client.query("SELECT request_hash,workout_count,status FROM training_plan_assignments WHERE coach_id=$1 AND batch_id=$2", [actor.id, action.id]);
      if (rows.length) {
        if (rows.length !== scopes.length || rows.some((r) => r.request_hash !== requestHash)) return fail("This assignment reference was already used for a different selection. Review a new assignment.");
        await trainingMeter(client, actor, "reads");
        return { saved: true, assigned: rows.length, workouts: rows.reduce((n, r) => n + r.workout_count, 0), replayed: true, removed: rows.filter((r) => r.status === "removed").length };
      }
    }
    const plan = await planRow(client, actor.id, action.planId);
    if (plan.version !== action.version) return fail("The plan changed. Reopen it and review the latest version before assigning.");
    if (!plan.sessions.length) return fail("Add at least one workout before assigning this plan.", 400);
    const endDate = shiftTrainingDate(action.startDate, plan.weeks * 7 - 1);
    if (!isTrainingDate(endDate)) return fail("The whole plan must fit between 2000 and 2100.", 400);
    const sessions = planDates(plan, action.startDate);
    const totalWorkouts = sessions.length * scopes.length;
    if (totalWorkouts > PLAN_LIMITS.assignmentWorkouts) return fail(`Assign this plan to at most ${Math.floor(PLAN_LIMITS.assignmentWorkouts / sessions.length)} athletes at a time (500 workouts per save).`, 400);
    const owners = scopes.map((s) => s.owner);
    const { rows: duplicate } = await client.query("SELECT id FROM training_plan_assignments WHERE coach_id=$1 AND plan_id=$2 AND start_date=$3 AND athlete_id=ANY($4::text[])", [actor.id, plan.id, action.startDate, owners]);
    if (duplicate.length) return fail("This plan was already assigned to a selected athlete on this start date. Choose a different date or duplicate the template for a fresh assignment.");
    const { rows: [retained] } = await client.query("SELECT count(*)::int AS count FROM training_plan_assignments WHERE coach_id=$1", [actor.id]);
    if (retained.count + scopes.length > PLAN_LIMITS.assignments) return fail("The retained plan-assignment allowance is full. Contact Anystride.", 429);
    const { rows: counts } = await client.query("SELECT user_id,count(*)::int AS count FROM training_entries WHERE user_id=ANY($1::text[]) AND kind='workout' GROUP BY user_id", [owners]);
    const { rows: days } = await client.query("SELECT user_id,scheduled_date::text AS date,count(*)::int AS count FROM training_entries WHERE user_id=ANY($1::text[]) AND kind='workout' AND scheduled_date=ANY($2::date[]) GROUP BY user_id,scheduled_date", [owners, [...new Set(sessions.map((s) => s.date))]]);
    const addedDays = new Map<string, number>(); for (const s of sessions) addedDays.set(s.date, (addedDays.get(s.date) ?? 0) + 1);
    for (const scope of scopes) {
      if ((counts.find((c) => c.user_id === scope.owner)?.count ?? 0) + sessions.length > TRAINING_LIMITS.workouts) return fail(`${scope.athleteName} has reached their workout storage allowance. Nothing was assigned.`, 429);
      if (days.some((d) => d.user_id === scope.owner && d.count + (addedDays.get(d.date) ?? 0) > TRAINING_LIMITS.perDay)) return fail(`${scope.athleteName} would have more than 20 workouts on a day. Change the start date or adjust their calendar. Nothing was assigned.`, 409);
    }
    const preview: PlanPreview = { title: plan.title, startDate: action.startDate, endDate, firstWorkout: sessions[0].date, lastWorkout: sessions.at(-1)!.date, workoutsPerAthlete: sessions.length, totalWorkouts, athletes: scopes.map((s) => ({ id: s.relationshipId, name: s.athleteName! })) };
    if (action.action === "preview") {
      const usage = await trainingMeter(client, actor, "reads");
      if (usage.writes + totalWorkouts > TRAINING_LIMITS.coachWritesPerMonth) return fail("This assignment would exceed your remaining monthly save allowance.", 429);
      return { preview };
    }
    await trainingMeter(client, actor, "writes", totalWorkouts, true);
    const assignments = scopes.map((scope) => ({ id: randomUUID(), athlete_id: scope.owner, relationship_id: scope.relationshipId }));
    await client.query(`INSERT INTO training_plan_assignments(id,coach_id,batch_id,athlete_id,relationship_id,plan_id,plan_version,plan_title,start_date,weeks,workout_count,request_hash)
      SELECT a.id,$2,$3,a.athlete_id,a.relationship_id,$4,$5,$6,$7,$8,$9,$10 FROM jsonb_to_recordset($1::jsonb) AS a(id uuid,athlete_id text,relationship_id uuid)`, [JSON.stringify(assignments), actor.id, action.id, plan.id, plan.version, plan.title, action.startDate, plan.weeks, sessions.length, requestHash]);
    const rows = assignments.flatMap((a) => sessions.map((s) => ({ id: randomUUID(), owner: a.athlete_id, date: s.date, details: s.workout, assignment: a.id })));
    // One bounded bulk insert: no per-workout round trips, no expanded repeat rows.
    await client.query(`INSERT INTO training_entries(user_id,id,kind,scheduled_date,details,assigned_by,plan_title,plan_assignment_id)
      SELECT w.owner,w.id,'workout',w.date,w.details,$2,$3,w.assignment FROM jsonb_to_recordset($1::jsonb) AS w(owner text,id uuid,date date,details jsonb,assignment uuid)`, [JSON.stringify(rows), actor.id, plan.title]);
    return { saved: true, assigned: assignments.length, workouts: totalWorkouts, replayed: false, removed: 0 };
  });
}
