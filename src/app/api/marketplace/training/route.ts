import { NextResponse } from "next/server";
import { requireMarketplaceActor } from "@/lib/marketplace-auth";
import { MarketplaceError } from "@/lib/marketplace-config";
import { parseTrainingAction, trainingRange, trainingReference } from "@/lib/training-input";
import { readTraining, writeTraining } from "@/lib/training-store";
import { trainingBody, trainingFailure, trainingHeaders, trainingOrigin } from "@/lib/training-http";
function relationship(request: Request) {
  const value = new URL(request.url).searchParams.get("athlete");
  return value === null ? undefined : trainingReference(value);
}
export async function GET(request: Request) {
  try {
    const actor = await requireMarketplaceActor();
    const url = new URL(request.url);
    if ([...url.searchParams.keys()].some((key) => !["from", "to", "athlete"].includes(key))) throw new MarketplaceError("Invalid calendar request.", 400);
    const range = trainingRange(url.searchParams.get("from"), url.searchParams.get("to"));
    return NextResponse.json(await readTraining(actor, range.from, range.to, relationship(request)), { headers: trainingHeaders });
  } catch (error) { return trainingFailure(error); }
}
export async function POST(request: Request) {
  try {
    trainingOrigin(request);
    const actor = await requireMarketplaceActor();
    return NextResponse.json(await writeTraining(actor, parseTrainingAction(await trainingBody(request)), relationship(request)), { headers: trainingHeaders });
  } catch (error) { return trainingFailure(error); }
}
