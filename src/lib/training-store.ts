import { canonicalTrainingJson } from "./workout-structure";
import "server-only";
import type { PoolClient } from "pg";
import type { MarketplaceActor } from "./marketplace-auth";
import { MarketplaceError } from "./marketplace-config";
import { marketplaceTransaction } from "./marketplace-store";
import { TRAINING_LIMITS, type TrainingDetails, type TrainingEntry, type TrainingSnapshot } from "./training";
import { trainingScope, requireTraining } from "./training-access";
export { trainingEnabled } from "./training-access";
import { trainingRange, type TrainingAction } from "./training-input";

export interface TrainingRow { id: string; kind: TrainingEntry["kind"]; date: string | null; details: TrainingDetails; version: number; assigned_by: string | null; source_id: string | null; plan_title: string | null; plan_assignment_id: string | null }
export const trainingColumns = "id,kind,scheduled_date::text AS date,details,version,assigned_by,source_id,plan_title,plan_assignment_id";
export const trainingEntry = (row: TrainingRow, coachId?: string): TrainingEntry => ({ ...row.details, id: row.id, kind: row.kind, date: row.date, version: row.version, planTitle: row.plan_title, planAssignmentId: row.plan_assignment_id, assignedBy: row.assigned_by, sourceId: row.source_id, coachCanEdit: row.assigned_by === coachId && row.details.status === "planned" });

export async function trainingMeter(client: PoolClient, actor: MarketplaceActor, mode: "reads" | "writes", amount = 1, coach = false) {
  // Cross-instance serialization makes both storage and request quotas atomic.
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`training:${actor.id}`]);
  const { rows: [usage] } = await client.query<{ month: string; reads: number; writes: number; requests: number }>(`
    INSERT INTO training_usage(user_id,month,minute) VALUES($1,date_trunc('month',now() AT TIME ZONE 'UTC')::date,date_trunc('minute',now()))
    ON CONFLICT(user_id) DO UPDATE SET
      reads=CASE WHEN training_usage.month=EXCLUDED.month THEN training_usage.reads ELSE 0 END,
      writes=CASE WHEN training_usage.month=EXCLUDED.month THEN training_usage.writes ELSE 0 END,
      requests=CASE WHEN training_usage.minute=EXCLUDED.minute THEN training_usage.requests ELSE 0 END,
      month=EXCLUDED.month,minute=EXCLUDED.minute
    RETURNING month::text,reads,writes,requests`, [actor.id]);
  if (usage.requests >= TRAINING_LIMITS.requestsPerMinute) throw new MarketplaceError("Please wait a minute before making more training requests.", 429);
  // Coaches share one allowance across assignments, their library and their own log.
  if (!coach && mode === "writes" && usage.writes + amount > TRAINING_LIMITS.writesPerMonth) {
    const { rows: [profile] } = await client.query("SELECT status FROM marketplace_coaches WHERE user_id=$1", [actor.id]);
    coach = profile?.status === "approved";
  }
  const limit = mode === "reads" ? TRAINING_LIMITS.readsPerMonth : (coach ? TRAINING_LIMITS.coachWritesPerMonth : TRAINING_LIMITS.writesPerMonth);
  if (usage[mode] + amount > limit) throw new MarketplaceError(`Your monthly training ${mode === "reads" ? "view" : "save"} allowance has been reached. Contact Anystride for help. Allowances reset on the first of each month (UTC).`, 429);
  // mode is a server-owned enum, never user input.
  await client.query(`UPDATE training_usage SET ${mode}=${mode}+$2,requests=requests+1 WHERE user_id=$1`, [actor.id, amount]);
  return { month: usage.month, reads: usage.reads + (mode === "reads" ? amount : 0), writes: usage.writes + (mode === "writes" ? amount : 0) };
}
export async function trainingCounts(client: PoolClient, user: string) {
  const { rows: [row] } = await client.query<{ workouts: number; templates: number }>(`SELECT
    count(*) FILTER(WHERE kind='workout')::int AS workouts,
    count(*) FILTER(WHERE kind='template')::int AS templates FROM training_entries WHERE user_id=$1`, [user]);
  return row;
}
export async function readTraining(actor: MarketplaceActor, from: string, to: string, relationshipId?: string): Promise<TrainingSnapshot> {
  requireTraining();
  trainingRange(from, to);
  return marketplaceTransaction(async (client) => {
    const scope = await trainingScope(client, actor, relationshipId);
    const usage = await trainingMeter(client, actor, "reads");
    const { rows } = await client.query<TrainingRow>(`SELECT ${trainingColumns} FROM training_entries
      WHERE user_id=$1 AND kind='workout' AND scheduled_date BETWEEN $2::date AND $3::date
      ORDER BY scheduled_date,id LIMIT $4`, [scope.owner, from, to, TRAINING_LIMITS.rangeDays * TRAINING_LIMITS.perDay]);
    const templates = await client.query<TrainingRow>(`SELECT ${trainingColumns} FROM training_entries WHERE user_id=$1 AND kind='template' ORDER BY updated_at DESC,id LIMIT $2`, [actor.id, TRAINING_LIMITS.templates]);
    const ownerCounts = await trainingCounts(client, scope.owner);
    return { athleteName: scope.athleteName, entries: rows.map((row) => trainingEntry(row, relationshipId ? actor.id : undefined)), templates: templates.rows.map((row) => trainingEntry(row)), usage: { ...usage, ...ownerCounts, templates: templates.rows.length } };
  });
}
export async function writeTraining(actor: MarketplaceActor, action: TrainingAction, relationshipId?: string) {
  requireTraining();
  return marketplaceTransaction(async (client) => {
    const scope = await trainingScope(client, actor, relationshipId);
    await trainingMeter(client, actor, "writes", 1, Boolean(relationshipId));
    return saveTrainingEntry(client, scope.owner, action, relationshipId ? actor.id : undefined);
  });
}

