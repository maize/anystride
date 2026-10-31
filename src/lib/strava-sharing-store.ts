import 'server-only';
import type { MarketplaceActor } from './marketplace-auth';
import { MarketplaceError } from './marketplace-config';
import { marketplaceTransaction } from './marketplace-store';
import { lockTrainingUsers, requireTraining, requireTrainingCoach, trainingScope } from './training-access';
import { trainingMeter } from './training-store';
import type { parseStravaSharing, stravaCoachQuery } from './strava-sharing-input';
import type { StravaCoachActivities, StravaSharingSnapshot } from './strava-sharing';
import type { StravaActivity } from './strava';

export async function readStravaSharing(actor: MarketplaceActor): Promise<StravaSharingSnapshot> {
  requireTraining();
  return marketplaceTransaction(async db => {
    await lockTrainingUsers(db, [actor.id]);
    // Privacy controls must remain reachable when activity-view quotas are exhausted.
    const { rows } = await db.query(`SELECT r.id,x.generation AS connection,c.name AS coach_name,r.version AS relationship_version,
      coalesce(s.version,0) AS version,
      coalesce(s.enabled AND s.generation=x.generation AND s.relationship_version=r.version,false) AS authorized,
      coalesce(s.enabled AND s.generation=x.generation AND s.relationship_version=r.version AND c.status='approved' AND x.status='connected',false) AS shared,
      coalesce(c.status='approved' AND x.status='connected',false) AS can_share
      FROM training_relationships r JOIN marketplace_coaches c ON c.user_id=r.coach_id
      LEFT JOIN strava_connections x ON x.user_id=r.athlete_id
      LEFT JOIN strava_coach_sharing s ON s.relationship_id=r.id AND s.user_id=r.athlete_id
      WHERE r.athlete_id=$1 AND r.status='active' ORDER BY c.name,r.id LIMIT 5`, [actor.id]);
    return { coaches: rows.map(r => ({ id: r.id, connection: r.connection, coachName: r.coach_name, relationshipVersion: r.relationship_version, version: r.version, authorized: r.authorized, shared: r.shared, canShare: r.can_share })) };
  });
}
export async function writeStravaSharing(actor: MarketplaceActor, input: ReturnType<typeof parseStravaSharing>) {
  requireTraining();
  return marketplaceTransaction(async db => {
    const candidate = (await db.query('SELECT coach_id FROM training_relationships WHERE id=$1 AND athlete_id=$2', [input.id, actor.id])).rows[0];
    if (!candidate) throw new MarketplaceError('Only the athlete can change Strava sharing with this coach.', 403);
    await lockTrainingUsers(db, [actor.id, candidate.coach_id]);
    const relationship = (await db.query("SELECT version FROM training_relationships WHERE id=$1 AND athlete_id=$2 AND status='active' FOR SHARE", [input.id,actor.id])).rows[0];
    if (!relationship || relationship.version !== input.relationshipVersion) throw new MarketplaceError('This coaching connection changed. Refresh sharing controls.', 409);
    // Lock connection so disconnect/reconnect cannot race consent or reuse it.
    const connection = (await db.query('SELECT generation,status FROM strava_connections WHERE user_id=$1 FOR SHARE', [actor.id])).rows[0];
    if (!connection) {
      if (!input.enabled) return { saved: true, shared: false, version: 0 };
      throw new MarketplaceError('Connect Strava before sharing activities.', 409);
    }
    const current = (await db.query('SELECT * FROM strava_coach_sharing WHERE relationship_id=$1 FOR UPDATE', [input.id])).rows[0];
    if (current?.version !== input.version && !(input.version === 0 && !current)) throw new MarketplaceError('Sharing changed in another tab. Refresh before changing it again.', 409);
    if (input.enabled) {
      if (input.connection !== connection.generation) throw new MarketplaceError('Your Strava connection changed. Refresh before sharing again.', 409);
      await requireTrainingCoach(db, { ...actor, id: candidate.coach_id });
      if (connection.status !== 'connected') throw new MarketplaceError('Reconnect Strava before sharing activities.', 409);
      await trainingMeter(db, actor, 'writes');
    }
    // Revocation remains available after monthly/minute allowances are exhausted.
    const { rows: [saved] } = await db.query(`INSERT INTO strava_coach_sharing(relationship_id,user_id,generation,relationship_version,enabled)
      VALUES($1,$2,$3,$4,$5) ON CONFLICT(relationship_id) DO UPDATE SET generation=EXCLUDED.generation,
      relationship_version=EXCLUDED.relationship_version,enabled=EXCLUDED.enabled,version=strava_coach_sharing.version+1,updated_at=now()
      RETURNING version`, [input.id,actor.id,connection.generation,relationship.version,input.enabled]);
    return { saved: true, shared: input.enabled, version: saved.version as number };
  });
}
export async function readCoachStrava(actor: MarketplaceActor, query: ReturnType<typeof stravaCoachQuery>): Promise<StravaCoachActivities> {
  requireTraining();
  return marketplaceTransaction(async db => {
    const scope = await trainingScope(db, actor, query.relationship);
    await trainingMeter(db, actor, 'reads');
    const permission = (await db.query(`SELECT c.last_sync FROM strava_coach_sharing s
      JOIN training_relationships r ON r.id=s.relationship_id AND r.athlete_id=s.user_id AND r.version=s.relationship_version
      JOIN strava_connections c ON c.user_id=s.user_id AND c.generation=s.generation
      WHERE r.id=$1 AND r.coach_id=$2 AND r.status='active' AND s.enabled AND c.status='connected' FOR SHARE OF c,s`, [query.relationship,actor.id])).rows[0];
    if (!permission) throw new MarketplaceError('Strava activities are not shared with you. The athlete can enable sharing in Connections → Coach sharing.', 403);
    const { rows } = await db.query<{ summary: StravaActivity }>(`SELECT summary FROM strava_activity_cache a
      WHERE user_id=$1 AND coach_visible AND expires_at>now()
      AND coalesce(started_at,(summary->>'date')::timestamp AT TIME ZONE 'UTC')>now()-interval '365 days'
      AND NOT EXISTS(SELECT 1 FROM strava_activity_jobs j WHERE j.user_id=a.user_id AND j.activity_id=a.activity_id)
      AND ($2::text IS NULL OR (summary->>'date',activity_id)<($2::text,$3::bigint))
      ORDER BY summary->>'date' DESC,activity_id DESC LIMIT 51`, [scope.owner,query.date,query.id]);
    const activities = rows.slice(0,50).map(r => r.summary);
    const last = activities.at(-1);
    return { athleteName: scope.athleteName || 'Athlete', lastSync: permission.last_sync?.toISOString() ?? null, activities,
      nextCursor: rows.length > 50 && last ? `${last.date}|${last.id}` : null };
  });
}
