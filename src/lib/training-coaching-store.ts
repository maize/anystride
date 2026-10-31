import "server-only";
import type { MarketplaceActor } from "./marketplace-auth";
import { MarketplaceError } from "./marketplace-config";
import { marketplaceTransaction } from "./marketplace-store";
import { lockTrainingUsers, requireTraining, requireTrainingCoach, trainingScope } from "./training-access";
import { trainingRange } from "./training-input";
import { saveTrainingEntry, trainingMeter } from "./training-store";
import { TRAINING_LIMITS, type TrainingRelationship, type TrainingRoster } from "./training";
import type { CoachingAction } from "./training-coaching-input";

type RelationshipRow = { id: string; coach_id: string; athlete_id: string | null; athlete_email: string; athlete_name: string; status: TrainingRelationship["status"]; version: number; expired: boolean };
const columns = "id,coach_id,athlete_id,athlete_email,athlete_name,status,version,expires_at<=now() AS expired";

export async function readTrainingRoster(actor: MarketplaceActor, from: string, to: string): Promise<TrainingRoster> {
  requireTraining(); trainingRange(from, to);
  return marketplaceTransaction(async (client) => {
    await lockTrainingUsers(client, [actor.id]);
    await trainingMeter(client, actor, "reads");
    const { rows: [coach] } = await client.query("SELECT status FROM marketplace_coaches WHERE user_id=$1", [actor.id]);
    const isCoach = coach?.status === "approved";
    const { rows } = await client.query<RelationshipRow & { coach_name: string; planned: number; completed: number; skipped: number; actual_minutes: number }>(`
      SELECT r.*,r.expires_at<=now() AS expired,c.name AS coach_name,
        COALESCE(s.planned,0) AS planned,COALESCE(s.completed,0) AS completed,
        COALESCE(s.skipped,0) AS skipped,COALESCE(s.actual_minutes,0) AS actual_minutes
      FROM training_relationships r JOIN marketplace_coaches c ON c.user_id=r.coach_id
      LEFT JOIN LATERAL (
        SELECT count(*) FILTER(WHERE details->>'status'='planned')::int AS planned,
          count(*) FILTER(WHERE details->>'status'='completed')::int AS completed,
          count(*) FILTER(WHERE details->>'status'='skipped')::int AS skipped,
          sum(CASE WHEN details->>'status'='completed' THEN (details->>'actualMinutes')::numeric ELSE 0 END)::float AS actual_minutes
        FROM training_entries WHERE user_id=r.athlete_id AND kind='workout' AND scheduled_date BETWEEN $3::date AND $4::date
          AND r.status='active' AND r.coach_id=$1 AND $5 AND c.status='approved'
      ) s ON true
      WHERE (r.coach_id=$1 AND $5) OR (r.athlete_id=$1 AND r.status='active')
        OR (r.athlete_email=$2 AND r.status='pending' AND r.expires_at>now() AND c.status='approved')
      ORDER BY r.updated_at DESC,r.id LIMIT 1000`, [actor.id, actor.email, from, to, isCoach]);
    const map = (r: typeof rows[number]): TrainingRelationship => ({ id: r.id, athleteName: r.athlete_name, athleteEmail: r.athlete_email, coachName: r.coach_name, status: r.status, version: r.version, expired: r.expired, planned: r.planned, completed: r.completed, skipped: r.skipped, actualMinutes: r.actual_minutes });
    return { isCoach, from, to, athletes: rows.filter((r) => r.coach_id === actor.id).map(map), coaches: rows.filter((r) => r.coach_id !== actor.id).map(map) };
  });
}

