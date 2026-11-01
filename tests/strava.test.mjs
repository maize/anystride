import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { NextResponse } from 'next/server.js';
import { load } from './support/load-module.mjs';
const athlete = { id: 'athlete', email: 'athlete@example.test', admin: false };
const other = { id: 'coach', email: 'coach@example.test', admin: true };
const fixtureActivity = (extra = {}) => ({ id: 101, athlete: { id: 123 }, name: 'Morning run', sport_type: 'Run', start_date: new Date(Date.now()-86400000).toISOString(), start_date_local: '2026-10-17T08:30:00Z', distance: 5000, moving_time: 1500, elapsed_time: 1550, total_elevation_gain: 43, device_name: 'Garmin Forerunner', private: false, map: { summary_polyline: 'NEVER_STORE' }, description: 'NEVER_STORE', ...extra });
const event = (extra = {}) => ({ object_type: 'activity', object_id: 101, aspect_type: 'create', owner_id: 123, subscription_id: 789, event_time: Math.floor(Date.now()/1000), ...extra });
async function fixture(t, clock = Date) {
  const db = new PGlite(); t.after(() => db.close());
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  for (const name of ['002_marketplace','008_training_workspace','009_training_coaching','010_structured_training_plans','011_strava_sync','012_strava_history','013_strava_coach_sharing','014_strava_workout_matches','014_strava_workout_matches']) await db.exec(readFileSync(new URL(`../db/migrations/${name}.sql`, import.meta.url), 'utf8'));
  class Pool { on() {} query = (sql, params) => db.query(sql, params); async connect() { return { query: this.query, release() {} }; } }
  const env = { TRAINING_WORKSPACE: 'on', MARKETPLACE_MODE: 'pilot', MARKETPLACE_APP_URL: 'http://localhost:3010', MARKETPLACE_DATABASE_URL: 'postgresql://localhost/fixture', NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.test', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture', STRAVA_SYNC: 'on', STRAVA_CLIENT_ID: '1234', STRAVA_CLIENT_SECRET: 'fixture-secret', STRAVA_TOKEN_KEY: 'ab'.repeat(32), STRAVA_WEBHOOK_SECRET: 'cd'.repeat(32), STRAVA_VERIFY_TOKEN: 'ef'.repeat(32), STRAVA_SUBSCRIPTION_ID: '789', CRON_SECRET: 'cron'.repeat(12) };
  let who = athlete; let cookie; const afters = []; const calls = [];
  let activities = [fixtureActivity()]; let tokenId = 123; let tokenScope = 'activity:read'; let tokenExpiry = Math.floor(Date.now()/1000)+21600; let providerHook;
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    assert.ok(url.startsWith('https://www.strava.com/')); assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
    if (providerHook) { const response = await providerHook(url, options); if (response) return response; }
    if (url.endsWith('/oauth/token')) return Response.json({ access_token: 'access-fixture', refresh_token: 'refresh-fixture', expires_at: tokenExpiry, athlete: { id: tokenId }, scope: tokenScope });
    if (url.endsWith('/oauth/revoke')) return new Response(null, { status: 200 });
    if (/\/api\/v3\/activities\/\d+$/.test(url)) {
      const item=activities.find(a=>String(a.id)===url.split('/').at(-1));
      return item ? Response.json(item) : new Response(null,{status:404});
    }
    const page=Number(new URL(url).searchParams.get('page') || 1);
    return Response.json(activities.slice((page-1)*100,page*100));
  };
  const mocks = { 'server-only': {}, pg: { Pool }, 'next/server': { NextResponse, after: (fn) => afters.push(fn) }, 'next/headers': { cookies: async () => ({ get: () => cookie ? { value: cookie } : undefined }) }, '@/lib/marketplace-auth': { requireMarketplaceActor: async () => { if (!who) throw new (get('src/lib/marketplace-config.ts').MarketplaceError)('Sign in.', 401); return who; } } };
  const globals = { Date: clock, Request, Response, URLSearchParams, fetch: fetcher, process: { env }, console }; const cache = new Map();
  const get = (file) => load(file, mocks, globals, cache);
  const store = get('src/lib/strava-store.ts'); const worker = get('src/lib/strava-worker.ts'); const config = get('src/lib/strava-config.ts');
  const route = get('src/app/api/strava/activities/route.ts');
  async function connect(actor = athlete, privateActivities = false) { const start = await store.beginStrava(actor, privateActivities); await store.finishStrava(actor, start.state, start.state, 'code'); return start; }
  async function post(action, actor = athlete, origin = env.MARKETPLACE_APP_URL, query = '') { who = actor; return route.POST(new Request(`${env.MARKETPLACE_APP_URL}/api/strava/activities${query}`, { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })); }
  async function read(actor = athlete, query = '') { who = actor; return route.GET(new Request(`${env.MARKETPLACE_APP_URL}/api/strava/activities${query}`)); }
  return { db, env, get, store, worker, config, connect, post, read, calls, afters,
    setActivities: (v) => { activities = v; }, setToken: (id, scope = 'activity:read', expiry = tokenExpiry) => { tokenId = id; tokenScope = scope; tokenExpiry = expiry; }, hook: (fn) => { providerHook = fn; }, as: (v) => { who = v; }, cookie: (v) => { cookie = v; } };
}
test('Strava tokens use authenticated encryption bound to account and generation', () => {
  const config = load('src/lib/strava-config.ts', { 'server-only': {} }, { process: { env: { STRAVA_TOKEN_KEY: 'ab'.repeat(32) } } });
  const value = config.encryptStrava({ refresh_token: 'sensitive' }, 'user:generation');
  assert.ok(!value.includes('sensitive')); assert.equal(config.decryptStrava(value, 'user:generation').refresh_token, 'sensitive');
  assert.throws(() => config.decryptStrava(value, 'other:generation'));
  assert.throws(() => config.decryptStrava(value.slice(0,-3)+'xxx', 'user:generation'));
  assert.equal(config.sameSecret('', ''), false);
});
test('Strava OAuth validates browser state, user, granted scopes, expiry and replay', async (t) => {
  const f = await fixture(t); const start = await f.store.beginStrava(athlete, false);
  assert.equal(new URL(start.url).searchParams.get('scope'), 'activity:read');
  await assert.rejects(f.store.finishStrava(athlete,start.state,'bad','code'), /expired/);
  await assert.rejects(f.store.finishStrava(other,start.state,start.state,'code'), /expired/);
  assert.equal(f.calls.length,0);
  f.setToken(123,'read'); await assert.rejects(f.store.finishStrava(athlete,start.state,start.state,'code'), /Allow/);
  f.setToken(123); await f.store.finishStrava(athlete,start.state,start.state,'code');
  const saved = (await f.db.query('SELECT * FROM strava_connections')).rows[0];
  assert.ok(!saved.tokens.includes('refresh-fixture'));
  await assert.rejects(f.store.finishStrava(athlete,start.state,start.state,'code'), /expired/);
  const second = await f.store.beginStrava(other,false);
  await f.db.exec("UPDATE strava_oauth_states SET expires_at=now()-interval '1 second'");
  await assert.rejects(f.store.finishStrava(other,second.state,second.state,'code'), /expired/);
});
test('OAuth routes use HttpOnly cookies, fixed redirects and verify consent before connecting', async (t) => {
  const f = await fixture(t); const route = f.get('src/app/api/strava/connect/route.ts');
  const req = (body, origin = f.env.MARKETPLACE_APP_URL) => new Request(`${f.env.MARKETPLACE_APP_URL}/api/strava/connect`, { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await route.POST(req({ consent: false, privateActivities: false }))).status,400);
  assert.equal((await route.POST(req({ consent: true, privateActivities: false },'https://evil.test'))).status,403);
  const response = await route.POST(req({ consent: true, privateActivities: false })); assert.equal(response.status,200); assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  const state = new URL((await response.json()).url).searchParams.get('state'); f.cookie(state);
  const callback = f.get('src/app/api/strava/callback/route.ts');
  const done = await callback.GET(new Request(`http://evil.test/api/strava/callback?state=${state}&code=code&next=https://evil.test`));
  assert.equal(done.status,303); assert.equal(done.headers.get('location'),'http://localhost:3010/account/connections?strava=connected');
  assert.match(done.headers.get('cache-control'), /no-store/); assert.equal(f.afters.length,1);
  await f.afters[0](); assert.equal((await f.store.readStrava(athlete)).activities.length,1);
});
test('OAuth private scope and beta capacity are enforced and Strava identities cannot cross accounts', async (t) => {
  const f = await fixture(t); await assert.rejects(f.connect(athlete,true), /Allow/);
  f.setToken(123,'activity:read activity:read_all'); await f.connect(athlete,true);
  assert.equal((await f.store.readStrava(athlete)).privateActivities,true);
  await assert.rejects(f.connect(other), /another Anystride/);
  for (let i=0;i<9;i++) await f.db.query("INSERT INTO strava_connections(user_id,athlete_id,generation,tokens,scopes) VALUES($1,$2,gen_random_uuid(),'unused','activity:read')", [`extra${i}`,1000+i]);
  f.setToken(456); await assert.rejects(f.connect(other), /beta is full/);
});
test('Worker syncs bounded summaries, preserves manual training and never exposes athlete data to coaches or admins', async (t) => {
  const f = await fixture(t); await f.connect();
  f.setActivities([fixtureActivity(),fixtureActivity({ id: 102,private: true })]);
  await f.worker.runStravaWorker();
  const response = await f.read(); assert.equal(response.status,200); assert.match(response.headers.get('cache-control'), /private, no-store/);
  const result = await response.json(); assert.equal(result.activities.length,1); assert.equal(result.activities[0].device,'Garmin Forerunner');
  assert.ok(!JSON.stringify(result).includes('NEVER_STORE')); assert.ok(!JSON.stringify(result).includes('token')); assert.equal(result.pending,false);
  assert.equal((await (await f.read(other)).json()).activities.length,0);
  assert.equal((await f.read(other,'?athlete=athlete')).status,400); assert.equal((await f.read(null)).status,401);
  assert.equal(Number((await f.db.query('SELECT count(*) FROM training_entries')).rows[0].count),0);
  const external = f.calls.find((c)=>c.url.includes('/athlete/activities')); assert.match(external.url,/per_page=100&page=1/);
  const query = new URL(external.url).searchParams;
  assert.equal(query.has('after'), false);
  assert.ok(Math.abs(Number(query.get('before'))-Date.now()/1000)<10);
  assert.equal(f.calls.filter((c)=>c.url.includes('/athlete/activities')).length,1);
  await f.store.refreshStrava(athlete); await assert.rejects(f.store.refreshStrava(athlete),/15 minutes/);
  await f.worker.runStravaWorker(); assert.equal((await f.store.readStrava(athlete)).activities.length,1);
});
test('Year-long snapshot includes older recent activities but excludes out-of-window data', async (t) => {
  const f = await fixture(t); await f.connect();
  f.setActivities([
    fixtureActivity({id: 201,start_date: new Date(Date.now()-180*86400000).toISOString()}),
    fixtureActivity({id: 202,start_date: new Date(Date.now()-366*86400000).toISOString()}),
    fixtureActivity({id: 203,start_date: new Date(Date.now()+86400000).toISOString()}),
  ]);
  await f.worker.runStravaWorker();
  assert.deepEqual((await f.store.readStrava(athlete)).activities.map(x=>x.id),[201]);
});
test('Worker rotates expired credentials before requesting activities', async (t) => {
  const f = await fixture(t); await f.connect();
  const row = (await f.db.query('SELECT generation FROM strava_connections')).rows[0];
  await f.db.query('UPDATE strava_connections SET tokens=$1', [f.config.encryptStrava({ access_token: 'old',refresh_token: 'refresh-old',expires_at: 1 },`athlete:${row.generation}`)]);
  await f.worker.runStravaWorker();
  assert.equal(f.calls.filter((c)=>c.url.endsWith('/oauth/token')).length,2);
  assert.equal(f.calls.find((c)=>c.url.includes('/athlete/activities')).options.headers.Authorization,'Bearer access-fixture');
  const stored = (await f.db.query('SELECT tokens FROM strava_connections')).rows[0]; assert.equal(f.config.decryptStrava(stored.tokens,`athlete:${row.generation}`).refresh_token,'refresh-fixture');
});
test('Webhook authentication, challenge, ownership and deauthorization are enforced', async (t) => {
  const f = await fixture(t); const route = f.get('src/app/api/strava/webhook/[secret]/route.ts');
  const context = { params: Promise.resolve({ secret: f.env.STRAVA_WEBHOOK_SECRET }) };
  const check = `https://app.test/api/strava/webhook/x?hub.mode=subscribe&hub.verify_token=${f.env.STRAVA_VERIFY_TOKEN}&hub.challenge=test`;
  assert.equal((await route.GET(new Request(check), { params: Promise.resolve({ secret: 'wrong' }) })).status,403);
  assert.equal((await (await route.GET(new Request(check),context)).json())['hub.challenge'],'test');
  await f.connect(); await f.worker.runStravaWorker();
  await assert.rejects(f.store.receiveStravaEvent(event({ subscription_id: 1 })),/Invalid/);
  await f.store.receiveStravaEvent(event({ owner_id: 999 })); assert.equal((await f.store.readStrava(athlete)).pending,false);
  await f.store.receiveStravaEvent(event({ object_type: 'athlete',object_id:123,updates:{authorized:'false'} }));
  assert.equal((await f.store.readStrava(athlete)).connected,false); assert.equal(Number((await f.db.query('SELECT count(*) FROM strava_activity_cache')).rows[0].count),0);
});
test('Deletion immediately hides activity and stale provider data cannot resurrect it', async (t) => {
  const f = await fixture(t); await f.connect(); await f.worker.runStravaWorker();
  await f.store.receiveStravaEvent(event({ aspect_type:'delete' }));
  assert.equal((await f.store.readStrava(athlete)).activities.length,0);
  await f.worker.runStravaWorker(); assert.equal((await f.store.readStrava(athlete)).activities.length,0);
});
test('Disconnect during an in-flight sync cannot recreate data; remote revoke is retried', async (t) => {
  const f = await fixture(t); await f.connect();
  f.hook(async (url) => { if (url.includes('/athlete/activities')) { await f.store.disconnectStrava(athlete); return Response.json([fixtureActivity()]); } });
  await f.worker.runStravaWorker(); assert.equal((await f.store.readStrava(athlete)).connected,false);
  assert.equal(Number((await f.db.query('SELECT count(*) FROM strava_activity_cache')).rows[0].count),0);
  f.hook(async (url)=> url.endsWith('/oauth/revoke') ? new Response(null,{status:503}) : undefined);
  await f.worker.runStravaWorker(); assert.equal(Number((await f.db.query('SELECT count(*) FROM strava_revocations')).rows[0].count),1);
  await assert.rejects(f.store.beginStrava(athlete,false),/being removed/);
  f.hook(undefined); await f.worker.runStravaWorker(); assert.equal(Number((await f.db.query('SELECT count(*) FROM strava_revocations')).rows[0].count),0);
});
test('Expired cache is hidden and physically removed; paused sync still permits deletion', async (t) => {
  const f = await fixture(t); await f.connect(); await f.worker.runStravaWorker();
  await f.db.exec("UPDATE strava_activity_cache SET expires_at=now()-interval '1 second'");
  assert.equal((await f.store.readStrava(athlete)).activities.length,0);
  f.env.STRAVA_SYNC='off'; assert.equal((await f.store.readStrava(athlete)).available,false);
  assert.equal((await f.post('disconnect')).status,200); assert.equal((await f.store.readStrava(athlete)).connected,false);
  assert.equal((await f.post('refresh',athlete,'https://evil.test')).status,403);
  assert.equal((await f.post('refresh',other,f.env.MARKETPLACE_APP_URL,'?athlete=athlete')).status,400);
});
test('API failures back off, enforce shared budgets and require reconnection after authorization loss', async (t) => {
  const f = await fixture(t); await f.connect();
  f.hook(async (url)=>url.includes('/athlete/activities') ? new Response(null,{status:429,headers:{'X-ReadRateLimit-Limit':'200,2000','X-ReadRateLimit-Usage':'20,2000'}}) : undefined);
  await f.worker.runStravaWorker(); assert.equal((await f.store.readStrava(athlete)).pending,true);
  const runtime = (await f.db.query('SELECT blocked_until>now() AS blocked FROM strava_runtime')).rows[0]; assert.equal(runtime.blocked,true);
  const calls = f.calls.length; await f.worker.runStravaWorker(); assert.equal(f.calls.length,calls);
  await f.db.exec("UPDATE strava_runtime SET blocked_until=now(),day_calls=800; UPDATE strava_sync_jobs SET available_at=now()");
  await f.worker.runStravaWorker(); assert.equal(f.calls.length,calls);
  await f.db.exec("UPDATE strava_runtime SET day_calls=0; UPDATE strava_sync_jobs SET available_at=now()");
  f.hook(async (url)=>url.includes('/athlete/activities') ? new Response(null,{status:401}) : undefined);
  await f.worker.runStravaWorker(); const snapshot=await f.store.readStrava(athlete); assert.equal(snapshot.reconnect,true); assert.equal(snapshot.activities.length,0); assert.equal(snapshot.pending,false);
});
test('Worker rejects unexpected activity ownership and overlarge provider responses', async (t) => {
  const f = await fixture(t); await f.connect(); f.setActivities([fixtureActivity({athlete:{id:999}})]);
  await f.worker.runStravaWorker(); assert.equal((await f.store.readStrava(athlete)).activities.length,0);
  await f.db.exec('UPDATE strava_sync_jobs SET available_at=now()');
  f.hook(async (url)=>url.includes('/athlete/activities') ? new Response('x'.repeat(1024*1024+1)) : undefined);
  await f.worker.runStravaWorker(); assert.equal((await f.store.readStrava(athlete)).activities.length,0);
});
test('Worker endpoint requires its own secret, and browser roles have no table access', async (t) => {
  const f = await fixture(t); const route=f.get('src/app/api/strava/worker/route.ts');
  assert.equal((await route.GET(new Request('http://localhost/api/strava/worker'))).status,401);
  assert.equal((await route.GET(new Request('http://localhost/api/strava/worker',{headers:{Authorization:`Bearer ${f.env.CRON_SECRET}`}}))).status,200);
  for(const role of ['anon','authenticated']) for(const table of ['strava_connections','strava_activity_cache','strava_oauth_states','strava_sync_jobs','strava_revocations','strava_activity_jobs']) assert.equal((await f.db.query('SELECT has_table_privilege($1,$2,\'SELECT\') AS allowed',[role,table])).rows[0].allowed,false);
});
test('Newer visibility changes can restore an activity while duplicate older create events cannot', async (t) => {
  const f = await fixture(t); await f.connect(); await f.worker.runStravaWorker();
  await f.store.receiveStravaEvent(event({ aspect_type:'delete' }));
  await f.store.receiveStravaEvent(event({ aspect_type:'create', event_time:Math.floor(Date.now()/1000)-1 }));
  await f.worker.runStravaWorker(); assert.equal((await f.store.readStrava(athlete)).activities.length,0);
  await f.store.receiveStravaEvent(event({ aspect_type:'create', event_time:Math.floor(Date.now()/1000)+1 }));
  await f.worker.runStravaWorker(); assert.equal((await f.store.readStrava(athlete)).activities.length,1);
});
test('Disconnect cancels a callback already exchanging an authorization code', async (t) => {
  const f = await fixture(t); const start=await f.store.beginStrava(athlete,false);
  f.hook(async (url)=> { if(url.endsWith('/oauth/token')) await f.store.disconnectStrava(athlete); });
  await assert.rejects(f.store.finishStrava(athlete,start.state,start.state,'code'),/expired/);
  assert.equal((await f.store.readStrava(athlete)).connected,false);
});
test('Previously granted private scope never overrides the current Anystride consent choice', async (t) => {
  const f = await fixture(t); f.setToken(123,'activity:read activity:read_all');
  await f.connect(athlete,false); f.setActivities([fixtureActivity({private:true})]);
  await f.worker.runStravaWorker(); const snapshot=await f.store.readStrava(athlete);
  assert.equal(snapshot.privateActivities,false); assert.equal(snapshot.activities.length,0);
});

