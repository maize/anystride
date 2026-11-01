import { after, NextResponse } from 'next/server';
import { sameSecret } from '@/lib/strava-config';
import { receiveStravaEvent } from '@/lib/strava-store';
import { runStravaWorker } from '@/lib/strava-worker';
import { trainingBody, trainingFailure, trainingHeaders } from '@/lib/training-http';
export const maxDuration = 60;
type Context = { params: Promise<{ secret: string }> };
async function authorized(context: Context) { return sameSecret((await context.params).secret, process.env.STRAVA_WEBHOOK_SECRET); }
export async function GET(request: Request, context: Context) {
  const query = new URL(request.url).searchParams;
  const challenge = query.get('hub.challenge');
  if (!await authorized(context) || query.get('hub.mode') !== 'subscribe' || !sameSecret(query.get('hub.verify_token'), process.env.STRAVA_VERIFY_TOKEN) || !challenge || challenge.length > 512) return new NextResponse(null, { status: 403, headers: trainingHeaders });
  return NextResponse.json({ 'hub.challenge': challenge }, { headers: trainingHeaders });
}
export async function POST(request: Request, context: Context) {
  if (!await authorized(context)) return new NextResponse(null, { status: 403, headers: trainingHeaders });
  try {
    await receiveStravaEvent(await trainingBody(request, 4096));
    after(async () => { await runStravaWorker().catch(() => { console.error('Strava sync will retry.'); }); });
    return NextResponse.json({ received: true }, { headers: trainingHeaders });
  } catch (error) { return trainingFailure(error); }
}
