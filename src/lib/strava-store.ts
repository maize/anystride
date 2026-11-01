import 'server-only';
import { randomBytes, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { MarketplaceActor } from './marketplace-auth';
import { MarketplaceError } from './marketplace-config';
import { marketplaceTransaction } from './marketplace-store';
import { trainingMeter } from './training-store';
import { requireTraining } from './training-access';
import { encryptStrava, secretHash, sameSecret, stravaConfig, stravaConfigured, stravaTokens } from './strava-config';
import { stravaTokenRequest } from './strava-api';
import { STRAVA_LIMITS, type StravaSnapshot } from './strava';

export async function queueStrava(db: PoolClient, user: string) {
  await db.query(`INSERT INTO strava_sync_jobs(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE
    SET version=strava_sync_jobs.version+1,attempts=0,available_at=now(),expires_at=now()+interval '6 days'`, [user]);
}
export async function beginStrava(actor: MarketplaceActor, privateActivities: boolean) {
  const config = stravaConfig();
  const state = randomBytes(32).toString('hex');
  await marketplaceTransaction(async (db) => {
    await trainingMeter(db, actor, 'writes');
    if ((await db.query('SELECT 1 FROM strava_revocations WHERE user_id=$1', [actor.id])).rowCount) throw new MarketplaceError('Your previous connection is still being removed. Try again shortly.', 409);
    await db.query(`INSERT INTO strava_oauth_states(user_id,state_hash,private_activities,expires_at) VALUES($1,$2,$3,now()+interval '10 minutes')
      ON CONFLICT(user_id) DO UPDATE SET state_hash=EXCLUDED.state_hash,private_activities=EXCLUDED.private_activities,expires_at=EXCLUDED.expires_at`, [actor.id, secretHash(state), privateActivities]);
  });
  const url = new URL('https://www.strava.com/oauth/authorize');
  url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: `${config.origin}/api/strava/callback`, response_type: 'code', approval_prompt: 'force', scope: privateActivities ? 'activity:read,activity:read_all' : 'activity:read', state }).toString();
  return { state, url: url.toString() };
}
export async function finishStrava(actor: MarketplaceActor, state: string, browserState: string | undefined, code: string) {
  stravaConfig();
  if (!/^[a-f0-9]{64}$/.test(state) || !sameSecret(state, browserState) || !/^[A-Za-z0-9_-]{1,2048}$/.test(code)) throw new MarketplaceError('This Strava connection attempt expired. Please connect again.', 400);
  const pending = await marketplaceTransaction(async (db) => {
    await trainingMeter(db, actor, 'writes');
    return (await db.query('SELECT private_activities FROM strava_oauth_states WHERE user_id=$1 AND state_hash=$2 AND expires_at>now()', [actor.id, secretHash(state)])).rows[0];
  });
  if (!pending) throw new MarketplaceError('This Strava connection attempt expired. Please connect again.', 400);
  const raw = await stravaTokenRequest({ grant_type: 'authorization_code', code }) as Record<string, unknown>;
  const tokens = stravaTokens(raw);
  const athleteId = (raw.athlete as { id?: unknown } | undefined)?.id;
  const scopes = typeof raw.scope === 'string' ? raw.scope.split(/[ ,]+/).filter(Boolean) : [];
  // Do not trust the callback's query-string scope. Check the token response.
  if (!Number.isSafeInteger(athleteId) || Number(athleteId) <= 0 || !scopes.includes('activity:read') ||
      (pending.private_activities && !scopes.includes('activity:read_all'))) throw new MarketplaceError('Allow the requested activity access in Strava, then connect again.', 400);
  await marketplaceTransaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended('strava:connections',0))");
    // Consume only at commit: disconnect/new authorization can cancel an in-flight callback.
    const consumed = await db.query('DELETE FROM strava_oauth_states WHERE user_id=$1 AND state_hash=$2 AND expires_at>now() RETURNING user_id', [actor.id, secretHash(state)]);
    if (!consumed.rowCount) throw new MarketplaceError('This Strava connection attempt expired. Please connect again.', 400);
    const existing = (await db.query('SELECT athlete_id::text FROM strava_connections WHERE user_id=$1 FOR UPDATE', [actor.id])).rows[0];
    if (existing && existing.athlete_id !== String(athleteId)) throw new MarketplaceError('Disconnect your current Strava account before connecting another one.', 409);
    const used = await db.query('SELECT 1 FROM strava_connections WHERE athlete_id=$1 AND user_id<>$2', [athleteId, actor.id]);
    if (used.rowCount) throw new MarketplaceError('This Strava account is already connected to another Anystride account.', 409);
    if (!existing && Number((await db.query('SELECT count(*) FROM strava_connections')).rows[0].count) >= STRAVA_LIMITS.athletes) throw new MarketplaceError('The Strava beta is full. Please contact Anystride.', 409);
    if ((await db.query('SELECT 1 FROM strava_revocations WHERE user_id=$1', [actor.id])).rowCount) throw new MarketplaceError('Your previous connection is still being removed. Try again shortly.', 409);
    const generation = randomUUID();
    await db.query(`INSERT INTO strava_connections(user_id,athlete_id,generation,tokens,scopes) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(user_id) DO UPDATE SET generation=EXCLUDED.generation,tokens=EXCLUDED.tokens,scopes=EXCLUDED.scopes,status='connected',last_sync=NULL,last_full_sync=NULL,message=NULL,next_refresh=now()`, [actor.id, athleteId, generation, encryptStrava(tokens, `${actor.id}:${generation}`), pending.private_activities ? 'activity:read activity:read_all' : 'activity:read']);
    await db.query('DELETE FROM strava_activity_cache WHERE user_id=$1', [actor.id]);
    await db.query('DELETE FROM strava_sync_jobs WHERE user_id=$1', [actor.id]);
    await db.query('DELETE FROM strava_activity_jobs WHERE user_id=$1', [actor.id]);
    await queueStrava(db, actor.id);
  });
}
export async function readStrava(actor: MarketplaceActor): Promise<StravaSnapshot> {
  requireTraining();
  const empty: StravaSnapshot = { available: stravaConfigured(), connected: false, reconnect: false, lastSync: null, pending: false, message: null, privateActivities: false, activities: [] };
  // Connection controls remain available when sync is paused; credentials need not be exposed.
  return marketplaceTransaction(async (db) => {
    await trainingMeter(db, actor, 'reads');
    await db.query('DELETE FROM strava_activity_cache WHERE user_id=$1 AND expires_at<=now()', [actor.id]);
    const row = (await db.query(`SELECT status,scopes,last_sync,message,EXISTS(SELECT 1 FROM strava_sync_jobs j WHERE j.user_id=c.user_id) OR EXISTS(SELECT 1 FROM strava_activity_jobs a WHERE a.user_id=c.user_id) AS pending FROM strava_connections c WHERE user_id=$1`, [actor.id])).rows[0];
    if (!row) return empty;
    const activities = await db.query("SELECT summary FROM strava_activity_cache WHERE user_id=$1 AND expires_at>now() AND coalesce(started_at,(summary->>'date')::timestamp AT TIME ZONE 'UTC')>now()-interval '365 days' ORDER BY summary->>'date' DESC,activity_id DESC", [actor.id]);
    return { ...empty, connected: true, reconnect: row.status === 'reconnect', privateActivities: row.scopes.split(' ').includes('activity:read_all'), lastSync: row.last_sync?.toISOString() ?? null, message: row.message, pending: row.pending, activities: activities.rows.map((r) => r.summary) };
  });
}
export async function refreshStrava(actor: MarketplaceActor) {
  stravaConfig();
  await marketplaceTransaction(async (db) => {
    await trainingMeter(db, actor, 'writes');
    const row = (await db.query("UPDATE strava_connections SET next_refresh=now()+interval '15 minutes' WHERE user_id=$1 AND status='connected' AND next_refresh<=now() RETURNING user_id", [actor.id])).rows[0];
    if (!row) throw new MarketplaceError('Connect Strava first, or wait 15 minutes between refreshes.', 429);
    await queueStrava(db, actor.id);
  });
}
export async function disconnectStrava(actor: MarketplaceActor) {
  requireTraining();
  await marketplaceTransaction(async (db) => {
    await trainingMeter(db, actor, 'writes');
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended('strava:connections',0))");
    const row = (await db.query('SELECT tokens,generation FROM strava_connections WHERE user_id=$1 FOR UPDATE', [actor.id])).rows[0];
    if (row) await db.query('INSERT INTO strava_revocations(user_id,tokens,generation) VALUES($1,$2,$3) ON CONFLICT(user_id) DO NOTHING', [actor.id, row.tokens, row.generation]);
    await db.query('DELETE FROM strava_connections WHERE user_id=$1', [actor.id]);
    await db.query('DELETE FROM strava_oauth_states WHERE user_id=$1', [actor.id]);
  });
  return { message: 'Disconnected. All synced activities have been deleted from Anystride. Strava access revocation is queued.' };
}

