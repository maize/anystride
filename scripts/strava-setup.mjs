import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, lstatSync } from 'node:fs';
import { resolve } from 'node:path';
const file = resolve('.env.strava.local');
const mode = process.argv[2] || 'status';
if (mode === 'init') {
  if (existsSync(file)) throw new Error('.env.strava.local already exists; no secrets were changed.');
  const secret = () => randomBytes(32).toString('hex');
  writeFileSync(file, `# Private Strava setup. Ignored by Git; never paste secrets into chat.\nSTRAVA_SYNC=off\nSTRAVA_CLIENT_ID=\nSTRAVA_CLIENT_SECRET=\nSTRAVA_TOKEN_KEY=${secret()}\nSTRAVA_WEBHOOK_SECRET=${secret()}\nSTRAVA_VERIFY_TOKEN=${secret()}\nSTRAVA_SUBSCRIPTION_ID=\nCRON_SECRET=${secret()}\n# Public HTTPS origin forwarding to this app, without a path.\nSTRAVA_WEBHOOK_ORIGIN=\n`, { flag: 'wx', mode: 0o600 });
  console.log('Created private .env.strava.local with generated local security keys. Add your Strava client ID and secret.');
  process.exit(0);
}
if (existsSync(file)) {
  if (lstatSync(file).isSymbolicLink()) throw new Error('Refusing a symbolic-link settings file.');
  process.loadEnvFile(file);
}
if (mode === 'status') {
  for (const name of ['STRAVA_CLIENT_ID','STRAVA_CLIENT_SECRET','STRAVA_TOKEN_KEY','STRAVA_WEBHOOK_SECRET','STRAVA_VERIFY_TOKEN','STRAVA_SUBSCRIPTION_ID','CRON_SECRET','STRAVA_WEBHOOK_ORIGIN']) console.log(`${name}: ${process.env[name] ? 'configured' : 'missing'}`);
  console.log(`Sync: ${process.env.STRAVA_SYNC === 'on' ? 'enabled' : 'off'}`);
  process.exit(0);
}
if (mode !== 'subscribe') throw new Error('Use: node scripts/strava-setup.mjs init|status|subscribe');
if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET || !/^[a-f0-9]{64}$/.test(process.env.STRAVA_WEBHOOK_SECRET || '') || (process.env.STRAVA_VERIFY_TOKEN || '').length < 32) throw new Error('Complete the private Strava settings first.');
const origin = new URL(process.env.STRAVA_WEBHOOK_ORIGIN || '');
if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) throw new Error('Use a public HTTPS origin without a path.');
const callback = `${origin.origin}/api/strava/webhook/${process.env.STRAVA_WEBHOOK_SECRET}`;
const credentials = { client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET };
const list = await fetch(`https://www.strava.com/api/v3/push_subscriptions?${new URLSearchParams(credentials)}`, { redirect: 'error', signal: AbortSignal.timeout(15000) });
if (!list.ok) throw new Error(`Strava subscription lookup failed (${list.status}).`);
const subscriptions = await list.json();
if (!Array.isArray(subscriptions)) throw new Error('Unexpected Strava subscription response.');
let subscription = subscriptions.find((s) => s.callback_url === callback);
if (!subscription && subscriptions.length) throw new Error('This Strava app already has a different webhook. It was not replaced. Use a separate app or review its existing integration.');
if (!subscription) {
  const response = await fetch('https://www.strava.com/api/v3/push_subscriptions', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000), body: new URLSearchParams({ ...credentials, callback_url: callback, verify_token: process.env.STRAVA_VERIFY_TOKEN }) });
  if (!response.ok) throw new Error(`Strava webhook registration failed (${response.status}). Ensure your public endpoint is reachable and has matching security keys.`);
  subscription = await response.json();
}
if (!Number.isSafeInteger(subscription.id) || subscription.id<=0) throw new Error('Invalid subscription ID.');
if (existsSync(file)) {
  const contents = readFileSync(file, 'utf8');
  if (!/^STRAVA_SUBSCRIPTION_ID=/m.test(contents)) throw new Error(`Set STRAVA_SUBSCRIPTION_ID=${subscription.id} in your deployment.`);
  writeFileSync(file, contents.replace(/^STRAVA_SUBSCRIPTION_ID=.*$/m, `STRAVA_SUBSCRIPTION_ID=${subscription.id}`), { mode: 0o600 });
}
console.log(`Webhook registered: subscription ${subscription.id}. Set STRAVA_SYNC=on and reload the app environment. Copy settings securely to the intended deployment; never publish this file.`);
