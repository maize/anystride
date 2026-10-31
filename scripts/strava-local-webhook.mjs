import { createServer } from 'node:http';
import { pathToFileURL, fileURLToPath } from 'node:url';

// Expose only the secret webhook path, never the application or local auth UI.
export function createWebhookRelay({ secret, origin = 'http://127.0.0.1:3010', fetchImpl = fetch }) {
  if (!/^[a-f0-9]{64}$/.test(secret || '')) throw new Error('Missing webhook secret.');
  if (origin !== 'http://127.0.0.1:3010') throw new Error('Only the local Anystride server is allowed.');
  let active = 0;
  return createServer({ requestTimeout: 10000, headersTimeout: 5000, maxHeaderSize: 8192 }, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const finish = (status) => { res.writeHead(status); res.end(); };
    let url;
    try { url = new URL(req.url || '/', origin); } catch { return finish(400); }
    if (url.pathname !== `/api/strava/webhook/${secret}` || url.origin !== origin) return finish(404);
    if (!['GET', 'POST'].includes(req.method)) return finish(405);
    if (active >= 8) return finish(429);
    if (Number(req.headers['content-length'] || 0) > 4096) return finish(413);
    active++;
    try {
      const chunks = []; let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 4096) { finish(413); req.destroy(); return; }
        chunks.push(chunk);
      }
      const response = await fetchImpl(origin + url.pathname + url.search, {
        method: req.method, redirect: 'error', signal: AbortSignal.timeout(8000),
        headers: { 'content-type': 'application/json' },
        ...(req.method === 'POST' ? { body: Buffer.concat(chunks) } : {}),
      });
      res.writeHead(response.status, { 'content-type': 'application/json' });
      // Responses are fixed challenge/acknowledgement objects; no forwarded cookies.
      res.end(await response.text());
    } catch { if (!res.headersSent) finish(502); else res.end(); }
    finally { active--; }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.loadEnvFile(fileURLToPath(new URL('../.env.strava.local', import.meta.url)));
  const relay = createWebhookRelay({ secret: process.env.STRAVA_WEBHOOK_SECRET });
  relay.listen(3011, '127.0.0.1', () => console.log('Strava webhook-only relay listening on local port 3011.'));
  // Local development has no Vercel cron. Keep retention cleanup and retries active.
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const response = await fetch('http://127.0.0.1:3010/api/strava/worker', {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
        redirect: 'error', signal: AbortSignal.timeout(125000),
      });
      if (!response.ok) console.error(`Strava local maintenance returned ${response.status}.`);
    } catch { console.error('Strava local maintenance could not reach Anystride.'); }
    finally { running = false; }
  };
  const timer = setInterval(tick, 15 * 60 * 1000);
  void tick();
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { clearInterval(timer); relay.close(); });
}
