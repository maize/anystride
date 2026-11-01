import { NextResponse } from "next/server";
import { requireMarketplaceActor } from "@/lib/marketplace-auth";
import { importTraining, parseTrainingImport } from "@/lib/training-import";
import { trainingBody, trainingFailure, trainingHeaders, trainingOrigin } from "@/lib/training-http";
export async function POST(request: Request) {
  try {
    trainingOrigin(request);
    const actor = await requireMarketplaceActor();
    return NextResponse.json(await importTraining(actor, parseTrainingImport(await trainingBody(request, 65536))), { headers: trainingHeaders });
  } catch (error) { return trainingFailure(error); }
}
