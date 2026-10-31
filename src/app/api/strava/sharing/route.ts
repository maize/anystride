import { NextResponse } from 'next/server';
import { requireMarketplaceActor } from '@/lib/marketplace-auth';
import { MarketplaceError } from '@/lib/marketplace-config';
import { trainingBody, trainingFailure, trainingHeaders, trainingOrigin } from '@/lib/training-http';
import { parseStravaSharing } from '@/lib/strava-sharing-input';
import { readStravaSharing, writeStravaSharing } from '@/lib/strava-sharing-store';
function ownAccount(request: Request) {
  if (new URL(request.url).search) throw new MarketplaceError('Manage sharing from your own account.',400);
}
export async function GET(request: Request) {
  try { ownAccount(request); return NextResponse.json(await readStravaSharing(await requireMarketplaceActor()), { headers: trainingHeaders }); }
  catch (error) { return trainingFailure(error); }
}
export async function POST(request: Request) {
  try {
    ownAccount(request); trainingOrigin(request);
    const actor = await requireMarketplaceActor();
    return NextResponse.json(await writeStravaSharing(actor,parseStravaSharing(await trainingBody(request,1024))), { headers: trainingHeaders });
  } catch (error) { return trainingFailure(error); }
}
