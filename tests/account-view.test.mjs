import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './support/load-module.mjs';
const {parseAccountView,resolveAccountView,accountViewForPath,accountViewDestination}=load('src/lib/account-view.ts');
test('view preference is limited to runner/coach and defaults from the real application',()=>{
 assert.equal(resolveAccountView(undefined,undefined,false),'runner');assert.equal(resolveAccountView(undefined,undefined,true),'coach');
 assert.equal(resolveAccountView(undefined,'runner',true),'runner');assert.equal(resolveAccountView('coach','runner',false),'coach');
 for(const value of ['admin','approved','//evil.test',{},null])assert.equal(parseAccountView(value),undefined);
});
test('personal and coach deep links choose the relevant view; shared pages retain the selected view',()=>{
 for(const path of ['/account/plans','/account/services','/account/storefront/preview','/account/enquiries','/account/athletes/abc/activities'])assert.equal(accountViewForPath(path),'coach');
 for(const path of ['/account/connections','/account/coaching','/account/workspaces/abc','/account/explore'])assert.equal(accountViewForPath(path),'runner');
 assert.equal(accountViewForPath('/account/training'),'runner');assert.equal(accountViewForPath('/account/training',true),'coach');
 for(const path of ['/account','/account/athletes','/account/orders','/account/orders/abc','/account/services-other','/api/marketplace'])assert.equal(accountViewForPath(path),undefined);
});
test('view switching preserves only relevant exact return destinations, without granting admin or arbitrary redirects',()=>{
 assert.equal(accountViewDestination('runner','/account/athletes'),'/account/athletes');
 assert.equal(accountViewDestination('runner','/account/checkout/dea00001-0000-4000-8000-000000000001'),'/account/checkout/dea00001-0000-4000-8000-000000000001');
 assert.equal(accountViewDestination('coach','/account/services?claim=jack-anstey'),'/account/services?claim=jack-anstey');
 for(const mode of ['runner','coach'])for(const path of ['https://evil.test','//evil.test','/account/review','/account/runner','/account/coach','/account/athletes?admin=true'])assert.equal(accountViewDestination(mode,path),'/account');
 assert.equal(accountViewDestination('runner','/account/services'),'/account');assert.equal(accountViewDestination('coach','/account/athletes'),'/account');
});

test('view routes require authentication and limit redirects to the chosen workspace', async()=>{
 const {NextResponse}=await import('next/server.js');
 for(const mode of ['runner','coach']){
  let allowed=false;
  const {GET}=load(`src/app/account/${mode}/route.ts`,{
   'next/server':{NextResponse},
   '@/lib/account-data':{accountActor:async()=>{if(!allowed)throw new Error('Sign in required');return{id:'fixture'};}},
   '@/lib/marketplace-config':{marketplaceOrigin:()=> 'https://anystride.test'},
  },{Request,Response});
  await assert.rejects(GET(new Request(`https://anystride.test/account/${mode}`)),/Sign in required/);
  allowed=true;
  const response=await GET(new Request(`https://anystride.test/account/${mode}?next=https://evil.test`));
  assert.equal(response.headers.get('location'),'https://anystride.test/account');
  assert.match(response.headers.get('set-cookie'),new RegExp(`anystride-account-view=${mode}`));assert.match(response.headers.get('set-cookie'),/HttpOnly/);assert.match(response.headers.get('cache-control'),/private, no-store/);
 }
});
test('proxy overwrites forged view headers and does not invent a view on shared routes',async()=>{
 const {NextResponse}=await import('next/server.js');
 const {default:proxy}=load('src/proxy.ts',{
  'next/server':{NextResponse},
  '@supabase/ssr':{createServerClient:()=>({auth:{getClaims:async()=>({})}})},
  '@/lib/marketplace-config':{marketplaceEnabled:()=>true,marketplaceOrigin:()=> 'https://anystride.test'},
 },{Headers,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://fixture.test',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture'}}});
 for(const[path,expected]of [['/account/services','coach'],['/account/training','runner'],['/account',null]]){
  const response=await proxy({nextUrl:new URL('https://anystride.test'+path),headers:new Headers({'x-anystride-account-view':'admin'}),cookies:{getAll:()=>[]}});
  assert.equal(response.headers.get('x-middleware-request-x-anystride-account-view'),expected);
  assert.ok(!response.headers.has('x-anystride-account-view'));
 }
});