export async function writeTrainingCoaching(actor: MarketplaceActor, action: CoachingAction) {
  requireTraining();
  return marketplaceTransaction(async (client) => {
    if (action.action === "assign") {
      const candidates = await client.query<{ id: string; athlete_id: string }>("SELECT id,athlete_id FROM training_relationships WHERE id=ANY($1::uuid[]) AND coach_id=$2 AND status='active'", [action.athletes, actor.id]);
      if (candidates.rows.length !== action.athletes.length) throw new MarketplaceError("Every selected athlete must have accepted your invitation. Reload the roster.", 403);
      await lockTrainingUsers(client, [actor.id, ...candidates.rows.map((r) => r.athlete_id)]);
      const current = await client.query<{ id: string; athlete_id: string }>("SELECT id,athlete_id FROM training_relationships WHERE id=ANY($1::uuid[]) AND coach_id=$2 AND status='active'", [action.athletes, actor.id]);
      if (current.rows.length !== candidates.rows.length || current.rows.some((r) => !candidates.rows.some((old) => old.id === r.id && old.athlete_id === r.athlete_id))) throw new MarketplaceError("Athlete connections changed. Refresh your selection.", 403);
      // Scope rechecks happen after every participant has been locked in a stable order.
      const scopes = [];
      for (const id of action.athletes) scopes.push(await trainingScope(client, actor, id));
      await trainingMeter(client, actor, "writes", scopes.length, true);
      for (const scope of scopes) await saveTrainingEntry(client, scope.owner, { action: "save", entry: action.entry }, actor.id);
      return { saved: true, assigned: scopes.length };
    }
    if (action.action === "invite") {
      await lockTrainingUsers(client, [actor.id]);
      await requireTrainingCoach(client, actor);
      if (action.email === actor.email) throw new MarketplaceError("Use My training for your own workouts.", 400);
      await trainingMeter(client, actor, "writes", 1, true);
      const { rows: [existing] } = await client.query<RelationshipRow>(`SELECT ${columns} FROM training_relationships WHERE coach_id=$1 AND athlete_email=$2 FOR UPDATE`, [actor.id, action.email]);
      if (existing?.status === "active" || (existing?.status === "pending" && !existing.expired)) return { saved: true, invited: existing.id };
      const { rows: [count] } = await client.query("SELECT count(*)::int AS total,count(*) FILTER(WHERE status='active' OR (status='pending' AND expires_at>now()))::int AS current FROM training_relationships WHERE coach_id=$1", [actor.id]);
      if (count.current >= TRAINING_LIMITS.roster || (!existing && count.total >= TRAINING_LIMITS.relationships)) throw new MarketplaceError("Your athlete allowance is full. End unused invitations or contact Anystride.", 429);
      if (existing) await client.query("UPDATE training_relationships SET athlete_name=$2,athlete_id=NULL,status='pending',expires_at=now()+interval '14 days',version=version+1,updated_at=now() WHERE id=$1", [existing.id, action.name]);
      else await client.query("INSERT INTO training_relationships(id,coach_id,athlete_email,athlete_name) VALUES($1,$2,$3,$4)", [action.id, actor.id, action.email, action.name]);
      return { saved: true, invited: existing?.id ?? action.id };
    }
    const { rows: [candidate] } = await client.query<RelationshipRow>(`SELECT ${columns} FROM training_relationships WHERE id=$1 AND (coach_id=$2 OR athlete_id=$2 OR (athlete_email=$3 AND status='pending'))`, [action.id, actor.id, actor.email]);
    if (!candidate) throw new MarketplaceError("This invitation is unavailable.", 404);
    await lockTrainingUsers(client, [actor.id, candidate.coach_id, ...(candidate.athlete_id ? [candidate.athlete_id] : [])]);
    const { rows: [row] } = await client.query<RelationshipRow>(`SELECT ${columns} FROM training_relationships WHERE id=$1 FOR UPDATE`, [action.id]);
    const isCoach = row.coach_id === actor.id;
    const isRecipient = (row.status === "pending" && row.athlete_email === actor.email) || row.athlete_id === actor.id;
    if (!isCoach && !isRecipient) throw new MarketplaceError("This invitation is unavailable.", 404);
    const target = action.action === "accept" ? "active" : action.action === "decline" ? "declined" : "revoked";
    if (row.status === target && row.version === action.version + 1 && (action.action === "revoke" || (!isCoach && row.athlete_id === actor.id))) return { saved: true };
    if (row.version !== action.version) throw new MarketplaceError("This invitation changed. Reload athletes and coaches.", 409);
    if (action.action === "revoke") {
      if (!["pending", "active"].includes(row.status)) throw new MarketplaceError("Access has already ended.", 409);
      // Ending access is always available, even when a monthly allowance is exhausted.
    } else {
      if (isCoach || !isRecipient || row.status !== "pending" || row.expired) throw new MarketplaceError("Only the invited athlete can accept an unexpired invitation.", 403);
      await requireTrainingCoach(client, { ...actor, id: row.coach_id });
      await trainingMeter(client, actor, "writes");
      if (action.action === "accept") {
        const { rows: [count] } = await client.query("SELECT count(*)::int AS count FROM training_relationships WHERE athlete_id=$1 AND status='active'", [actor.id]);
        if (count.count >= TRAINING_LIMITS.coachesPerAthlete) throw new MarketplaceError("You can connect with up to five coaches. End an existing connection first.", 429);
      }
    }
    await client.query("UPDATE training_relationships SET status=$2,athlete_id=CASE WHEN $3 THEN $4 ELSE athlete_id END,version=version+1,updated_at=now() WHERE id=$1", [row.id, target, action.action !== "revoke", actor.id]);
    return { saved: true };
  });
}
