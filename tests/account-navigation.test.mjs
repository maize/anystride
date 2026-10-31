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
test('Approved coaches get athlete management and the editable plan library',()=>{
  const links=accountNavigation({training:true,coach:true});
  assert.equal(links.find(l=>l.href==='/account/athletes').label,'Athletes');assert.ok(paths(links).includes('/account/plans'));
  assert.ok(!paths(links).includes('/account/storefront'));assert.ok(!paths(links).includes('/account/orders'));
});
test('Training-disabled accounts link back to the dashboard',()=>{
  const links=accountNavigation({training:false,coach:true});
  assert.deepEqual(paths(links),['/account']);
});
test('Nested pages keep their parent selected without selecting Overview or similar prefixes',()=>{
  for(const [path,parent] of [['/account/athletes/abc/activities','/account/athletes'],['/account/enquiries','/account/services'],['/account/workspaces/abc','/account/coaching'],['/account/orders/abc','/account/orders'],['/account/review/coaches','/account/review']]){
    assert.equal(accountLinkActive(path,parent),true);assert.equal(accountLinkActive(path,'/account'),false);
  }
  assert.equal(accountLinkActive('/account/plans-other','/account/plans'),false);assert.equal(accountLinkActive('/account','/account'),true);
});