test('Full-year backfill resumes across batches and refresh reuses unexpired older history', async t => {
  const f=await fixture(t); await f.connect();
  const rows=Array.from({length:500},(_,i)=>fixtureActivity({id:1000+i,start_date:new Date(Date.now()-(i+1)*3600000).toISOString()}));
  f.setActivities(rows);
  await f.worker.runStravaWorker();
  assert.equal((await f.store.readStrava(athlete)).activities.length,300);
  assert.equal((await f.store.readStrava(athlete)).pending,true);
  assert.equal((await f.db.query('SELECT page FROM strava_sync_jobs')).rows[0].page,4);
  await f.worker.runStravaWorker();
  assert.equal((await f.store.readStrava(athlete)).activities.length,500);
  assert.equal((await f.store.readStrava(athlete)).pending,false);
  const expires=(await f.db.query('SELECT expires_at FROM strava_activity_cache WHERE activity_id=1499')).rows[0].expires_at;
  const calls=f.calls.length;
  await f.store.refreshStrava(athlete); await f.worker.runStravaWorker();
  assert.equal(f.calls.length-calls,1);
  assert.equal((await f.store.readStrava(athlete)).activities.length,500);
  assert.equal(String((await f.db.query('SELECT expires_at FROM strava_activity_cache WHERE activity_id=1499')).rows[0].expires_at),String(expires));
});

