import { NextResponse } from 'next/server';
import { requireMarketplaceActor } from '@/lib/marketplace-auth';
import { MarketplaceError } from '@/lib/marketplace-config';
import { trainingBody, trainingFailure, trainingHeaders, trainingOrigin } from '@/lib/training-http';
import { beginStrava } from '@/lib/strava-store';
export async function POST(request: Request) {
  try {
    trainingOrigin(request);
    const actor = await requireMarketplaceActor();
    const body = await trainingBody(request, 1024) as Record<string, unknown> | null;
    if (!body || body.consent !== true || typeof body.privateActivities !== 'boolean' || Object.keys(body).some((k) => !['consent','privateActivities'].includes(k))) throw new MarketplaceError('Confirm activity access before connecting.', 400);
    const { state, url } = await beginStrava(actor, body.privateActivities);
    const response = NextResponse.json({ url }, { headers: trainingHeaders });
    response.cookies.set('anystride-strava-state', state, { httpOnly: true, secure: url.startsWith('https:') && process.env.MARKETPLACE_APP_URL?.startsWith('https:') === true, sameSite: 'lax', path: '/api/strava/callback', maxAge: 600 });
    return response;
  } catch (error) { return trainingFailure(error); }
}
