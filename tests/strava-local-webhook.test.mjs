import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createWebhookRelay } from '../scripts/strava-local-webhook.mjs';

test('local Strava relay exposes only its webhook and strips client credentials', async () => {
  const secret = 'a'.repeat(64); const calls = [];
  const server = createWebhookRelay({ secret, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return new Response('{"received":true}', { status: 200, headers: { 'set-cookie': 'never=forward' } });
  } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ['/', '/account', '/api/strava/worker', '/api/strava/webhook/wrong']) {
      assert.equal((await fetch(base + path)).status, 404);
    }
    const path = `/api/strava/webhook/${secret}`;
    assert.equal((await fetch(base + path, { method: 'DELETE' })).status, 405);
    assert.equal((await fetch(base + path, { method: 'POST', body: 'x'.repeat(4097) })).status, 413);
    assert.equal(calls.length, 0);
    const response = await fetch(base + path, { method: 'POST', body: '{"object_id":1}', headers: { cookie: 'session=private', authorization: 'Bearer private' } });
    assert.equal(response.status, 200); assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(calls.length, 1); assert.deepEqual(calls[0].options.headers, { 'content-type': 'application/json' });
    assert.equal(calls[0].options.redirect, 'error');
    assert.equal(calls[0].options.body.toString(), '{"object_id":1}');
    await fetch(base + path + '?hub.challenge=example');
    assert.equal(calls[1].url, 'http://127.0.0.1:3010' + path + '?hub.challenge=example');
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
