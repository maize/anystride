import { NextResponse } from 'next/server';
import { requireMarketplaceActor } from '@/lib/marketplace-auth';
import { trainingFailure, trainingHeaders } from '@/lib/training-http';
import { stravaCoachQuery } from '@/lib/strava-sharing-input';
import { readCoachStrava } from '@/lib/strava-sharing-store';
export async function GET(request: Request) {
  try {
    const actor = await requireMarketplaceActor();
    return NextResponse.json(await readCoachStrava(actor,stravaCoachQuery(new URL(request.url).searchParams)), { headers: trainingHeaders });
  } catch (error) { return trainingFailure(error); }
}
