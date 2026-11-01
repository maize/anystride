/** Local HTTP/Auth/SQL verification of runner, applicant and approved-coach dashboards. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
const status=JSON.parse(execFileSync('supabase',['status','-o','json'],{env:{...process.env,DOCKER_HOST:'unix:///Users/matthias/.colima/anystride/docker.sock'},stdio:['ignore','pipe','ignore']}));
assert.equal(status.API_URL,'http://127.0.0.1:54321');
const url=new URL(status.DB_URL);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'54322');url.pathname='/anystride_marketplace_test';
const db=new Client({connectionString:url.href});await db.connect();
const admin=createClient(status.API_URL,status.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),created=[];
const origin='http://localhost:3010';let checks=0;
async function request(cookie,path,expected=200){
  const r=await fetch(origin+path,{headers:cookie?{Cookie:cookie}:{},redirect:'manual'});assert.equal(r.status,expected,path);
  if(path.startsWith('/account')||path.startsWith('/api/'))assert.match(r.headers.get('cache-control'),path.startsWith('/api/')?/private.*no-store/:/no-cache|private.*no-store/);
  checks++;return r;
}
try {
  const denied=await fetch(origin+'/account',{redirect:'manual'});checks++;assert.ok([200,307].includes(denied.status));
  if(denied.status===307)assert.ok(denied.headers.get('location').endsWith('/account/sign-in'));
  else {const body=await denied.text();assert.match(body,/<meta[^>]*http-equiv="refresh"[^>]*url=\/account\/sign-in/);assert.ok(!body.includes('calendar-heading'));}
  for(const [role,email] of [['runner','training-athlete@local.invalid'],['pending','training-coach@local.invalid'],['approved','training-browser@local.invalid']]){
    const password=randomBytes(32).toString('hex'),made=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ok(!made.error,'Use an unused local fixture account');const id=made.data.user.id;created.push(id);
    if(role!=='runner')await db.query("INSERT INTO marketplace_coaches(user_id,name,bio,credentials,status) VALUES($1,'Dashboard verification coach','Temporary private profile for local dashboard verification.','Verification only',$2)",[id,role]);
    const jar=new Map(),auth=createServerClient(status.API_URL,status.PUBLISHABLE_KEY||status.ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>jar.set(name,value))}});
    assert.ok(!(await auth.auth.signInWithPassword({email,password})).error);const cookie=[...jar].map(([name,value])=>`${name}=${value}`).join('; ');
    const html=await (await request(cookie,'/account')).text();assert.equal((html.match(/<h1\b/g)||[]).length,1);
    const links=[...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m=>m[1]);
    for(const path of ['/account/training','/account/athletes','/account/connections','/account/coaching','/account/orders'])assert.ok(links.includes(path),role+': '+path);
    assert.match(html,/Training calendar/);assert.match(html,/Strava connection/);assert.ok(!links.includes('/account/review'));
    if(role==='approved'){assert.ok(links.includes('/account/plans'));assert.ok(links.includes('/account/storefront'));assert.match(html,/Coach tools/);}
    else{assert.ok(!links.includes('/account/plans'));assert.ok(!links.includes('/account/storefront'));assert.ok(links.includes('/plans'));assert.match(html,/My coaches/);}
    if(role==='pending')assert.match(html,/Your application is awaiting review/);
    for(const path of ['/account/training','/account/athletes','/account/connections',role==='approved'?'/account/plans':'/plans']){
      const page=await (await request(cookie,path)).text();assert.ok(!page.includes('Your account could not be loaded'),path);
      if(path==='/account/athletes')assert.match(page,role==='approved'?/Invite an athlete/:/My coaches/);
      if(path==='/account/connections')assert.match(page,/Strava connection/);
    }
    await request(cookie,'/api/marketplace/training/plans',role==='approved'?200:403);
    const roster=await (await request(cookie,'/api/marketplace/training/coaching?from=2026-10-12&to=2026-10-18')).json();assert.equal(roster.isCoach,role==='approved');
    console.log('PASS: '+role+' dashboard links, rendered destinations and server-enforced coach permissions.');
  }
  console.log(`PASS: ${checks} HTTP checks. No browser testing or provider calls.`);
}finally{
  await db.query('DELETE FROM training_usage WHERE user_id=ANY($1::text[])',[created]);
  await db.query('DELETE FROM marketplace_coaches WHERE user_id=ANY($1::text[])',[created]);
  for(const id of created)assert.ok(!(await admin.auth.admin.deleteUser(id)).error);
  await db.end();console.log('Disposable dashboard accounts removed.');
}
