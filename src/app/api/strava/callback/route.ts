import { cookies } from 'next/headers';
import { after, NextResponse } from 'next/server';
import { requireMarketplaceActor } from '@/lib/marketplace-auth';
import { marketplaceOrigin } from '@/lib/marketplace-config';
import { finishStrava } from '@/lib/strava-store';
import { runStravaWorker } from '@/lib/strava-worker';
import { trainingFailure, trainingHeaders } from '@/lib/training-http';
export const maxDuration = 60;
export async function GET(request: Request) {
  let origin;
  try { origin = marketplaceOrigin(); } catch (error) { return trainingFailure(error); }
  const url = new URL(request.url);
  let outcome = 'failed';
  try {
    const actor = await requireMarketplaceActor();
    const cookie = (await cookies()).get('anystride-strava-state')?.value;
    if (url.searchParams.get('error') === 'access_denied') outcome = 'cancelled';
    else {
      await finishStrava(actor, url.searchParams.get('state') || '', cookie, url.searchParams.get('code') || '');
      outcome = 'connected';
      after(async () => { await runStravaWorker().catch(() => { console.error('Strava sync will retry.'); }); });
    }
  } catch { /* Never reflect provider codes, state, tokens, or raw errors into the page. */ }
  const response = NextResponse.redirect(`${origin}/account/connections?strava=${outcome}`, 303);
  Object.entries(trainingHeaders).forEach(([key, value]) => response.headers.set(key, value));
  response.cookies.set('anystride-strava-state', '', { path: '/api/strava/callback', maxAge: 0 });
  return response;
}
