import "server-only";
import type { PoolClient } from "pg";
import type { MarketplaceActor } from "./marketplace-auth";
import { MarketplaceError } from "./marketplace-config";

export function trainingEnabled() { return process.env.TRAINING_WORKSPACE === "on"; }
export function requireTraining() { if (!trainingEnabled()) throw new MarketplaceError("The training workspace is not open yet.", 404); }
export async function lockTrainingUsers(client: PoolClient, users: string[]) {
  // All multi-account paths use the same order, including mutual coaching links.
  for (const id of [...new Set(users)].sort()) await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`training:${id}`]);
}
export async function requireTrainingCoach(client: PoolClient, actor: MarketplaceActor) {
  const { rows: [coach] } = await client.query("SELECT status FROM marketplace_coaches WHERE user_id=$1 FOR SHARE", [actor.id]);
  if (coach?.status !== "approved") throw new MarketplaceError("An approved coaching account is required.", 403);
}
export async function trainingScope(client: PoolClient, actor: MarketplaceActor, relationshipId?: string) {
  if (!relationshipId) {
    await lockTrainingUsers(client, [actor.id]);
    return { owner: actor.id, athleteName: undefined };
  }
  const { rows: [candidate] } = await client.query("SELECT athlete_id FROM training_relationships WHERE id=$1 AND coach_id=$2 AND status='active'", [relationshipId, actor.id]);
  if (!candidate?.athlete_id) throw new MarketplaceError("This athlete has not granted access, or access has ended.", 403);
  await lockTrainingUsers(client, [actor.id, candidate.athlete_id]);
  await requireTrainingCoach(client, actor);
  // Recheck under lock so revocation cannot race a calendar read/write.
  const { rows: [grant] } = await client.query("SELECT athlete_id,athlete_name FROM training_relationships WHERE id=$1 AND coach_id=$2 AND status='active' FOR SHARE", [relationshipId, actor.id]);
  if (!grant || grant.athlete_id !== candidate.athlete_id) throw new MarketplaceError("Athlete access has ended.", 403);
  return { owner: grant.athlete_id as string, athleteName: grant.athlete_name as string };
}
