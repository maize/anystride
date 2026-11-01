import { NextResponse } from "next/server";
import { requireMarketplaceActor } from "@/lib/marketplace-auth";
import { MarketplaceError } from "@/lib/marketplace-config";
import { trainingReference } from "@/lib/training-input";
import { parsePlanAction } from "@/lib/training-plans-input";
import { readTrainingPlan, readTrainingPlans, writeTrainingPlan } from "@/lib/training-plans-store";
import { PLAN_LIMITS } from "@/lib/training-plans";
import { trainingBody, trainingFailure, trainingHeaders, trainingOrigin } from "@/lib/training-http";
export async function GET(request: Request) {
  try {
    const actor = await requireMarketplaceActor();
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some((k) => !["id", "before"].includes(k)) || (params.has("id") && params.has("before"))) throw new MarketplaceError("Choose a plan or history page.", 400);
    const result = params.has("id") ? { plan: await readTrainingPlan(actor, trainingReference(params.get("id"))) } : await readTrainingPlans(actor, params.has("before") ? trainingReference(params.get("before")) : undefined);
    return NextResponse.json(result, { headers: trainingHeaders });
  } catch (e) { return trainingFailure(e); }
}
export async function POST(request: Request) {
  try {
    trainingOrigin(request); const actor = await requireMarketplaceActor();
    return NextResponse.json(await writeTrainingPlan(actor, parsePlanAction(await trainingBody(request, PLAN_LIMITS.bytes + 8192))), { headers: trainingHeaders });
  } catch (e) { return trainingFailure(e); }
}
