/** HTTP-only production release verification using disposable, private identities.
 * Provision/cleanup: scripts/release-training.mjs. Never uses real athlete accounts.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createServerClient } from '@supabase/ssr';
const deployment = process.argv[2];
assert.ok(deployment === 'https://anystride.com' || /^https:\/\/anystride-[a-z0-9]+-matthias-links-projects\.vercel\.app$/.test(deployment));
const config = process.argv[3] === '@env' ? { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } : JSON.parse(readFileSync(process.argv[3], 'utf8'));
assert.equal(new URL(config.url).hostname, 'gwwsxrtmlcnisnbphrfq.supabase.co');
const fixture = process.argv[4] === '@env' ? process.env.ANYSTRIDE_RELEASE_FIXTURE : readFileSync(process.argv[4], 'utf8').trim();
assert.match(fixture, /^[a-f0-9]{64}$/);
const tag = createHash('sha256').update(fixture).digest('hex').slice(0, 24);
const directory = mkdtempSync(join(tmpdir(), 'anystride-release-check-'));
let checks = 0;
async function account(role) {
  const jar = new Map();
  const client = createServerClient(config.url, config.key, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: values => values.forEach(({ name, value }) => jar.set(name, value)) } });
  const email = `release-${tag}-${role}@example.invalid`;
  const password = createHash('sha256').update(`${fixture}:${role}`).digest('base64url');
  const result = await client.auth.signInWithPassword({ email, password });
  assert.ok(!result.error, `Release ${role} sign-in failed`);
  checks++;
  return { id: result.data.user.id, email, cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; ') };
}
async function request(actor, path, body, expected = 200, origin = 'https://anystride.com') {
  const headers = { ...(actor ? { Cookie: actor.cookie } : {}), ...(body ? { Origin: origin, 'Content-Type': 'application/json' } : {}) };
  let status, text, responseHeaders;
  if (deployment === 'https://anystride.com') {
    const response = await fetch(deployment + path, { method: body ? 'POST' : 'GET', headers, ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'manual', signal: AbortSignal.timeout(30000) });
    status = response.status; text = await response.text(); responseHeaders = [...response.headers].map(([k, v]) => `${k}: ${v}`).join('\n');
  } else {
    const headerFile = join(directory, 'request.headers');
    writeFileSync(headerFile, Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n'), { mode: 0o600 });
    const args = ['--yes', 'vercel@64.5.0', 'curl', path, '--deployment', deployment, '--', '--silent', '--show-error', '--max-time', '30', '--header', '@' + headerFile, '--dump-header', join(directory, 'response.headers'), '--output', join(directory, 'response.body'), '--write-out', '%{http_code}'];
    if (body) { writeFileSync(join(directory, 'request.json'), JSON.stringify(body), { mode: 0o600 }); args.push('--request', 'POST', '--data-binary', '@' + join(directory, 'request.json')); }
    const result = spawnSync('npx', args, { encoding: 'utf8', timeout: 60000 });
    assert.equal(result.status, 0, `Staged request failed: ${path}`);
    status = Number(result.stdout.trim()); text = readFileSync(join(directory, 'response.body'), 'utf8'); responseHeaders = readFileSync(join(directory, 'response.headers'), 'utf8');
  }
  assert.equal(status, expected, `${path}: ${text.slice(0, 160)}`);
  if (path.startsWith('/api/') || path.startsWith('/account')) assert.match(responseHeaders, /cache-control:.*(?:private|no-cache).*no-store/i);
  checks++;
  return text.startsWith('{') ? JSON.parse(text) : text;
}
try {
  const home = await request(null, '/');
  assert.match(home, /<title>Running training plans/);
  assert.equal((home.match(/<h1\b/g) || []).length, 1);
  assert.match(home, /rel="canonical" href="https:\/\/anystride.com"/);
  assert.match(home, /Illustrative training week/);
  const schemas = [...home.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(m => JSON.parse(m[1]));
  assert.equal(schemas.find(s => s['@type'] === 'FAQPage').mainEntity.length, 8);
  console.log('PASS: deployed homepage and SEO metadata/schema.');
  const coach = await account('coach'), athlete = await account('athlete'), other = await account('other');
  if (process.argv.includes('--smoke')) {
    for (const path of ['/coaching/apply','/plans','/coaching','/privacy','/terms','/robots.txt','/sitemap.xml']) await request(null,path);
    for (const path of ['/account/training','/account/connections']) await request(athlete,path);
    for (const path of ['/account/athletes','/account/plans']) await request(coach,path);
    await request(null,'/api/marketplace/training?from=2026-10-19&to=2026-10-25',undefined,401);
    assert.equal((await request(other,'/api/marketplace/training?from=2026-10-19&to=2026-10-25')).entries.length,0);
    assert.equal((await request(athlete,'/api/strava/activities')).available,process.env.STRAVA_SYNC === 'on');
    console.log(`PASS: ${checks} live-domain checks, public pages/SEO, signed-in workspace pages, private responses and account isolation.`);
    process.exitCode=0;
  } else {
  const base = '/api/marketplace/training';
  const range = 'from=2026-10-19&to=2026-10-25';
  for (const path of [base + '?' + range, base + '/plans', '/api/strava/activities', '/api/strava/calendar?' + range]) await request(null, path, undefined, 401);
  await request(athlete, base, { action: 'delete', id: randomUUID(), version: 1 }, 403, 'https://untrusted.example');
  const relationship = randomUUID();
  await request(coach, base + '/coaching', { action: 'invite', id: relationship, name: 'Release test athlete', email: athlete.email });
  await request(coach, `${base}?${range}&athlete=${relationship}`, undefined, 403);
  const invitation = (await request(athlete, `${base}/coaching?${range}`)).coaches.find(c => c.id === relationship);
  await request(other, base + '/coaching', { action: 'accept', id: relationship, version: invitation.version }, 404);
  await request(athlete, base + '/coaching', { action: 'accept', id: relationship, version: invitation.version });
  const entry = { id: randomUUID(), kind: 'workout', date: '2026-10-19', version: 0, title: 'Release verification run', sport: 'run', notes: 'Temporary private test', plannedMinutes: 40, plannedKm: 6, actualMinutes: null, actualKm: null, effort: null, status: 'planned' };
  await request(coach, base + '/coaching', { action: 'assign', athletes: [relationship], entry });
  assert.equal((await request(athlete, base + '?' + range)).entries.find(e => e.id === entry.id).assignedBy, coach.id);
  assert.equal((await request(other, base + '?' + range)).entries.length, 0);
  const step = { kind: 'work', unit: 'minutes', amount: 3, target: 'effort', low: 4, high: 6, notes: '' };
  const workout = { title: 'Release intervals', sport: 'run', notes: '', plannedMinutes: null, plannedKm: null, actualMinutes: null, actualKm: null, effort: null, status: 'planned', structure: [{ repeat: 4, steps: [step, { ...step, kind: 'recovery', amount: 1 }] }] };
  const plan = (await request(coach, base + '/plans', { action: 'save', plan: { id: randomUUID(), version: 0, title: 'Private release plan', description: '', weeks: 2, sessions: [1, 8].map(day => ({ id: randomUUID(), day, workout })) } })).plan;
  assert.equal(plan.sessions[0].workout.plannedMinutes, 16);
  const selection = { planId: plan.id, version: plan.version, startDate: '2026-10-19', athletes: [relationship] };
  assert.equal((await request(coach, base + '/plans', { action: 'preview', ...selection })).preview.totalWorkouts, 2);
  const assignment = { action: 'assign', id: randomUUID(), ...selection };
  assert.equal((await request(coach, base + '/plans', assignment)).workouts, 2);
  assert.equal((await request(coach, base + '/plans', assignment)).replayed, true);
  const entries = (await request(athlete, base + '?from=2026-10-19&to=2026-11-01')).entries.filter(e => e.planAssignmentId);
  assert.equal(entries.length, 2); assert.equal(entries[1].date, '2026-10-27');
  const editable = Object.fromEntries(Object.entries(entries[0]).filter(([k]) => !['assignedBy','sourceId','coachCanEdit','planTitle','planAssignmentId'].includes(k)));
  await request(athlete, base, { action: 'save', entry: { ...editable, status: 'completed', actualMinutes: 17, actualKm: 3 } });
  const completed = (await request(coach, `${base}?${range}&athlete=${relationship}`)).entries.find(e => e.id === entries[0].id);
  assert.equal(completed.actualMinutes, 17); assert.equal(completed.plannedMinutes, 16); assert.equal(completed.coachCanEdit, false);
  await request(coach, `${base}?athlete=${relationship}`, { action: 'delete', id: completed.id, version: completed.version }, 403);
  const assigned = (await request(coach, base + '/plans')).assignments.find(a => a.relationshipId === relationship);
  assert.equal((await request(coach, base + '/plans', { action: 'remove', id: assigned.id })).removed, 1);
  assert.equal((await request(athlete, base + '?from=2026-10-19&to=2026-11-01')).entries.filter(e => e.planAssignmentId).length, 1);
  for (const [actor, path, text] of [[coach,'/account/plans','Plan library'], [coach,'/account/athletes','Your athletes'], [athlete,'/account/connections','Coach sharing'], [coach,`/account/training?date=2026-10-19&athlete=${relationship}`,'Release test athlete']]) assert.ok((await request(actor,path)).includes(text), path);
  const strava = await request(athlete, '/api/strava/activities');
  assert.equal(strava.available, false); assert.equal(strava.connected, false);
  assert.equal((await request(athlete, '/api/strava/calendar?' + range)).activities.length, 0);
  await request(athlete, base + '/coaching', { action: 'revoke', id: relationship, version: 2 });
  await request(coach, `${base}?${range}&athlete=${relationship}`, undefined, 403);
  console.log(`PASS: ${checks} HTTP/auth checks; invitation, athlete consent, workout assignment, structured two-week plans, retry deduplication, completion, safe plan removal, private pages, isolation, CSRF, revocation and explicit Strava-unavailable state. No browser or real user data used.`);
  }
} finally { rmSync(directory, { recursive: true, force: true }); }
