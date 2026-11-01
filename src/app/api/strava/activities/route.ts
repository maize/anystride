import { after, NextResponse } from 'next/server';
import { requireMarketplaceActor } from '@/lib/marketplace-auth';
import { MarketplaceError } from '@/lib/marketplace-config';
import { trainingBody, trainingFailure, trainingHeaders, trainingOrigin } from '@/lib/training-http';
import { disconnectStrava, readStrava, refreshStrava } from '@/lib/strava-store';
import { runStravaWorker } from '@/lib/strava-worker';
export const maxDuration = 60;
function ownAccount(request: Request) {
  if (new URL(request.url).search) throw new MarketplaceError('Strava activities are available only in your own account.', 400);
}
export async function GET(request: Request) {
  try { ownAccount(request); return NextResponse.json(await readStrava(await requireMarketplaceActor()), { headers: trainingHeaders }); }
  catch (error) { return trainingFailure(error); }
}
export async function POST(request: Request) {
  try {
    ownAccount(request); trainingOrigin(request);
    const actor = await requireMarketplaceActor();
    const body = await trainingBody(request, 1024) as { action?: unknown } | null;
    if (!body || Object.keys(body).length !== 1 || !['refresh','disconnect'].includes(String(body.action))) throw new MarketplaceError('Choose refresh or disconnect.', 400);
    const result = body.action === 'disconnect' ? await disconnectStrava(actor) : (await refreshStrava(actor), { message: 'Sync requested. Use Check status in a moment to see your activities.' });
    after(async () => { await runStravaWorker().catch(() => { console.error('Strava sync will retry.'); }); });
    return NextResponse.json(result, { headers: trainingHeaders });
  } catch (error) { return trainingFailure(error); }
}
