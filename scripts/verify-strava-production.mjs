/** Authorized release checks: real provider worker + disposable HTTP/Auth/SQL fixtures. */
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { setTimeout as delay } from 'node:timers/promises';
export async function verifyStravaProduction(db) {
  const origin='https://anystride.com';
  const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const created=[]; const tag=randomUUID(); let checks=0;
  async function request(actor,path,body,status=200,extra={}) {
    const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{...(actor?{Cookie:actor.cookie}:{}),...(body?{Origin:origin,'Content-Type':'application/json'}:{}),...extra},body:body?JSON.stringify(body):undefined,redirect:'manual',signal:AbortSignal.timeout(55000)});
    assert.equal(r.status,status,`Unexpected HTTP response for ${path.split('?')[0].replace(/webhook\/.*/, 'webhook/[redacted]')}`);
    assert.match(r.headers.get('cache-control')||'',/no-store/);checks++;
    const text=await r.text();return {data:text.startsWith('{')?JSON.parse(text):text,headers:r.headers};
  }
  async function account(role) {
    const email=`strava-release-${tag}-${role}@example.invalid`,password=randomBytes(32).toString('base64url');
    const made=await admin.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{anystride_strava_release:tag}});
    assert.ok(!made.error,'Fixture creation failed');created.push(made.data.user.id);
    const jar=new Map();const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>jar.set(name,value))}});
    assert.ok(!(await client.auth.signInWithPassword({email,password})).error,'Fixture sign-in failed');
    return {id:made.data.user.id,email,cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')};
  }
  // Recover only identities tagged by this exact operator after an interrupted run.
  const stale=(await db.query("SELECT id::text,email,raw_app_meta_data->>'anystride_strava_release' AS tag FROM auth.users WHERE raw_app_meta_data ? 'anystride_strava_release'")).rows;
  for(const row of stale) {
    assert.match(row.tag,/^[a-f0-9-]{36}$/);
    assert.ok(['athlete','coach','other'].some(role=>row.email===`strava-release-${row.tag}-${role}@example.invalid`));
    await db.query('DELETE FROM training_relationships WHERE coach_id=$1 OR athlete_id=$1',[row.id]);
    for(const table of ['strava_connections','strava_oauth_states','strava_revocations','training_entries','training_usage','marketplace_coaches']) await db.query(`DELETE FROM ${table} WHERE user_id=$1`,[row.id]);
    assert.ok(!(await admin.auth.admin.deleteUser(row.id)).error);
  }
  if(stale.length)console.log('Recovered and removed interrupted private verification fixtures.');
  try {
    const scheduled=(await db.query("SELECT schedule,active,command FROM cron.job WHERE jobname='anystride-strava-maintenance'")).rows;
    assert.equal(scheduled.length,1);assert.equal(scheduled[0].schedule,'*/15 * * * *');assert.equal(scheduled[0].active,true);assert.equal(scheduled[0].command,'SELECT public.strava_maintenance()');
    for(const role of ['anon','authenticated']) {
      assert.equal((await db.query("SELECT has_function_privilege($1,'public.strava_maintenance()','EXECUTE') AS access",[role])).rows[0].access,false);
      assert.equal((await db.query("SELECT has_table_privilege($1,'public.strava_scheduler','SELECT,INSERT,UPDATE,DELETE') AS access",[role])).rows[0].access,false);
    }
    // Execute exactly the SQL scheduled by pg_cron; pg_net must reach the live HTTP worker.
    for(let batch=0;batch<5;batch++) {
      await db.query('SELECT public.strava_maintenance()');
      const requestId=(await db.query('SELECT last_request FROM strava_scheduler WHERE id=1')).rows[0].last_request;
      assert.ok(requestId,'Scheduler did not dispatch pending work');
      let response;
      for(let i=0;i<11;i++){await delay(5000);response=(await db.query('SELECT status_code,timed_out FROM net._http_response WHERE id=$1',[requestId])).rows[0];if(response)break;}
      assert.equal(response?.status_code,200,'Database scheduler HTTP delivery failed');assert.equal(response.timed_out,false);
      const pending=(await db.query('SELECT count(*)::int AS n FROM strava_sync_jobs')).rows[0].n;
      if(!pending)break;
    }
    const live=(await db.query("SELECT c.status,c.scopes,c.last_full_sync,(SELECT count(*)::int FROM strava_activity_cache a WHERE a.user_id=c.user_id) AS activities,(SELECT sum(octet_length(summary::text)) FROM strava_activity_cache a WHERE a.user_id=c.user_id) AS bytes FROM strava_connections c JOIN auth.users u ON u.id::text=c.user_id WHERE lower(u.email)='matthias.e.link@gmail.com'")).rows[0];
    assert.equal(live?.status,'connected');assert.equal(live.scopes,'activity:read');assert.ok(live.last_full_sync);assert.ok(live.activities>100);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM strava_sync_jobs')).rows[0].n,0);
    console.log(`PASS: live Strava to production via database scheduler: ${live.activities} activity summaries, ${live.bytes} JSON bytes; full-year scan complete.`);
    const idleBefore=(await db.query('SELECT last_request FROM strava_scheduler WHERE id=1')).rows[0].last_request;
    await db.query('SELECT public.strava_maintenance()');
    assert.equal((await db.query('SELECT last_request FROM strava_scheduler WHERE id=1')).rows[0].last_request,idleBefore,'Idle maintenance must not invoke HTTP');
    console.log('PASS: idle maintenance makes no HTTP or Strava calls.');
    await request(null,'/api/strava/worker',null,401);
    await request(null,'/api/strava/activities',null,401);
    await request(null,'/api/strava/webhook/wrong',{},403);
    const webhook=`/api/strava/webhook/${process.env.STRAVA_WEBHOOK_SECRET}`;
    const challenge=await request(null,`${webhook}?${new URLSearchParams({'hub.mode':'subscribe','hub.verify_token':process.env.STRAVA_VERIFY_TOKEN,'hub.challenge':'release-check'})}`);
    assert.equal(challenge.data['hub.challenge'],'release-check');
    const athlete=await account('athlete'),coach=await account('coach'),other=await account('other');
    await db.query("INSERT INTO marketplace_coaches(user_id,name,bio,credentials,status) VALUES($1,'Private Strava release check','Temporary private release verification account.','Release verification only','approved')",[coach.id]);
    const oauth=await request(athlete,'/api/strava/connect',{consent:true,privateActivities:false});
    const oauthUrl=new URL(oauth.data.url); assert.equal(oauthUrl.origin,'https://www.strava.com'); assert.equal(oauthUrl.searchParams.get('redirect_uri'),origin+'/api/strava/callback');assert.equal(oauthUrl.searchParams.get('scope'),'activity:read');
    assert.match(oauth.headers.get('set-cookie'),/HttpOnly/);assert.match(oauth.headers.get('set-cookie'),/Secure/);
    const bad=await request(athlete,'/api/strava/callback?code=invalid&state=invalid',null,303);assert.match(bad.headers.get('location'),/strava=failed/);
    const base='/api/marketplace/training',date=new Date(Date.now()-86400000).toISOString().slice(0,10),range=`from=${date}&to=${date}`,relationship=randomUUID();
    await request(coach,base+'/coaching',{action:'invite',id:relationship,name:'Private release athlete',email:athlete.email});
    const invited=(await request(athlete,base+'/coaching?'+range)).data.coaches.find(c=>c.id===relationship);
    await request(athlete,base+'/coaching',{action:'accept',id:relationship,version:invited.version});
    const entry={id:randomUUID(),version:0,kind:'workout',date,title:'Private verification run',sport:'run',notes:'',plannedMinutes:30,plannedKm:5,actualMinutes:null,actualKm:null,effort:null,status:'planned'};
    await request(coach,base+'/coaching',{action:'assign',athletes:[relationship],entry});
    const generation=randomUUID(),athleteId=9000000000001;
    await db.query("INSERT INTO strava_connections(user_id,athlete_id,generation,tokens,scopes,last_full_sync) VALUES($1,$2,$3,'verification-no-provider-credentials','activity:read',now())",[athlete.id,athleteId,generation]);
    for(let i=0;i<53;i++){
      const summary={id:9000000000100+i,title:i===52?'PRIVATE FIXTURE':'Verification run',sport:'Run',date:date+'T08:00:00',distance:5000,movingSeconds:1500,elapsedSeconds:1550,elevation:30,device:null};
      await db.query("INSERT INTO strava_activity_cache(user_id,activity_id,summary,expires_at,started_at,coach_visible) VALUES($1,$2,$3,now()+interval '1 hour',now()-interval '1 day',$4)",[athlete.id,summary.id,JSON.stringify(summary),i!==52]);
    }
    const shared=`/api/strava/coach-activities?relationship=${relationship}`,calendar='/api/strava/calendar?'+range;
    await request(coach,shared,null,403);
    const permission=async()=>(await request(athlete,'/api/strava/sharing')).data.coaches.find(c=>c.id===relationship);
    const consentBody=(p,enabled)=>({id:p.id,version:p.version,connection:p.connection,relationshipVersion:p.relationshipVersion,enabled});
    let consent=await permission();assert.equal(consent.shared,false);
    await request(coach,'/api/strava/sharing',consentBody(consent,true),403);
    await request(athlete,'/api/strava/sharing',consentBody(consent,true));
    const first=(await request(coach,shared)).data,second=(await request(coach,shared+'&cursor='+encodeURIComponent(first.nextCursor))).data;
    assert.equal(first.activities.length,50);assert.equal(second.activities.length,2);assert.ok(!JSON.stringify([first,second]).includes('PRIVATE FIXTURE'));
    await request(other,shared,null,403);
    const workout=(await request(athlete,base+'?'+range)).data.entries.find(e=>e.id===entry.id);
    const match={action:'match',activityId:9000000000100,workoutId:entry.id,workoutVersion:workout.version,connection:generation};
    await request(coach,'/api/strava/calendar',match,409);
    await request(athlete,'/api/strava/calendar',match);
    await request(athlete,'/api/strava/calendar',match);
    let pages=[(await request(coach,calendar+'&relationship='+relationship)).data];
    while(pages.at(-1).nextCursor)pages.push((await request(coach,calendar+'&relationship='+relationship+'&cursor='+pages.at(-1).nextCursor)).data);
    const matched=pages.flatMap(p=>p.activities).find(a=>a.id===match.activityId);assert.equal(matched.match.workoutId,entry.id);
    assert.deepEqual((await request(athlete,base+'?'+range)).data.entries.find(e=>e.id===entry.id),workout);
    await request(athlete,'/api/strava/calendar',{action:'unmatch',activityId:match.activityId,matchId:matched.match.id});
    consent=await permission();await request(athlete,'/api/strava/sharing',consentBody(consent,false));
    await request(coach,shared,null,403);assert.equal((await request(coach,calendar+'&relationship='+relationship)).data.activities.length,0);
    // Synthetic deletion event exercises the live webhook without mutating a real Strava activity.
    await request(null,webhook,{object_type:'activity',object_id:match.activityId,aspect_type:'delete',owner_id:athleteId,subscription_id:Number(process.env.STRAVA_SUBSCRIPTION_ID),event_time:Math.floor(Date.now()/1000)});
    assert.equal((await db.query('SELECT count(*)::int AS n FROM strava_activity_cache WHERE user_id=$1 AND activity_id=$2',[athlete.id,match.activityId])).rows[0].n,0);
    await db.query("UPDATE strava_activity_cache SET expires_at=now()-interval '1 second' WHERE user_id=$1",[athlete.id]);
    await db.query('SELECT public.strava_maintenance()');assert.equal((await db.query('SELECT count(*)::int AS n FROM strava_activity_cache WHERE user_id=$1',[athlete.id])).rows[0].n,0);
    await request(athlete,'/api/strava/activities',{action:'disconnect'});
    assert.equal((await db.query('SELECT count(*)::int AS n FROM strava_connections WHERE user_id=$1',[athlete.id])).rows[0].n,0);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM strava_coach_sharing WHERE user_id=$1',[athlete.id])).rows[0].n,0);
    console.log(`PASS: ${checks} production HTTP checks covering authentication, OAuth configuration/state rejection, explicit coach consent, privacy, pagination, matching/undo, revocation, synthetic webhook deletion, disconnect and physical cache cleanup.`);
  } finally {
    // Only records belonging to identities created by this invocation can be removed.
    const ids=(await db.query("SELECT id::text FROM auth.users WHERE id::text=ANY($1::text[]) AND raw_app_meta_data->>'anystride_strava_release'=$2",[created,tag])).rows.map(r=>r.id);
    assert.equal(ids.length,created.length);
    await db.query('DELETE FROM training_relationships WHERE coach_id=ANY($1::text[]) OR athlete_id=ANY($1::text[])',[ids]);
    for(const table of ['strava_connections','strava_oauth_states','strava_revocations','training_entries','training_usage','marketplace_coaches']) await db.query(`DELETE FROM ${table} WHERE user_id=ANY($1::text[])`,[ids]);
    for(const id of ids) assert.ok(!(await admin.auth.admin.deleteUser(id)).error,'Fixture cleanup failed');
    console.log('Private verification accounts and records removed.');
  }
  // Prove pg_cron itself runs the function, then restore the low-cost interval.
  const job=(await db.query("SELECT jobid FROM cron.job WHERE jobname='anystride-strava-maintenance'")).rows[0].jobid;
  const since=(await db.query('SELECT now() AS t')).rows[0].t;
  try {
    await db.query("SELECT cron.alter_job($1,schedule:='* * * * *')",[job]);
    let ran=false;
    for(let i=0;i<15;i++) {
      await delay(5000);
      ran=(await db.query("SELECT EXISTS(SELECT 1 FROM cron.job_run_details WHERE jobid=$1 AND start_time>=$2 AND status='succeeded') AS ok",[job,since])).rows[0].ok;
      if(ran)break;
    }
    assert.ok(ran,'Automatic database maintenance did not run successfully');
  } finally {await db.query("SELECT cron.alter_job($1,schedule:='*/15 * * * *')",[job]);}
  console.log('PASS: pg_cron executed maintenance automatically; schedule restored to every 15 minutes.');

}
