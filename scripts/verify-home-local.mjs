import assert from 'node:assert/strict';
// Rendered HTML and SEO verification only. Optional production smoke check; no browser.
const origin=process.argv[2] || 'http://localhost:3010';
assert.ok(['http://localhost:3010','https://anystride.com'].includes(origin), 'Use the local app or Anystride production only.');
const response=await fetch(origin,{redirect:'manual'});
assert.equal(response.status,200);
const html=await response.text();
assert.equal((html.match(/<h1\b/g)||[]).length,1);
assert.match(html,/<title>Running training plans/);
assert.match(html,/<link[^>]*rel="canonical"[^>]*href="https:\/\/anystride.com\/?"/);
assert.match(html,/<meta[^>]*name="description"[^>]*content="[^"]*free running training plans/);
assert.match(html,/<meta[^>]*property="og:image"[^>]*content="[^"]+"/);
assert.match(html,/<meta[^>]*name="twitter:card"[^>]*content="summary_large_image"/);
assert.ok(!/<meta[^>]*name="robots"[^>]*content="[^"]*noindex/.test(html));
const schemas=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));
const faq=schemas.find(s=>s['@type']==='FAQPage');
assert.equal(faq.mainEntity.length,8);
for(const item of faq.mainEntity){assert.ok(html.includes(item.name));assert.ok(html.includes(item.acceptedAnswer.text.replaceAll('&','&amp;')));}
assert.match(html,/Illustrative training week/);
assert.match(html,/Only You activities/);
assert.match(html,/early access/);
assert.match(html,/Direct Garmin and COROS syncing/);
for(const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${match[1]}"`), `Missing anchor ${match[1]}`);
assert.match(html,/Strava syncing is available in a limited beta for up to ten connected athletes/);
for(const path of ['/coaching/apply','/plans','/coaching','/coaching/match','/account/sign-up','/guides','/privacy','/terms']){
  assert.ok(html.includes(`href="${path}"`));
  assert.equal((await fetch(`${origin}${path}`,{redirect:'manual'})).status,200,path);
}
console.log('PASS: rendered homepage, single H1, canonical, metadata, social preview, visible FAQ/schema agreement, beta disclosures and key internal links. No browser used.');
