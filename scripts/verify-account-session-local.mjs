/** Real local HTTP/Auth verification, with one disposable user and no email sent. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
const status=JSON.parse(execFileSync('supabase',['status','-o','json'],{env:{...process.env,DOCKER_HOST:'unix:///Users/matthias/.colima/anystride/docker.sock'},stdio:['ignore','pipe','ignore']}));
assert.equal(status.API_URL,'http://127.0.0.1:54321');
const origin='http://localhost:3010';
const admin=createClient(status.API_URL,status.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const email=`session-check-${randomUUID()}@example.invalid`,password=randomBytes(32).toString('hex');
const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ok(!created.error);
try {
  const jar=new Map();
  const auth=createServerClient(status.API_URL,status.PUBLISHABLE_KEY||status.ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>jar.set(name,value))}});
  assert.ok(!(await auth.auth.signInWithPassword({email,password})).error);
  async function check(cookie,expected){
    const r=await fetch(origin+'/api/marketplace/auth',{headers:cookie?{Cookie:cookie}:{},redirect:'manual'});
    assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/private, no-store/);assert.deepEqual(await r.json(),{signedIn:expected});
  }
  const cookie=()=>[...jar].map(([name,value])=>`${name}=${value}`).join('; ');
  await check('',false);await check(cookie(),true);
  await check([...jar.keys()].map(name=>`${name}=invalid`).join('; '),false);
  const signedOut=await fetch(origin+'/api/marketplace/auth',{method:'POST',headers:{Cookie:cookie(),Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({action:'sign-out'})});
  assert.equal(signedOut.status,200);
  for(const header of signedOut.headers.getSetCookie()){
    const pair=header.split(';')[0],separator=pair.indexOf('='),name=pair.slice(0,separator),value=pair.slice(separator+1);
    if(value)jar.set(name,value);else jar.delete(name);
  }
  await check(cookie(),false);
  console.log('PASS: real HTTP/Auth signed-out, signed-in, invalid-cookie and sign-out transitions; boolean-only private responses. No browser used.');
} finally {assert.ok(!(await admin.auth.admin.deleteUser(created.data.user.id)).error);console.log('Disposable account removed.');}
