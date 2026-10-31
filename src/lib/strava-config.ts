import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { MarketplaceError, marketplaceOrigin } from './marketplace-config';
import { requireTraining } from './training-access';

export function stravaConfigured() {
  return process.env.STRAVA_SYNC === 'on' && /^\d+$/.test(process.env.STRAVA_CLIENT_ID || '') &&
    Boolean(process.env.STRAVA_CLIENT_SECRET) && /^[1-9][0-9]*$/.test(process.env.STRAVA_SUBSCRIPTION_ID || '') && /^[a-f0-9]{64}$/.test(process.env.STRAVA_TOKEN_KEY || '') &&
    /^[a-f0-9]{64}$/.test(process.env.STRAVA_WEBHOOK_SECRET || '') &&
    (process.env.STRAVA_VERIFY_TOKEN || '').length >= 32 && (process.env.CRON_SECRET || '').length >= 32;
}
export function stravaConfig() {
  requireTraining();
  if (!stravaConfigured()) throw new MarketplaceError('Strava connection is not available yet.', 503);
  return { clientId: process.env.STRAVA_CLIENT_ID!, clientSecret: process.env.STRAVA_CLIENT_SECRET!, origin: marketplaceOrigin() };
}
export const secretHash = (value: string) => createHash('sha256').update(value).digest('hex');
export function sameSecret(actual: string | null | undefined, expected: string | undefined) {
  return Boolean(actual && expected && timingSafeEqual(Buffer.from(secretHash(actual)), Buffer.from(secretHash(expected))));
}
function key() {
  if (!/^[a-f0-9]{64}$/.test(process.env.STRAVA_TOKEN_KEY || '')) throw new MarketplaceError('Strava connection is not available yet.');
  return Buffer.from(process.env.STRAVA_TOKEN_KEY!, 'hex');
}
export function encryptStrava(value: unknown, context: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(context));
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}
export function decryptStrava(value: string, context: string): unknown {
  const [version, iv, tag, data] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Invalid encrypted Strava connection.');
  const cipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
  cipher.setAAD(Buffer.from(context)); cipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return JSON.parse(Buffer.concat([cipher.update(Buffer.from(data, 'base64url')), cipher.final()]).toString('utf8'));
}
export interface StravaTokens { access_token: string; refresh_token: string; expires_at: number }
export function stravaTokens(value: unknown): StravaTokens {
  const v = value as Partial<StravaTokens> | null;
  if (!v || typeof v.access_token !== 'string' || !v.access_token || v.access_token.length > 2048 ||
      typeof v.refresh_token !== 'string' || !v.refresh_token || v.refresh_token.length > 2048 ||
      !Number.isSafeInteger(v.expires_at) || v.expires_at! <= 0) throw new Error('Invalid Strava token response.');
  return { access_token: v.access_token, refresh_token: v.refresh_token, expires_at: v.expires_at! };
}
