import { NextResponse } from "next/server";
import { requireMarketplaceActor } from "@/lib/marketplace-auth";
import { trainingRange } from "@/lib/training-input";
import { parseCoachingAction } from "@/lib/training-coaching-input";
import { readTrainingRoster, writeTrainingCoaching } from "@/lib/training-coaching-store";
import { trainingBody, trainingFailure, trainingHeaders, trainingOrigin } from "@/lib/training-http";
export async function GET(request: Request) {
  try {
    const actor = await requireMarketplaceActor();
    const url = new URL(request.url);
    const { from, to } = trainingRange(url.searchParams.get("from"), url.searchParams.get("to"));
    return NextResponse.json(await readTrainingRoster(actor, from, to), { headers: trainingHeaders });
  } catch (error) { return trainingFailure(error); }
}
export async function POST(request: Request) {
  try {
    trainingOrigin(request);
    const actor = await requireMarketplaceActor();
    return NextResponse.json(await writeTrainingCoaching(actor, parseCoachingAction(await trainingBody(request))), { headers: trainingHeaders });
  } catch (error) { return trainingFailure(error); }
}
