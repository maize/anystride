/** Explicit release operator: runs only in an authorized production build.
 * Credentials stay in Vercel. No credentials or user records are logged.
 * Set ANYSTRIDE_RELEASE_ACTION=migrate, verify-cleanup or cleanup through build-only config.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

const action = process.env.ANYSTRIDE_RELEASE_ACTION;
assert.ok(['migrate', 'cleanup', 'verify-cleanup'].includes(action), 'Explicit release action required');
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
const fixture = process.env.ANYSTRIDE_RELEASE_FIXTURE;
assert.match(fixture || '', /^[a-f0-9]{64}$/, 'Private release fixture seed required');
const tag = createHash('sha256').update(fixture).digest('hex').slice(0, 24);
const roles = ['coach', 'athlete', 'other'];
const email = role => `release-${tag}-${role}@example.invalid`;
const password = role => createHash('sha256').update(`${fixture}:${role}`).digest('base64url');
const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
await db.connect();
try {
  assert.ok((await db.query("SELECT to_regclass('public.marketplace_coaches') AS coaches, to_regclass('public.coach_storefronts') AS storefronts")).rows[0].coaches, 'Missing marketplace schema');
  if (action === 'migrate') {
    // Each supplied migration owns its transaction. They are additive/idempotent.
    const files = ['008_training_workspace.sql', '009_training_coaching.sql', '010_structured_training_plans.sql', '011_strava_sync.sql', '012_strava_history.sql', '013_strava_coach_sharing.sql', '014_strava_workout_matches.sql'];
    for (const file of files) { await db.query(readFileSync(new URL(`../db/migrations/${file}`, import.meta.url), 'utf8')); console.log(`Release migration applied: ${file}`); }
    const enquiries = new Client(connection(process.env.POSTGRES_URL || process.env.DATABASE_URL));
    await enquiries.connect();
    try {
      if ((await enquiries.query("SELECT to_regclass('public.commercial_enquiries') AS t")).rows[0].t) await enquiries.query(readFileSync(new URL('../db/migrations/007_private_commercial_enquiries.sql', import.meta.url), 'utf8'));
    } finally { await enquiries.end(); }
    const tables = await db.query(`SELECT c.relname,c.relrowsecurity,
      has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') AS anon_access,
      has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') AS authenticated_access
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r' AND (c.relname LIKE 'training_%' OR c.relname LIKE 'strava_%')`);
    assert.equal(tables.rows.length, 15);
    assert.ok(tables.rows.every(r => r.relrowsecurity && !r.anon_access && !r.authenticated_access));
    console.log('Release schema verification: 15 private tables, RLS enabled, browser privileges denied.');
    for (const role of roles) {
      const existing = await db.query('SELECT id,raw_app_meta_data FROM auth.users WHERE email=$1', [email(role)]);
      let id;
      if (existing.rows.length) {
        assert.equal(existing.rows[0].raw_app_meta_data.anystride_release, tag, 'Refusing to modify a non-fixture account');
        id = existing.rows[0].id;
      } else {
        const result = await auth.auth.admin.createUser({ email: email(role), password: password(role), email_confirm: true, app_metadata: { anystride_release: tag } });
        assert.ok(!result.error, `Release fixture creation failed (${role})`);
        id = result.data.user.id;
      }
      if (role === 'coach') await db.query("INSERT INTO marketplace_coaches(user_id,name,bio,credentials,status) VALUES($1,'Release verification coach','Temporary private release verification account.','Release verification only','approved') ON CONFLICT(user_id) DO NOTHING", [id]);
    }
    console.log('Release verification identities ready; no emails sent or public profiles created.');
  } else {
    let verificationError;
    if (action === 'verify-cleanup') {
      try {
        process.argv = [process.execPath, 'verify-training-production.mjs', 'https://anystride.com', '@env', '@env'];
        await import('./verify-training-production.mjs');
      } catch (error) { verificationError = error; }
    }
    const result = await db.query('SELECT id,raw_app_meta_data FROM auth.users WHERE email=ANY($1::text[])', [roles.map(email)]);
    assert.ok(result.rows.every(r => r.raw_app_meta_data.anystride_release === tag));
    const ids = result.rows.map(r => r.id);
    await db.query('BEGIN');
    try {
      for (const query of [
        'DELETE FROM strava_connections WHERE user_id=ANY($1::text[])',
        'DELETE FROM training_plan_assignments WHERE coach_id=ANY($1::text[]) OR athlete_id=ANY($1::text[])',
        'DELETE FROM training_plans WHERE coach_id=ANY($1::text[])',
        'DELETE FROM training_relationships WHERE coach_id=ANY($1::text[]) OR athlete_id=ANY($1::text[])',
        'DELETE FROM training_entries WHERE user_id=ANY($1::text[])',
        'DELETE FROM training_usage WHERE user_id=ANY($1::text[])',
        'DELETE FROM marketplace_coaches WHERE user_id=ANY($1::text[])',
      ]) await db.query(query, [ids]);
      await db.query('COMMIT');
    } catch (error) { await db.query('ROLLBACK'); throw error; }
    for (const id of ids) { const result = await auth.auth.admin.deleteUser(id); assert.ok(!result.error, 'Release fixture cleanup failed'); }
    assert.equal((await db.query('SELECT count(*)::int AS n FROM auth.users WHERE email=ANY($1::text[])', [roles.map(email)])).rows[0].n, 0);
    console.log('Release cleanup verified: temporary identities and all their training records removed.');
    if (verificationError) throw verificationError;
  }
} finally { await db.end(); }
