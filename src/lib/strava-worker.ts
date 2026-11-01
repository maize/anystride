import 'server-only';
import { randomUUID } from 'node:crypto';
import { marketplaceTransaction } from './marketplace-store';
import { decryptStrava, encryptStrava, stravaConfigured, stravaTokens } from './strava-config';
import { revokeStravaToken, StravaApiError, stravaRequest, stravaTokenRequest } from './strava-api';
import { STRAVA_LIMITS, stravaSummary, type StravaActivity } from './strava';

export async function cleanupStrava() {
  await marketplaceTransaction(async (db) => {
    await db.query("DELETE FROM strava_activity_cache WHERE expires_at<=now() OR started_at<=now()-interval '365 days'");
    await db.query('DELETE FROM strava_activity_jobs WHERE expires_at<=now()');
    await db.query('DELETE FROM strava_deleted_activities WHERE expires_at<=now()');
    await db.query('DELETE FROM strava_oauth_states WHERE expires_at<=now()');
    await db.query('DELETE FROM strava_sync_jobs WHERE expires_at<=now()');
    await db.query('DELETE FROM strava_revocations WHERE expires_at<=now()');
    await db.query('UPDATE strava_runtime SET last_cleanup=now() WHERE id=1');
  });
}

async function accessToken(user: string, generation: string) {
  // Serializes refresh with disconnect/reconnect, including refresh-token rotation.
  return marketplaceTransaction(async (db) => {
    const row = (await db.query("SELECT tokens FROM strava_connections WHERE user_id=$1 AND generation=$2 AND status='connected' FOR UPDATE", [user, generation])).rows[0];
    if (!row) return null;
    let tokens = stravaTokens(decryptStrava(row.tokens, `${user}:${generation}`));
    if (tokens.expires_at * 1000 <= Date.now() + 60000) {
      tokens = stravaTokens(await stravaTokenRequest({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token }));
      await db.query('UPDATE strava_connections SET tokens=$3 WHERE user_id=$1 AND generation=$2', [user, generation, encryptStrava(tokens, `${user}:${generation}`)]);
    }
    return tokens.access_token;
  });
}