/** Caller holds owner locks and has checked current grants and quotas. */
export async function saveTrainingEntry(client: PoolClient, owner: string, action: TrainingAction, coachId?: string) {
    const id = action.action === "save" ? action.entry.id : action.id;
    const { rows: [existing] } = await client.query<TrainingRow>(`SELECT ${trainingColumns} FROM training_entries WHERE user_id=$1 AND id=$2 FOR UPDATE`, [owner, id]);
    if (coachId && existing && (existing.assigned_by !== coachId || existing.details.status !== "planned")) {
      throw new MarketplaceError("Only your own planned assignments can be changed. Recorded results belong to the athlete.", 403);
    }
    if (coachId && action.action === "save" && (action.entry.kind !== "workout" || action.entry.status !== "planned" || action.entry.actualMinutes !== null || action.entry.actualKm !== null || action.entry.effort !== null)) {
      throw new MarketplaceError("Coaches can assign planned workouts; athletes record their results.", 403);
    }
    if (action.action === "delete") {
      if (!existing) return { saved: true, entry: null };
      if (existing.version !== action.version) throw new MarketplaceError("This workout changed in another session. Reload the week before deleting it.", 409);
      await client.query("DELETE FROM training_entries WHERE user_id=$1 AND id=$2", [owner, id]);
      return { saved: true, entry: null };
    }
    const { id: ignoredId, kind, date, version, ...details } = action.entry;
    void ignoredId;
    if (existing) {
      const unchanged = existing.kind === kind && existing.date === date && Object.entries(details).every(([key, value]) => canonicalTrainingJson(existing.details[key as keyof TrainingDetails]) === canonicalTrainingJson(value));
      // Replaying an acknowledged or network-interrupted save never creates a duplicate.
      if (unchanged && (existing.version === version || existing.version === version + 1)) return { saved: true, entry: trainingEntry(existing, coachId) };
      if (existing.version !== version || existing.kind !== kind) throw new MarketplaceError("This workout changed in another session. Reload the week before saving again.", 409);
    } else {
      if (version !== 0) throw new MarketplaceError("This workout was removed. Reload the week to continue.", 409);
      const count = await trainingCounts(client, owner);
      if ((kind === "workout" ? count.workouts >= TRAINING_LIMITS.workouts : count.templates >= TRAINING_LIMITS.templates)) throw new MarketplaceError("Your training storage allowance is full. Export and remove older workouts, or contact Anystride for help.", 429);
    }
    if (kind === "workout" && (!existing || existing.date !== date)) {
      const { rows: [day] } = await client.query("SELECT count(*)::int AS count FROM training_entries WHERE user_id=$1 AND kind='workout' AND scheduled_date=$2::date", [owner, date]);
      if (day.count >= TRAINING_LIMITS.perDay) throw new MarketplaceError("A day can contain up to 20 workouts.", 429);
    }
    const { rows: [saved] } = existing
      ? await client.query<TrainingRow>(`UPDATE training_entries SET scheduled_date=$3,details=$4::jsonb,version=version+1,updated_at=now() WHERE user_id=$1 AND id=$2 RETURNING ${trainingColumns}`, [owner, id, date, JSON.stringify(details)])
      : await client.query<TrainingRow>(`INSERT INTO training_entries(user_id,id,kind,scheduled_date,details,assigned_by) VALUES($1,$2,$3,$4,$5::jsonb,$6) RETURNING ${trainingColumns}`, [owner, id, kind, date, JSON.stringify(details), coachId ?? null]);
    return { saved: true, entry: trainingEntry(saved, coachId) };
}
