/** Explicit release operator: runs only in an authorized production build.
 * Credentials stay in Vercel. No credentials or user records are logged.
 * Set ANYSTRIDE_RELEASE_ACTION=migrate, verify-cleanup or cleanup through build-only config.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';
import { randomUUID, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

const action = process.env.ANYSTRIDE_STRAVA_RELEASE;
assert.ok(['inspect', 'prepare', 'schedule', 'verify'].includes(action), 'Explicit Strava release action required');
assert.equal(process.env.VERCEL_ENV, 'production');
assert.equal(process.env.MARKETPLACE_APP_URL, 'https://anystride.com');
const project = 'gwwsxrtmlcnisnbphrfq';
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname, `${project}.supabase.co`);
const source = process.env.MARKETPLACE_DATABASE_SOURCE || 'MARKETPLACE_DATABASE_URL';
assert.ok(['POSTGRES_URL', 'MARKETPLACE_DATABASE_URL'].includes(source));
function connection(value) {
  const u = new URL(value);
  assert.ok(u.hostname === `db.${project}.supabase.co` || (u.hostname.endsWith('.pooler.supabase.com') && decodeURIComponent(u.username) === `postgres.${project}`), 'Unexpected production database');
  for (const k of [...u.searchParams.keys()]) if (k.startsWith('ssl')) u.searchParams.delete(k);
  return { connectionString: u.toString(), ssl: { rejectUnauthorized: true, ca: process.env.MARKETPLACE_DATABASE_CA }, connectionTimeoutMillis: 10000, statement_timeout: 30000, lock_timeout: 5000 };
}
const db = new Client(connection(process.env[source]));
function decrypt(value, context) {
  const [v,iv,tag,data]=value.split('.'); assert.equal(v,'v1');
  const cipher=createDecipheriv('aes-256-gcm',Buffer.from(process.env.STRAVA_TOKEN_KEY,'hex'),Buffer.from(iv,'base64url'));
  cipher.setAAD(Buffer.from(context)); cipher.setAuthTag(Buffer.from(tag,'base64url'));
  return JSON.parse(Buffer.concat([cipher.update(Buffer.from(data,'base64url')),cipher.final()]).toString());
}
function encrypt(value, context) {
  const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',Buffer.from(process.env.STRAVA_TOKEN_KEY,'hex'),iv);
  cipher.setAAD(Buffer.from(context)); const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),data.toString('base64url')].join('.');
}
await db.connect();
try {
  if (action === 'prepare') {
    assert.equal(process.env.STRAVA_SYNC,'off');
    const transfer=decrypt(process.env.ANYSTRIDE_STRAVA_TRANSFER,'anystride-production-transfer');
    assert.equal(transfer.email,'matthias.e.link@gmail.com'); assert.equal(transfer.athlete_id,'1123053');
    assert.ok(Date.now()-transfer.created_at<86400000 && !transfer.scopes.includes('activity:read_all'));
    const user=(await db.query("SELECT id FROM auth.users WHERE lower(email)=$1 AND email_confirmed_at IS NOT NULL AND is_anonymous=false",[transfer.email])).rows[0];
    assert.ok(user,'Verified production account missing');
    await db.query('CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog');
    await db.query('CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions');
    await db.query(readFileSync(new URL('../db/migrations/015_strava_scheduler.sql',import.meta.url),'utf8'));
    const secret=(await db.query("SELECT id FROM vault.secrets WHERE name='anystride_strava_worker'")).rows[0];
    if(secret) await db.query('SELECT vault.update_secret($1,$2)',[secret.id,process.env.CRON_SECRET]);
    else await db.query("SELECT vault.create_secret($1,'anystride_strava_worker','Anystride Strava maintenance authorization')",[process.env.CRON_SECRET]);
    await db.query('BEGIN');
    try {
      const existing=(await db.query('SELECT user_id,athlete_id::text FROM strava_connections WHERE user_id=$1 OR athlete_id=$2 FOR UPDATE',[user.id,transfer.athlete_id])).rows;
      assert.ok(existing.every(r=>r.user_id===user.id && r.athlete_id===transfer.athlete_id),'Conflicting production connection');
      if(!existing.length) {
        const generation=randomUUID();
        await db.query('INSERT INTO strava_connections(user_id,athlete_id,generation,tokens,scopes) VALUES($1,$2,$3,$4,$5)',[user.id,transfer.athlete_id,generation,encrypt(transfer.tokens,`${user.id}:${generation}`),transfer.scopes]);
        await db.query('INSERT INTO strava_sync_jobs(user_id) VALUES($1)',[user.id]);
      }
      await db.query('COMMIT');
    } catch(error) {await db.query('ROLLBACK');throw error;}
    console.log('Production connection transferred to the verified account; coach sharing remains off. Scheduler installed but not activated.');
  }
  if (action === 'schedule') {
    assert.equal(process.env.STRAVA_SYNC,'on');
    await db.query("SELECT cron.schedule('anystride-strava-maintenance','*/15 * * * *','SELECT public.strava_maintenance()')");
    console.log('Database maintenance scheduled every 15 minutes; HTTP only for pending work.');
  }
  if (action === 'verify') {
    const {verifyStravaProduction}=await import('./verify-strava-production.mjs');
    await verifyStravaProduction(db);
  }
  if (action === 'inspect') {
    console.log('Scheduler extensions:', JSON.stringify((await db.query("SELECT name,installed_version,default_version FROM pg_available_extensions WHERE name IN ('pg_cron','pg_net','supabase_vault')")).rows));
    console.log('Production readiness:', JSON.stringify((await db.query("SELECT (SELECT count(*) FROM strava_connections) AS connections, EXISTS(SELECT 1 FROM auth.users WHERE lower(email)='matthias.e.link+coach@gmail.com' AND email_confirmed_at IS NOT NULL) AS authorized_account_exists")).rows[0]));
  }
} catch(error) {
  console.error('Strava release check failed:', error.code || error.name, error.name === 'AssertionError' ? error.message : 'Operator stopped; inspect step summaries.');
  process.exitCode=1;
} finally { await db.end(); }