/** Webhook-driven detail reads also cover edits to older activities. */
async function syncChangedActivities(lease: string, deadline: number) {
  const jobs = await marketplaceTransaction(db => db.query(`SELECT j.*,c.generation,c.athlete_id::text,c.scopes FROM strava_activity_jobs j
    JOIN strava_connections c ON c.user_id=j.user_id WHERE c.status='connected' AND j.available_at<=now() AND j.expires_at>now()
    ORDER BY j.available_at LIMIT 2`));
  for (const job of jobs.rows) {
    if (Date.now() >= deadline) break;
    try {
      const token = await accessToken(job.user_id,job.generation);
      if (!token) continue;
      let summary: StravaActivity | null = null;
      let started = 0;
      let coachVisible = false;
      try {
        const item = await stravaRequest(`/api/v3/activities/${job.activity_id}`, { headers: { Authorization: `Bearer ${token}` } }) as Record<string, unknown>;
        if (!item || String((item.athlete as { id?: unknown })?.id) !== job.athlete_id || String(item.id) !== String(job.activity_id)) throw new StravaApiError(502);
        started = typeof item.start_date === 'string' ? Date.parse(item.start_date)/1000 : NaN;
        if (!Number.isFinite(started)) throw new StravaApiError(502);
        if (!(item.private === true && !job.scopes.split(' ').includes('activity:read_all')) && started > Date.now()/1000-STRAVA_LIMITS.historyDays*86400 && started <= Date.now()/1000) {
          summary = stravaSummary(item);
          coachVisible = item.private === false && item.visibility !== 'only_me';
          if (!summary) throw new StravaApiError(502);
        }
      } catch (error) { if (!(error instanceof StravaApiError && error.status === 404)) throw error; }
      await marketplaceTransaction(async db => {
        if (!(await db.query('SELECT user_id FROM strava_connections WHERE user_id=$1 AND generation=$2 FOR UPDATE',[job.user_id,job.generation])).rowCount) return;
        if (!(await db.query('SELECT activity_id FROM strava_activity_jobs WHERE user_id=$1 AND activity_id=$2 AND version=$3 FOR UPDATE',[job.user_id,job.activity_id,job.version])).rowCount) return;
        if (!(await db.query('SELECT id FROM strava_runtime WHERE id=1 AND lease=$1 AND leased_until>now()',[lease])).rowCount) return;
        if (summary) await db.query(`INSERT INTO strava_activity_cache(user_id,activity_id,summary,started_at,fetched_at,expires_at,coach_visible)
          SELECT $1,$2,$3,to_timestamp($4),now(),now()+interval '6 days',$5 WHERE NOT EXISTS(SELECT 1 FROM strava_deleted_activities WHERE user_id=$1 AND activity_id=$2 AND expires_at>now())
          ON CONFLICT(user_id,activity_id) DO UPDATE SET summary=EXCLUDED.summary,started_at=EXCLUDED.started_at,fetched_at=EXCLUDED.fetched_at,expires_at=EXCLUDED.expires_at,coach_visible=EXCLUDED.coach_visible`,[job.user_id,job.activity_id,JSON.stringify(summary),started,coachVisible]);
        else await db.query('DELETE FROM strava_activity_cache WHERE user_id=$1 AND activity_id=$2',[job.user_id,job.activity_id]);
        await db.query('DELETE FROM strava_activity_jobs WHERE user_id=$1 AND activity_id=$2 AND version=$3',[job.user_id,job.activity_id,job.version]);
      });
    } catch (error) {
      const auth = error instanceof StravaApiError && [400,401,403].includes(error.status);
      await marketplaceTransaction(async db => {
        if (!(await db.query('SELECT user_id FROM strava_connections WHERE user_id=$1 AND generation=$2 FOR UPDATE',[job.user_id,job.generation])).rowCount) return;
        if (auth) {
          await db.query('DELETE FROM strava_activity_cache WHERE user_id=$1',[job.user_id]);
          await db.query("UPDATE strava_connections SET status='reconnect',message='Strava access has expired. Reconnect to resume syncing.' WHERE user_id=$1",[job.user_id]);
          await db.query('DELETE FROM strava_activity_jobs WHERE user_id=$1',[job.user_id]);
          await db.query('DELETE FROM strava_sync_jobs WHERE user_id=$1',[job.user_id]);
        } else await db.query("UPDATE strava_activity_jobs SET available_at=now()+$4*interval '1 second' WHERE user_id=$1 AND activity_id=$2 AND version=$3",[job.user_id,job.activity_id,job.version,error instanceof StravaApiError ? error.retrySeconds : 900]);
      });
      if (error instanceof StravaApiError && error.status === 429) break;
    }
  }
}