test('Failed history pages retry their saved cursor and revalidate missing old activities', async t => {
  const f=await fixture(t); await f.connect();
  f.setActivities(Array.from({length:140},(_,i)=>fixtureActivity({id:1000+i})));
  f.hook(async url => url.includes('page=2') ? new Response(null,{status:503}) : undefined);
  await f.worker.runStravaWorker();
  assert.equal((await f.store.readStrava(athlete)).activities.length,100);
  assert.equal((await f.db.query('SELECT page FROM strava_sync_jobs')).rows[0].page,2);
  f.hook(undefined); await f.db.exec('UPDATE strava_sync_jobs SET available_at=now()');
  await f.worker.runStravaWorker();
  assert.equal((await f.store.readStrava(athlete)).activities.length,140);
  await f.db.exec("UPDATE strava_connections SET last_full_sync=now()-interval '5 days'; UPDATE strava_activity_cache SET fetched_at=now()-interval '1 day'");
  f.setActivities([fixtureActivity({id:1000})]); await f.store.refreshStrava(athlete); await f.worker.runStravaWorker();
  assert.equal((await f.store.readStrava(athlete)).activities.length,1);
});

test('Old activity edits use a single detail fetch and 404 removes its cached copy', async t => {
  const f=await fixture(t); await f.connect(); await f.worker.runStravaWorker();
  const calls=f.calls.length;
  f.setActivities([fixtureActivity({name:'Updated old run',start_date:new Date(Date.now()-200*86400000).toISOString()})]);
  await f.store.receiveStravaEvent(event({aspect_type:'update'})); await f.worker.runStravaWorker();
  assert.equal(f.calls.length-calls,1);
  assert.match(f.calls.at(-1).url,/\/activities\/101$/);
  assert.equal((await f.store.readStrava(athlete)).activities[0].title,'Updated old run');
  f.setActivities([]); await f.store.receiveStravaEvent(event({aspect_type:'update'})); await f.worker.runStravaWorker();
  assert.equal((await f.store.readStrava(athlete)).activities.length,0);
  assert.equal((await f.store.readStrava(athlete)).pending,false);
});

