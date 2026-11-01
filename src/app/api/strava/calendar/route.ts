import { NextResponse } from 'next/server';
import { requireMarketplaceActor } from '@/lib/marketplace-auth';
import { MarketplaceError } from '@/lib/marketplace-config';
import { trainingBody,trainingFailure,trainingHeaders,trainingOrigin } from '@/lib/training-http';
import { stravaCalendarQuery,stravaMatchInput } from '@/lib/strava-calendar-input';
import { readStravaCalendar,matchStravaWorkout } from '@/lib/strava-calendar-store';
export async function GET(request: Request) {
  try { const actor=await requireMarketplaceActor(); return NextResponse.json(await readStravaCalendar(actor,stravaCalendarQuery(new URL(request.url).searchParams)),{headers:trainingHeaders}); }
  catch(error){return trainingFailure(error);}
}
export async function POST(request: Request) {
  try {
    trainingOrigin(request);
    const actor=await requireMarketplaceActor();
    if(new URL(request.url).search) throw new MarketplaceError('Only athletes can match activities in their own calendar.',400);
    return NextResponse.json(await matchStravaWorkout(actor,stravaMatchInput(await trainingBody(request,1024))),{headers:trainingHeaders});
  } catch(error){return trainingFailure(error);}
}