/** Stop starting jobs after 30s, leaving room for token refresh, a fetch and SQL within 60s. */
export async function runStravaWorker() {
  const deadline = Date.now() + 30000;
  await cleanupStrava();
  const lease = randomUUID();
  const acquired = await marketplaceTransaction((db) => db.query("UPDATE strava_runtime SET lease=$1,leased_until=now()+interval '120 seconds' WHERE id=1 AND leased_until<=now() RETURNING id", [lease]));
  if (!acquired.rowCount) return { processed: 0 };
  let processed = 0;
  try {
    // Revocation keeps retrying after local erasure, even when new syncs are paused.
    if (process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET && process.env.STRAVA_TOKEN_KEY) {
      const revocations = await marketplaceTransaction((db) => db.query('SELECT user_id,tokens,generation FROM strava_revocations ORDER BY expires_at LIMIT 2'));
      for (const row of revocations.rows) {
        if (Date.now() >= deadline) break;
        try {
          const token = stravaTokens(decryptStrava(row.tokens, `${row.user_id}:${row.generation}`));
          await revokeStravaToken(token.refresh_token);
          await marketplaceTransaction((db) => db.query('DELETE FROM strava_revocations WHERE user_id=$1 AND generation=$2', [row.user_id, row.generation]));
        } catch { /* The encrypted outbox survives failures; cron retries, never logs credentials. */ }
      }
    }
    if (!stravaConfigured()) return { processed };
    await syncChangedActivities(lease, deadline);
    for (let i = 0; i < 3 && Date.now() < deadline; i++) {
      const job = await marketplaceTransaction(async (db) => (await db.query(`SELECT j.*,c.generation,c.athlete_id::text,c.scopes,c.last_sync,c.last_full_sync FROM strava_sync_jobs j
        JOIN strava_connections c ON c.user_id=j.user_id WHERE c.status='connected' AND j.available_at<=now() AND j.expires_at>now()
        ORDER BY j.available_at,j.user_id LIMIT 1`)).rows[0]);
      if (!job) break;
      try {
        const token = await accessToken(job.user_id, job.generation);
        if (!token) continue;
        if (!job.scan_id) {
          const before = Math.floor(Date.now()/1000);
          const full = !job.last_full_sync || Date.now()-new Date(job.last_full_sync).getTime() >= 5*86400000;
          const after = full ? before-STRAVA_LIMITS.historyDays*86400 : Math.max(before-STRAVA_LIMITS.historyDays*86400, Math.floor(new Date(job.last_sync).getTime()/1000)-86400);
          const initialized = await marketplaceTransaction(db => db.query(`UPDATE strava_sync_jobs SET scan_id=$3,scan_before=$4,scan_after=$5,full_history=$6,page=1
            WHERE user_id=$1 AND version=$2 RETURNING *`, [job.user_id,job.version,randomUUID(),before,after,full]));
          if (!initialized.rowCount) continue;
          Object.assign(job, initialized.rows[0]);
        }
        const before = Number(job.scan_before), after = Number(job.scan_after);
        // A fixed before cursor and increasing page keep equal-timestamp activities.
        // Do not use after: that can return the earliest matching page first.
        const raw = await stravaRequest(`/api/v3/athlete/activities?before=${before}&per_page=${STRAVA_LIMITS.pageSize}&page=${job.page}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!Array.isArray(raw) || raw.length > STRAVA_LIMITS.pageSize) throw new StravaApiError(502);
        const summaries: Array<{ summary: StravaActivity; started: number; coachVisible: boolean }> = [];
        let reachedBoundary = false;
        for (const item of raw) {
          if (!item || typeof item !== 'object' || String(item.athlete?.id) !== job.athlete_id) throw new StravaApiError(502);
          const started = typeof item.start_date === 'string' ? Date.parse(item.start_date)/1000 : NaN;
          if (!Number.isFinite(started)) throw new StravaApiError(502);
          if (started <= after) { reachedBoundary = true; continue; }
          if (started > before || (item.private === true && !job.scopes.split(' ').includes('activity:read_all'))) continue;
          const summary = stravaSummary(item);
          if (summary) summaries.push({ summary, started, coachVisible: item.private === false && item.visibility !== 'only_me' }); else throw new StravaApiError(502);
        }
        const complete = raw.length < STRAVA_LIMITS.pageSize || reachedBoundary;
        await marketplaceTransaction(async (db) => {
          const connected = await db.query('SELECT user_id FROM strava_connections WHERE user_id=$1 AND generation=$2 FOR UPDATE', [job.user_id, job.generation]);
          if (!connected.rowCount) return;
          const current = await db.query('SELECT user_id FROM strava_sync_jobs WHERE user_id=$1 AND version=$2 FOR UPDATE', [job.user_id, job.version]);
          if (!current.rowCount) return;
          const liveLease = await db.query('SELECT id FROM strava_runtime WHERE id=1 AND lease=$1 AND leased_until>now()', [lease]);
          if (!liveLease.rowCount) return;
          // Refresh only data actually fetched. Unvisited history keeps its expiry.
          await db.query(`INSERT INTO strava_activity_cache(user_id,activity_id,summary,expires_at,scan_id,started_at,fetched_at,coach_visible)
            SELECT $1,(a->'summary'->>'id')::bigint,a->'summary',now()+interval '6 days',$3,to_timestamp((a->>'started')::double precision),now(),(a->>'coachVisible')::boolean
            FROM jsonb_array_elements($2::jsonb) a
            WHERE NOT EXISTS(SELECT 1 FROM strava_deleted_activities d WHERE d.user_id=$1 AND d.activity_id=(a->'summary'->>'id')::bigint AND d.expires_at>now())
            ON CONFLICT(user_id,activity_id) DO UPDATE SET summary=EXCLUDED.summary,expires_at=EXCLUDED.expires_at,scan_id=EXCLUDED.scan_id,started_at=EXCLUDED.started_at,fetched_at=EXCLUDED.fetched_at,coach_visible=EXCLUDED.coach_visible`, [job.user_id, JSON.stringify(summaries),job.scan_id]);
          if (complete) {
            // Remove omitted/deleted items after a full pass, but preserve changes
            // fetched from webhooks after this scan began.
            if (job.full_history) await db.query('DELETE FROM strava_activity_cache WHERE user_id=$1 AND scan_id IS DISTINCT FROM $2 AND fetched_at<to_timestamp($3)', [job.user_id,job.scan_id,before]);
            await db.query('UPDATE strava_connections SET last_sync=to_timestamp($2),last_full_sync=CASE WHEN $3 THEN to_timestamp($2) ELSE last_full_sync END,message=NULL WHERE user_id=$1', [job.user_id,before,job.full_history]);
            await db.query('DELETE FROM strava_sync_jobs WHERE user_id=$1 AND version=$2', [job.user_id, job.version]);
          } else {
            await db.query('UPDATE strava_sync_jobs SET page=page+1,attempts=0,available_at=now() WHERE user_id=$1 AND version=$2', [job.user_id,job.version]);
            await db.query("UPDATE strava_connections SET message='Loading the rest of your year. Progress is saved between batches.' WHERE user_id=$1", [job.user_id]);
          }
        });
        processed++;
      } catch (error) {
        const auth = error instanceof StravaApiError && [400,401,403].includes(error.status);
        const retry = error instanceof StravaApiError ? error.retrySeconds : Math.min(3600, 60 * 2 ** Math.min(job.attempts, 6));
        await marketplaceTransaction(async (db) => {
          const found = await db.query('SELECT user_id FROM strava_connections WHERE user_id=$1 AND generation=$2 FOR UPDATE', [job.user_id, job.generation]);
          if (!found.rowCount) return;
          if (auth) {
            await db.query('DELETE FROM strava_activity_cache WHERE user_id=$1', [job.user_id]);
            await db.query("UPDATE strava_connections SET status='reconnect',message='Strava access has expired. Reconnect to resume syncing.' WHERE user_id=$1", [job.user_id]);
            await db.query('DELETE FROM strava_sync_jobs WHERE user_id=$1', [job.user_id]);
          } else {
            await db.query("UPDATE strava_sync_jobs SET attempts=attempts+1,available_at=now()+$3*interval '1 second' WHERE user_id=$1 AND version=$2", [job.user_id, job.version, retry]);
            await db.query("UPDATE strava_connections SET message='Sync is delayed. We will retry automatically; you can check again later.' WHERE user_id=$1", [job.user_id]);
          }
        });
        if (error instanceof StravaApiError && error.status === 429) break;
      }
    }
    return { processed };
  } finally {
    await marketplaceTransaction((db) => db.query('UPDATE strava_runtime SET leased_until=now() WHERE id=1 AND lease=$1', [lease]));
  }
}