test('Detail sync cannot restore a deleted activity or retain newly private data', async t => {
  const f=await fixture(t); await f.connect(); await f.worker.runStravaWorker();
  await f.store.receiveStravaEvent(event({aspect_type:'update'}));
  f.hook(async url => {
    if (url.endsWith('/activities/101')) {
      await f.store.receiveStravaEvent(event({aspect_type:'delete'}));
      return Response.json(fixtureActivity());
    }
  });
  await f.worker.runStravaWorker();
  assert.equal((await f.store.readStrava(athlete)).activities.length,0);
  f.hook(undefined);
  await f.store.receiveStravaEvent(event({aspect_type:'create',event_time:Math.floor(Date.now()/1000)+1}));
  f.setActivities([fixtureActivity({private:true})]);
  await f.worker.runStravaWorker();
  assert.equal((await f.store.readStrava(athlete)).activities.length,0);
});

async function sharingFixture(t, { privateActivities = false } = {}) {
  const f = await fixture(t);
  if (privateActivities) f.setToken(123,'activity:read activity:read_all');
  await f.connect(athlete,privateActivities);
  const coach2 = { id:'coach2', email:'coach2@example.test', admin:false };
  for (const coach of [other,coach2]) await f.db.query("INSERT INTO marketplace_coaches(user_id,name,bio,credentials,status) VALUES($1,$2,'Experienced running coach biography with enough detail for testing.','Coaching credentials','approved')",[coach.id,coach.id]);
  const coaching = f.get('src/lib/training-coaching-store.ts');
  const { parseCoachingAction } = f.get('src/lib/training-coaching-input.ts');
  const mutate = (who,body) => coaching.writeTrainingCoaching(who,parseCoachingAction(body));
  const relationships = ['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
  for (const [i,coach] of [other,coach2].entries()) {
    await mutate(coach,{ action:'invite',id:relationships[i],name:'Runner',email:athlete.email });
    await mutate(athlete,{ action:'accept',id:relationships[i],version:1 });
  }
  const route = f.get('src/app/api/strava/sharing/route.ts');
  const coachRoute = f.get('src/app/api/strava/coach-activities/route.ts');
  const permissions = async () => { f.as(athlete); return (await (await route.GET(new Request('http://localhost:3010/api/strava/sharing'))).json()).coaches; };
  const write = async (body,who=athlete,origin='http://localhost:3010') => { f.as(who); return route.POST(new Request('http://localhost:3010/api/strava/sharing',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)})); };
  const payload = (p,enabled) => ({ id:p.id,connection:p.connection,version:p.version,relationshipVersion:p.relationshipVersion,enabled });
  const share = async (enabled=true,index=0) => write(payload((await permissions()).find(p=>p.id===relationships[index]),enabled));
  const read = async (who=other,index=0,cursor=null) => { f.as(who); const q=new URLSearchParams({relationship:relationships[index]}); if(cursor)q.set('cursor',cursor); return coachRoute.GET(new Request(`http://localhost:3010/api/strava/coach-activities?${q}`)); };
  return {...f,mutate,coach2,relationships,permissions,write,payload,share,coachRead:read,coachRoute,sharingRoute:route};
}
test('explicit consent is separate from calendar access; named coaches only; revocation is immediate and quota-free', async t => {
  const f=await sharingFixture(t); await f.worker.runStravaWorker();
  const before=f.calls.length;
  const p=(await f.permissions())[0]; assert.equal(p.shared,false);
  assert.equal((await f.coachRead()).status,403);
  assert.equal((await f.write(f.payload(p,true),other)).status,403);
  assert.equal((await f.write(f.payload(p,true),athlete,'https://evil.test')).status,403);
  assert.equal((await f.share()).status,200);
  const response=await f.coachRead(); assert.equal(response.status,200); assert.match(response.headers.get('cache-control'),/private, no-store/);
  const data=await response.json(); assert.equal(data.activities.length,1); assert.equal(data.athleteName,'Runner');
  assert.ok(!JSON.stringify(data).includes('token')); assert.ok(!JSON.stringify(data).includes('NEVER_STORE'));
  assert.equal((await f.coachRead(f.coach2,0)).status,403); assert.equal((await f.coachRead(f.coach2,1)).status,403);
  assert.equal((await f.coachRead(athlete)).status,403); assert.equal((await f.coachRead(null)).status,401);
  const old=f.payload((await f.permissions())[0],true);
  await f.db.exec("UPDATE training_usage SET writes=2000,reads=10000,requests=60 WHERE user_id='athlete'");
  assert.equal((await f.share(false)).status,200); assert.equal((await f.coachRead()).status,403);
  assert.equal((await f.write(old)).status,409);
  assert.equal((await f.permissions())[0].shared,false);
  assert.equal(f.calls.length,before,'coach reads and consent make no provider calls');
  assert.equal(Number((await f.db.query('SELECT count(*) FROM training_entries')).rows[0].count),0);
});
test('coach pages exclude private, unknown privacy, expired and pending updates; pagination preserves equal timestamps', async t => {
  const f=await sharingFixture(t,{privateActivities:true});
  f.setActivities([...Array.from({length:105},(_,i)=>fixtureActivity({id:1000+i})),fixtureActivity({id:2000,private:true}),fixtureActivity({id:2001,private:undefined}),fixtureActivity({id:2002,private:false,visibility:'only_me'})]);
  await f.worker.runStravaWorker(); await f.share();
  assert.equal((await f.store.readStrava(athlete)).activities.length,108);
  let cursor=null; const ids=[];
  do { const r=await f.coachRead(other,0,cursor); assert.equal(r.status,200); const page=await r.json(); assert.ok(page.activities.length<=50); ids.push(...page.activities.map(a=>a.id)); cursor=page.nextCursor; } while(cursor);
  assert.equal(ids.length,105); assert.equal(new Set(ids).size,105); assert.ok(ids.every(id=>id>=1000&&id<1105));
  assert.equal((await f.coachRead(other,0,'bad')).status,400);
  await f.store.receiveStravaEvent(event({object_id:1104,aspect_type:'update',updates:{visibility:'only_me'}}));
  assert.ok(!(await (await f.coachRead()).json()).activities.some(a=>a.id===1104));
  f.setActivities([fixtureActivity({id:1104,private:true})]); await f.worker.runStravaWorker();
  assert.ok(!(await (await f.coachRead()).json()).activities.some(a=>a.id===1104));
  await f.db.exec("UPDATE strava_activity_cache SET expires_at=now()-interval '1 second'");
  assert.equal((await (await f.coachRead()).json()).activities.length,0);
});
test('sharing cannot survive relationship revocation/reacceptance, coach suspension, or Strava reconnection', async t => {
  const f=await sharingFixture(t); await f.worker.runStravaWorker(); await f.share();
  await f.db.exec("UPDATE marketplace_coaches SET status='suspended' WHERE user_id='coach'");
  assert.equal((await f.coachRead()).status,403);
  assert.equal((await f.permissions())[0].shared,false);
  assert.equal((await f.permissions())[0].authorized,true,'paused access still exposes the stop-sharing control');
  assert.equal((await f.share(false)).status,200);
  await f.db.exec("UPDATE marketplace_coaches SET status='approved' WHERE user_id='coach'"); await f.share();
  await f.mutate(athlete,{action:'revoke',id:f.relationships[0],version:2}); assert.equal((await f.coachRead()).status,403);
  await f.mutate(other,{action:'invite',id:f.relationships[0],name:'Runner',email:athlete.email});
  await f.mutate(athlete,{action:'accept',id:f.relationships[0],version:4});
  assert.equal((await f.coachRead()).status,403); await f.share();
  const old=f.payload((await f.permissions())[0],true);
  await f.connect(); assert.equal((await f.coachRead()).status,403);
  assert.equal((await f.write(old)).status,409); assert.equal((await f.permissions())[0].shared,false);
  await f.share(); await f.store.disconnectStrava(athlete); assert.equal((await f.coachRead()).status,403);
  assert.equal(Number((await f.db.query('SELECT count(*) FROM strava_coach_sharing')).rows[0].count),0);
});
test('deauthorization and deletion remove shared data; sharing tables deny browser roles and API selectors are strict', async t => {
  const f=await sharingFixture(t); await f.worker.runStravaWorker(); await f.share();
  await f.store.receiveStravaEvent(event({aspect_type:'delete'})); assert.equal((await (await f.coachRead()).json()).activities.length,0);
  f.as(other);
  assert.equal((await f.coachRoute.GET(new Request(`http://localhost:3010/api/strava/coach-activities?relationship=${f.relationships[0]}&athlete=athlete`))).status,400);
  assert.equal((await f.sharingRoute.GET(new Request('http://localhost:3010/api/strava/sharing?athlete=athlete'))).status,400);
  const p=(await f.permissions())[0];
  assert.equal((await f.write({...f.payload(p,true),enabled:'true'})).status,400);
  await f.store.receiveStravaEvent(event({object_type:'athlete',object_id:123,updates:{authorized:'false'}}));
  assert.equal((await f.coachRead()).status,403);
  for(const role of ['anon','authenticated']) {
    const r=await f.db.query("SELECT has_table_privilege($1,'strava_coach_sharing','SELECT') AS can_read,has_table_privilege($1,'strava_coach_sharing','INSERT') AS can_write",[role]);
    assert.equal(r.rows[0].can_read,false); assert.equal(r.rows[0].can_write,false);
  }
});

