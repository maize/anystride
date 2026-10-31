import 'server-only';
import { marketplaceTransaction } from './marketplace-store';
import { STRAVA_LIMITS } from './strava';

export class StravaApiError extends Error {
  constructor(public status: number, public retrySeconds = 900) { super('Strava is temporarily unavailable.'); }
}
/** Every outbound request, including token calls, shares a conservative durable budget. */
async function reserveCall() {
  const allowed = await marketplaceTransaction(async (db) => {
    await db.query(`UPDATE strava_runtime SET
      window_calls=CASE WHEN window_start<=now()-interval '15 minutes' THEN 0 ELSE window_calls END,
      window_start=CASE WHEN window_start<=now()-interval '15 minutes' THEN now() ELSE window_start END,
      day_calls=CASE WHEN day_start<>(now() AT TIME ZONE 'UTC')::date THEN 0 ELSE day_calls END,
      day_start=(now() AT TIME ZONE 'UTC')::date WHERE id=1`);
    const result = await db.query(`UPDATE strava_runtime SET window_calls=window_calls+1,day_calls=day_calls+1
      WHERE id=1 AND blocked_until<=now() AND window_calls<$1 AND day_calls<$2 RETURNING id`, [STRAVA_LIMITS.callsPerWindow, STRAVA_LIMITS.callsPerDay]);
    return Boolean(result.rowCount);
  });
  if (!allowed) throw new StravaApiError(429);
}
export async function stravaRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  await reserveCall();
  // Fixed provider origin: no configurable URL or caller-supplied redirect target.
  const response = await fetch(`https://www.strava.com${path}`, { ...init, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000) });
  if (response.status === 429) {
    const used = (response.headers.get('x-readratelimit-usage') || response.headers.get('x-ratelimit-usage') || '').split(',').map(Number);
    const limits = (response.headers.get('x-readratelimit-limit') || response.headers.get('x-ratelimit-limit') || '').split(',').map(Number);
    const daily = used[1] >= limits[1] && limits[1] > 0;
    const seconds = daily ? Math.ceil((Date.parse(new Date().toISOString().slice(0, 10)) + 86400000 - Date.now()) / 1000) : 900;
    await marketplaceTransaction((db) => db.query("UPDATE strava_runtime SET blocked_until=greatest(blocked_until,now()+$1*interval '1 second') WHERE id=1", [seconds]));
    await response.body?.cancel(); throw new StravaApiError(429, seconds);
  }
  if (!response.ok) { await response.body?.cancel(); throw new StravaApiError(response.status); }
  if (path === '/oauth/revoke') { await response.body?.cancel(); return null; }
  const reader = response.body?.getReader();
  if (!reader) throw new StravaApiError(502);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > 1024 * 1024) throw new StravaApiError(502);
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { await reader.cancel().catch(() => {}); }
}
export function stravaTokenRequest(fields: Record<string, string>) {
  return stravaRequest('/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.STRAVA_CLIENT_ID!, client_secret: process.env.STRAVA_CLIENT_SECRET!, ...fields }) });
}
export function revokeStravaToken(token: string) {
  return stravaRequest('/oauth/revoke', { method: 'POST', headers: { 'Authorization': `Basic ${Buffer.from(`${process.env.STRAVA_CLIENT_ID}:${process.env.STRAVA_CLIENT_SECRET}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token, token_type_hint: 'refresh_token' }) });
}
