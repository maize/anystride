import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { load } from './support/load-module.mjs';
const user={id:'new-user',email:'new@example.test',created_at:'2026-10-05T10:00:00Z',email_confirmed_at:'2026-10-05T11:00:00Z'};
const env={MARKETPLACE_SIGNUP_NOTIFICATIONS:'email',MARKETPLACE_SIGNUP_NOTIFICATIONS_SINCE:'2026-10-04T12:00:00Z',VERCEL_ENV:'production',RESEND_API_KEY:'re_fixture',NOTIFY_FROM:'Anystride <hello@example.test>'};
async function fixture(t,overrides={},fail=false){
 const db=new PGlite();t.after(()=>db.close());await db.exec(readFileSync(new URL('../db/migrations/002_marketplace.sql',import.meta.url),'utf8'));
 const sent=[],logs=[];
 const mod=load('src/lib/signup-notifications.ts',{'server-only':{},'./marketplace-config':{marketplaceOrigin:()=> 'https://anystride.com'},'./marketplace-store':{marketplaceTransaction:fn=>db.transaction(tx=>fn(tx))}},{process:{env:{...env,...overrides}},console:{error:msg=>logs.push(msg)},fetch:async(url,options)=>{sent.push({url,...options,body:JSON.parse(options.body)});if(fail)throw Error('private provider failure');return Response.json({id:'email-test'});}});
 return {...mod,sent,logs,db};
}
test('verified signup alerts are durable across repeat sign-ins and use the configured owner',async t=>{
 const f=await fixture(t,{NOTIFY_EMAIL:'owner@example.test'});
 await f.notifyVerifiedSignup(user);await f.notifyVerifiedSignup(user);
 assert.equal(f.sent.length,1);assert.equal(f.sent[0].body.to,'owner@example.test');
 assert.match(f.sent[0].body.text,/new@example.test/);assert.match(f.sent[0].body.text,/not necessarily applied/);
 assert.match(f.sent[0].headers['Idempotency-Key'],/^verified-signup-v1\//);
 assert.equal((await f.db.query("SELECT count(*)::int AS n FROM marketplace_audit")).rows[0].n,1);
});
test('unconfirmed, anonymous and historical users never generate signup alerts',async t=>{
 const f=await fixture(t);
 for(const patch of [{email_confirmed_at:undefined},{is_anonymous:true},{created_at:'2025-01-01'},{created_at:'bad'},{email:'x\nbcc:other@example.test'}])await f.notifyVerifiedSignup({...user,...patch});
 assert.equal(f.sent.length,0);
});
test('disabled, preview and incomplete settings do not claim or send alerts',async t=>{
 for(const config of [{MARKETPLACE_SIGNUP_NOTIFICATIONS:'off'},{VERCEL_ENV:'preview'},{VERCEL_ENV:undefined},{MARKETPLACE_SIGNUP_NOTIFICATIONS_SINCE:''},{RESEND_API_KEY:''},{NOTIFY_FROM:'bad\r\nheader'}]){
 const f=await fixture(t,config);await f.notifyVerifiedSignup(user);assert.equal(f.sent.length,0);assert.equal((await f.db.query('SELECT count(*)::int AS n FROM marketplace_audit')).rows[0].n,0);
 }
});
test('delivery failures do not break sign-in or repeat on every login',async t=>{
 const f=await fixture(t,{},true);await f.notifyVerifiedSignup(user);await f.notifyVerifiedSignup(user);assert.equal(f.sent.length,1);assert.equal(f.logs.length,1);assert.doesNotMatch(f.logs[0],/private provider failure|new@example.test/);
});

test('successful authentication schedules the verified server user without delaying the redirect',async()=>{
 const {NextResponse}=await import('next/server.js');const scheduled=[],notified=[];
 const {GET}=load('src/app/account/callback/route.ts',{'next/server':{NextResponse,after:fn=>scheduled.push(fn)},'@/lib/marketplace-config':{marketplaceOrigin:()=> 'https://anystride.com'},'@/lib/supabase-server':{accountAuthClient:async()=>({auth:{exchangeCodeForSession:async()=>({data:{user},error:null})}})},'@/lib/signup-notifications':{notifyVerifiedSignup:async u=>notified.push(u)}},{Request,Response});
 const response=await GET(new Request('https://anystride.com/account/callback?code=fixture'));
 assert.equal(response.status,307);assert.equal(scheduled.length,1);assert.equal(notified.length,0);await scheduled[0]();assert.equal(notified[0].id,user.id);
});
