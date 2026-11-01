import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as tick } from 'node:timers/promises';
import { NextResponse } from 'next/server.js';
import { load } from './support/load-module.mjs';

function route(result, enabled = true) {
  let calls=0;
  const handler=load('src/app/api/marketplace/auth/route.ts',{
    'next/server':{NextResponse},
    '@/lib/supabase-server':{accountAuthClient:async()=>({auth:{getUser:async()=>{calls++;if(result instanceof Error)throw result;return result;}}})},
    '@/lib/marketplace-config':{marketplaceEnabled:()=>enabled},
    '@/lib/payment-http':{},'@/lib/payment-config':{},'@/lib/account-return':{},
  });
  return {GET:handler.GET,calls:()=>calls};
}
test('Session status returns only a boolean and never caches identity information',async()=>{
  const r=await route({data:{user:{id:'secret-id',email:'private@example.test',email_confirmed_at:'2026-10-17',is_anonymous:false}},error:null}).GET();
  assert.deepEqual(await r.json(),{signedIn:true});assert.match(r.headers.get('cache-control'),/private, no-store/);
});
test('Missing, expired, unverified and anonymous sessions stay signed out',async()=>{
  for(const result of [
    {data:{user:null},error:{status:400}},
    {data:{user:null},error:{status:401}},
    {data:{user:{email_confirmed_at:null}},error:null},
    {data:{user:{email_confirmed_at:'date',is_anonymous:true}},error:null},
  ]) assert.deepEqual(await (await route(result).GET()).json(),{signedIn:false});
  const disabled=route(null,false);assert.deepEqual(await (await disabled.GET()).json(),{signedIn:false});assert.equal(disabled.calls(),0);
});
test('Auth outages are distinguishable from sign-out without leaking errors',async()=>{
  for(const result of [{data:{user:null},error:{status:503,message:'private details'}},new Error('private details')]){
    const r=await route(result).GET();assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'Account service unavailable.'});assert.match(r.headers.get('cache-control'),/no-store/);
  }
});
function watcher(){
  const window=new EventTarget(),document=new EventTarget(),timers=new Map(),requests=[],changes=[];let timer=0;
  document.visibilityState='visible';window.setTimeout=fn=>{timers.set(++timer,fn);return timer;};window.clearTimeout=id=>timers.delete(id);
  const fetch=(url,options)=>new Promise(resolve=>requests.push({url,options,resolve}));
  const api=load('src/lib/account-session.ts',{}, {window,document,fetch,AbortController});
  const stop=api.subscribeAccountSession(value=>changes.push(value));
  const emit=(target,name)=>target.dispatchEvent(new Event(name));
  return {window,document,requests,changes,timers,stop,emit,changed:()=>emit(window,api.accountSessionChanged)};
}
test('Header rechecks on return to a tab, coalesces concurrent events and does not poll',async()=>{
  const w=watcher();assert.equal(w.requests.length,1);assert.equal(w.requests[0].url,'/api/marketplace/auth');assert.equal(w.requests[0].options.cache,'no-store');assert.equal(w.requests[0].options.credentials,'same-origin');
  w.emit(w.window,'focus');w.emit(w.document,'visibilitychange');assert.equal(w.requests.length,1);
  w.requests[0].resolve(Response.json({signedIn:true}));await tick();assert.deepEqual(w.changes,[true]);assert.equal(w.timers.size,0);
  w.document.visibilityState='hidden';w.emit(w.document,'visibilitychange');assert.equal(w.requests.length,1);
  w.document.visibilityState='visible';w.emit(w.document,'visibilitychange');w.requests[1].resolve(Response.json({signedIn:false}));await tick();assert.deepEqual(w.changes,[true,false]);w.stop();
});
test('A stale signed-in response cannot undo a newer sign-out response',async()=>{
  const w=watcher();w.changed();assert.equal(w.requests[0].options.signal.aborted,true);
  w.requests[1].resolve(Response.json({signedIn:false}));await tick();w.requests[0].resolve(Response.json({signedIn:true}));await tick();assert.deepEqual(w.changes,[false]);w.stop();
});
test('Navigation/unmount cancels requests and removes all session listeners',async()=>{
  const w=watcher();w.stop();assert.equal(w.requests[0].options.signal.aborted,true);
  w.emit(w.window,'focus');w.emit(w.window,'pageshow');w.emit(w.document,'visibilitychange');w.changed();assert.equal(w.requests.length,1);
  w.requests[0].resolve(Response.json({signedIn:true}));await tick();assert.deepEqual(w.changes,[]);assert.equal(w.timers.size,0);
});
test('Timeouts, failures and malformed responses never overwrite the last known state',async()=>{
  const w=watcher();w.requests[0].resolve(Response.json({signedIn:true}));await tick();
  for(const response of [Response.json({error:'unavailable'},{status:503}),Response.json({signedIn:'true'})]){
    w.changed();w.requests.at(-1).resolve(response);await tick();
  }
  w.changed();[...w.timers.values()][0]();assert.equal(w.requests.at(-1).options.signal.aborted,true);w.requests.at(-1).resolve(Response.json({signedIn:false}));await tick();assert.deepEqual(w.changes,[true]);w.stop();
});
