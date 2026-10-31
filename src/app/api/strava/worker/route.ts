import { NextResponse } from 'next/server';
import { sameSecret } from '@/lib/strava-config';
import { runStravaWorker } from '@/lib/strava-worker';
import { trainingFailure, trainingHeaders } from '@/lib/training-http';
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32 || !sameSecret(request.headers.get('authorization'), `Bearer ${secret}`)) return new NextResponse(null, { status: 401, headers: trainingHeaders });
  try { return NextResponse.json(await runStravaWorker(), { headers: trainingHeaders }); }
  catch (error) { return trainingFailure(error); }
}
