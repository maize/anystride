import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './support/load-module.mjs';
const {accountNavigation,accountLinkActive}=load('src/lib/account-navigation.ts');
const paths=links=>Array.from(links,link=>link.href);
test('Runners can reach training, coach invitations, free plans and Strava without coach-only tools',()=>{
  const links=accountNavigation({training:true,coach:false});
  assert.deepEqual(paths(links),['/account','/account/training','/account/athletes','/plans','/account/connections']);
  assert.equal(links.find(l=>l.href==='/account/athletes').label,'My coaches');
  assert.ok(!paths(links).includes('/account/storefront'));assert.ok(!paths(links).includes('/account/review'));
});
test('Coach view contains athlete and business tools without personal training navigation',()=>{
  const links=accountNavigation({training:true,coach:true});
  assert.equal(links.find(l=>l.href==='/account/athletes').label,'Athletes');assert.ok(paths(links).includes('/account/plans'));
  assert.ok(paths(links).includes('/account/storefront'));assert.ok(paths(links).includes('/account/orders'));
  assert.ok(!paths(links).includes('/account/training'));assert.ok(!paths(links).includes('/account/connections'));
  const runner=accountNavigation({training:true,coach:true,view:'runner'});assert.ok(paths(runner).includes('/account/training'));assert.ok(!paths(runner).includes('/account/plans'));assert.ok(!paths(runner).includes('/account/storefront'));assert.equal(runner.find(l=>l.href==='/account/athletes').label,'My coaches');
});
test('Training-disabled coach views keep their business tools',()=>{
  const links=accountNavigation({training:false,coach:true});
  assert.deepEqual(paths(links),['/account','/account/storefront','/account/services','/account/orders']);
  const applicant=accountNavigation({training:true,coach:false,applicant:true,view:'coach'});assert.deepEqual(paths(applicant),['/account','/account/storefront','/account/services']);
});
test('Nested pages keep their parent selected without selecting Overview or similar prefixes',()=>{
  for(const [path,parent] of [['/account/athletes/abc/activities','/account/athletes'],['/account/enquiries','/account/services'],['/account/workspaces/abc','/account/coaching'],['/account/orders/abc','/account/orders'],['/account/review/coaches','/account/review']]){
    assert.equal(accountLinkActive(path,parent),true);assert.equal(accountLinkActive(path,'/account'),false);
  }
  assert.equal(accountLinkActive('/account/plans-other','/account/plans'),false);assert.equal(accountLinkActive('/account','/account'),true);
});

test('Coach athlete calendars retain the Athletes parent while personal calendars select Training',()=>{
  assert.equal(accountLinkActive('/account/training','/account/athletes',true),true);
  assert.equal(accountLinkActive('/account/training','/account',true),false);
  assert.equal(accountLinkActive('/account/training','/account/training',true),false);
  assert.equal(accountLinkActive('/account/training','/account/training',false),true);
});
