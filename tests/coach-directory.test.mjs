import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './support/load-module.mjs';
const { coachDirectoryCards } = load('src/lib/coach-directory.ts');
const jack={slug:'jack-anstey',name:'Jack Anstey',city:'Online',location:'Global',format:'online',focus:['performance','marathon'],specialties:['800m–marathon','World Champion','Evidence-based training'],blurb:'Individual online coaching from 800m to the marathon.',bio:['Full directory biography.'],experience:'Five years',verified:true,link:'mailto:coach@example.test',source:{name:'Coach',url:'mailto:coach@example.test'}};
const account={name:'Jack Anstey',bio:'Full coach-supplied application biography that remains on the account.',credentials:'Coach qualifications',slug:null,directory_slug:jack.slug};
const merge={directory_slug:jack.slug,storefront_slug:null,status:'approved'};
test('a linked approved account and directory entry produce one approved card with the original card content',()=>{
 const cards=coachDirectoryCards([jack],[account],[],[merge]);
 assert.equal(cards.length,1);assert.equal(cards[0].approved,true);assert.equal(cards[0].href,'/coaching/jack-anstey');
 assert.equal(cards[0].coach.blurb,jack.blurb);assert.equal(cards[0].coach.location,'Global');assert.deepEqual(Array.from(cards[0].coach.specialties),jack.specialties);assert.equal(cards[0].application.bio,account.bio);
});
test('linked approved coaches retain city, focus and format filters and do not reappear as unapproved duplicates',()=>{
 for(const filters of [{city:'Online'},{focus:'performance'},{format:'online'}]){const cards=coachDirectoryCards([jack],[account],[],[merge],filters);assert.equal(cards.length,1);assert.equal(cards[0].approved,true);}
 for(const filters of [{city:'Boston'},{focus:'first-timers'},{format:'in-person'}])assert.equal(coachDirectoryCards([jack],[account],[],[merge],filters).length,0);
});
test('a published storefront replaces both linked entries and uses the coach-selected storefront content',()=>{
 const storefront={slug:'jack-coaching',name:jack.name,headline:'Personal coaching',location:'Online worldwide',specialties:['Marathon'],bio:account.bio,credentials:account.credentials,photo_url:'',approach:'Coach approach',published:true,version:1};
 const cards=coachDirectoryCards([jack],[{...account,slug:storefront.slug}],[storefront],[{...merge,storefront_slug:storefront.slug}],{focus:'performance'});
 assert.equal(cards.length,1);assert.equal(cards[0].href,'/coaching/with/jack-coaching');assert.equal(cards[0].coach.blurb,storefront.headline);assert.equal(cards[0].approved,true);
});
test('names alone do not merge identities or give a directory listing an approval badge',()=>{
 const cards=coachDirectoryCards([jack],[{...account,directory_slug:null}],[],[]);assert.equal(cards.length,2);assert.equal(cards.filter(c=>c.approved).length,1);
});
test('suspended linked accounts stay hidden and an unavailable account listing does not remove the public directory entry',()=>{
 assert.equal(coachDirectoryCards([jack],[],[],[{...merge,status:'suspended'}]).length,0);
 const cards=coachDirectoryCards([jack],[],[],[merge]);assert.equal(cards.length,1);assert.equal(cards[0].approved,false);
});