async function calendarFixture(t) {
  const f=await sharingFixture(t,{privateActivities:true});
  const route=f.get('src/app/api/strava/calendar/route.ts');
  const training=f.get('src/lib/training-store.ts');
  const parser=f.get('src/lib/training-input.ts');
  const workout={id:'33333333-3333-4333-8333-333333333333',kind:'workout',date:'2026-10-16',version:0,title:'Planned progression',sport:'run',notes:'Keep this original instruction.',plannedMinutes:40,plannedKm:6,actualMinutes:null,actualKm:null,effort:null,status:'planned',structure:[{repeat:4,steps:[{kind:'work',unit:'minutes',amount:3,target:'effort',low:4,high:6,notes:''},{kind:'recovery',unit:'minutes',amount:1,target:'none',low:null,high:null,notes:''}]}]};
  // Use an unstructured fixture here; structured-workout preservation is already covered by calendar saves.
  delete workout.structure;
  await training.writeTraining(athlete,parser.parseTrainingAction({action:'save',entry:workout}));
  f.setActivities([fixtureActivity({name:'SYNCED_SUMMARY_ONLY'}),fixtureActivity({id:102,private:true})]);await f.worker.runStravaWorker();
  const calendar=async(who=athlete,relationship=null,cursor=null)=>{f.as(who);const q=new URLSearchParams({from:'2026-10-12',to:'2026-10-18'});if(relationship)q.set('relationship',relationship);if(cursor)q.set('cursor',cursor);return route.GET(new Request(`http://localhost:3010/api/strava/calendar?${q}`));};
  const match=async(body,who=athlete,query='',origin='http://localhost:3010')=>{f.as(who);return route.POST(new Request(`http://localhost:3010/api/strava/calendar${query}`,{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));};
  const connection=(await (await calendar()).json()).connection;
  const input={action:'match',activityId:101,workoutId:workout.id,workoutVersion:1,connection};
  return {...f,route,training,parser,workout,calendar,match,input};
}
test('Strava calendar consent, athlete matching and undo preserve plans, manual results and exports',async t=>{
  const f=await calendarFixture(t);const calls=f.calls.length;
  assert.equal((await (await f.calendar(other,f.relationships[0])).json()).access,'not-shared');
  assert.equal((await f.match(f.input,other)).status,409);
  assert.equal((await f.match(f.input,athlete,`?relationship=${f.relationships[0]}`)).status,400);
  assert.equal((await f.match(f.input,athlete,'','https://evil.test')).status,403);
  assert.equal((await f.match(f.input)).status,200);assert.equal((await f.match(f.input)).status,200);
  const own=await (await f.calendar()).json();const matched=own.activities.find(a=>a.id===101);
  assert.equal(matched.calendarDate,'2026-10-16');assert.equal(matched.date.slice(0,10),'2026-10-17');
  assert.equal(matched.match.title,f.workout.title);
  await f.share();const coach=await (await f.calendar(other,f.relationships[0])).json();
  assert.equal(coach.activities.length,1);assert.equal(coach.activities[0].match.workoutId,f.workout.id);assert.equal(coach.connection,null);
  assert.equal((await f.calendar(f.coach2,f.relationships[0])).status,403);
  const saved=(await f.training.readTraining(athlete,'2026-10-12','2026-10-18')).entries[0];
  assert.equal(saved.status,'planned');assert.equal(saved.actualMinutes,null);assert.equal(saved.notes,f.workout.notes);assert.equal(saved.version,1);
  const csv=f.get('src/lib/training.ts').trainingCsv([saved]);assert.ok(!csv.includes('SYNCED_SUMMARY_ONLY'));
  await f.share(false);assert.equal((await (await f.calendar(other,f.relationships[0])).json()).activities.length,0);
  assert.equal((await f.match({action:'unmatch',activityId:101,matchId:matched.match.id})).status,200);
  assert.equal((await (await f.calendar()).json()).activities.find(a=>a.id===101).calendarDate,'2026-10-17');
  await f.match(f.input);await f.match({action:'unmatch',activityId:101,matchId:matched.match.id});
  assert.ok((await (await f.calendar()).json()).activities.find(a=>a.id===101).match,'old undo must not remove a new match');
  assert.equal(f.calls.length,calls,'calendar reads and matches never fetch Strava');
});
test('matching enforces one-to-one ownership, fresh workouts and cache retention with cascading deletion',async t=>{
  const f=await calendarFixture(t);
  assert.equal((await f.match({...f.input,workoutVersion:2})).status,409);
  assert.equal((await f.match({...f.input,activityId:9999})).status,409);
  const second={...f.workout,id:'44444444-4444-4444-8444-444444444444'};
  await f.training.writeTraining(athlete,f.parser.parseTrainingAction({action:'save',entry:second}));
  assert.equal((await f.match(f.input)).status,200);
  assert.equal((await f.match({...f.input,workoutId:second.id})).status,409);
  assert.equal((await f.match({...f.input,activityId:102})).status,409);
  await f.db.exec("UPDATE strava_activity_cache SET expires_at=now()-interval '1 second'");
  assert.equal((await (await f.calendar()).json()).activities.length,0);
  assert.equal((await f.match(f.input)).status,409);
  await f.db.exec('DELETE FROM strava_activity_cache');
  assert.equal(Number((await f.db.query('SELECT count(*) FROM strava_workout_matches')).rows[0].count),0);
  assert.equal((await f.training.readTraining(athlete,'2026-10-12','2026-10-18')).entries.length,2);
  for(const role of ['anon','authenticated'])assert.equal((await f.db.query("SELECT has_table_privilege($1,'strava_workout_matches','SELECT') AS allowed",[role])).rows[0].allowed,false);
});
test('weekly activity pages are bounded, reject selectors and hide pending privacy updates',async t=>{
  const f=await calendarFixture(t);await f.share();
  f.setActivities(Array.from({length:104},(_,i)=>fixtureActivity({id:1000+i})));
  await f.store.refreshStrava(athlete);await f.worker.runStravaWorker();
  let cursor=null;const ids=[];
  do{const page=await(await f.calendar(athlete,null,cursor)).json();assert.ok(page.activities.length<=50);ids.push(...page.activities.map(a=>a.id));cursor=page.nextCursor;}while(cursor);
  assert.equal(new Set(ids).size,ids.length);assert.ok(ids.length>=104);
  await f.store.receiveStravaEvent(event({object_id:1103,aspect_type:'update',updates:{visibility:'only_me'}}));
  assert.ok(!(await(await f.calendar(other,f.relationships[0])).json()).activities.some(a=>a.id===1103));
  f.as(athlete);
  for(const query of ['from=2026-10-01&to=2026-10-20','from=2026-10-12&to=2026-10-18&athlete=someone','from=2026-10-12&to=2026-10-18&cursor=bad'])assert.equal((await f.route.GET(new Request(`http://localhost:3010/api/strava/calendar?${query}`))).status,400);
});

test('Slow worker yields after its time budget and resumes the saved page next run', async (t) => {
  let now = Date.now();
  class Clock extends Date { static now() { return now; } }
  const f = await fixture(t, Clock); await f.connect();
  f.setActivities(Array.from({length: 210}, (_, i) => fixtureActivity({id: 1000+i})));
  f.hook(async url => { if (url.includes('/athlete/activities')) now += 31000; });
  assert.equal((await f.worker.runStravaWorker()).processed, 1);
  assert.equal((await f.db.query('SELECT page FROM strava_sync_jobs')).rows[0].page, 2);
  f.hook(undefined);
  assert.equal((await f.worker.runStravaWorker()).processed, 2);
  assert.equal((await f.db.query('SELECT count(*)::int AS n FROM strava_activity_cache')).rows[0].n, 210);
  assert.equal((await f.db.query('SELECT count(*)::int AS n FROM strava_sync_jobs')).rows[0].n, 0);
});