export async function receiveStravaEvent(value: unknown) {
  if (!value || typeof value !== 'object') throw new MarketplaceError('Invalid event.', 400);
  const v = value as Record<string, unknown>;
  const updates = v.updates as Record<string, unknown> | undefined;
  if (!Number.isSafeInteger(v.owner_id) || Number(v.owner_id)<=0 || !Number.isSafeInteger(v.object_id) || Number(v.object_id)<=0 ||
      !Number.isSafeInteger(v.event_time) || Number(v.event_time)>Date.now()/1000+300 || Number(v.event_time)<Date.now()/1000-7*86400 ||
      !['activity','athlete'].includes(String(v.object_type)) || !['create','update','delete'].includes(String(v.aspect_type)) ||
      !process.env.STRAVA_SUBSCRIPTION_ID || String(v.subscription_id)!==process.env.STRAVA_SUBSCRIPTION_ID) throw new MarketplaceError('Invalid event.', 400);
  return marketplaceTransaction(async (db) => {
    const row = (await db.query('SELECT user_id FROM strava_connections WHERE athlete_id=$1 FOR UPDATE', [v.owner_id])).rows[0];
    if (!row) return;
    if (v.object_type === 'athlete') {
      if (updates?.authorized === 'false' && v.object_id === v.owner_id) {
        await db.query('DELETE FROM strava_connections WHERE user_id=$1', [row.user_id]);
        await db.query('DELETE FROM strava_oauth_states WHERE user_id=$1', [row.user_id]);
      }
      return;
    }
    if (v.aspect_type === 'delete') {
      await db.query('DELETE FROM strava_activity_jobs WHERE user_id=$1 AND activity_id=$2', [row.user_id, v.object_id]);
      await db.query('DELETE FROM strava_activity_cache WHERE user_id=$1 AND activity_id=$2', [row.user_id, v.object_id]);
      // Prevent an older in-flight list response from restoring deleted/private data.
      await db.query(`INSERT INTO strava_deleted_activities(user_id,activity_id,expires_at,event_time) VALUES($1,$2,now()+interval '6 days',$3) ON CONFLICT(user_id,activity_id) DO UPDATE SET expires_at=EXCLUDED.expires_at,event_time=greatest(strava_deleted_activities.event_time,EXCLUDED.event_time)`, [row.user_id, v.object_id,v.event_time]);
    }
    if (v.aspect_type === 'create') await db.query('DELETE FROM strava_deleted_activities WHERE user_id=$1 AND activity_id=$2 AND event_time<$3', [row.user_id,v.object_id,v.event_time]);
    // Hide changed activities from coaches until the provider confirms privacy.
    if (v.aspect_type !== 'delete') await db.query('UPDATE strava_activity_cache SET coach_visible=false WHERE user_id=$1 AND activity_id=$2', [row.user_id,v.object_id]);
    // Coalesce changes by activity so an edit to an old run needs one detail read,
    // not another full-year download. Deletes never fetch the deleted resource.
    if (v.aspect_type !== 'delete') await db.query(`INSERT INTO strava_activity_jobs(user_id,activity_id) VALUES($1,$2)
      ON CONFLICT(user_id,activity_id) DO UPDATE SET version=strava_activity_jobs.version+1,available_at=now(),expires_at=now()+interval '6 days'`, [row.user_id,v.object_id]);
    // Invalidate a list response already in flight without restarting its cursor.
    await db.query('UPDATE strava_sync_jobs SET version=version+1 WHERE user_id=$1', [row.user_id]);
  });
}
