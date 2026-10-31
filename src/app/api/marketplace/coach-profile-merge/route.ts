import { after, NextResponse } from "next/server";
import { requireMarketplaceActor } from "@/lib/marketplace-auth";
import { MarketplaceError, marketplaceOrigin } from "@/lib/marketplace-config";
import { PaymentError } from "@/lib/payment-config";
import { paymentBody } from "@/lib/payment-http";
import { parseCoachProfileMerge } from "@/lib/coach-profile-merge-input";
import { mergeCoachProfile } from "@/lib/coach-profile-merge-store";
import { notifyMarketplaceReview } from "@/lib/marketplace-notifications";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" };
export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== marketplaceOrigin()) throw new MarketplaceError("Open this form on Anystride and try again.", 403);
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new MarketplaceError("Use the profile merge form.", 415);
    const actor = await requireMarketplaceActor();
    let body;
    const raw = await paymentBody(request, 8192);
    try { body = JSON.parse(raw); } catch { throw new MarketplaceError("Invalid merge request.", 400); }
    const result = await mergeCoachProfile(actor, parseCoachProfileMerge(body));
    if (result.notification) {
      const notification = result.notification;
      try { after(() => notifyMarketplaceReview(notification)); } catch { console.error("Coach merge review notification could not be scheduled."); }
    }
    return NextResponse.json({ saved: true }, { headers });
  } catch (error) {
    const known = error instanceof MarketplaceError || error instanceof PaymentError;
    return NextResponse.json({ error: known ? error.message : "We couldn’t merge this profile. Your account is unchanged. Please try again." }, { status: known ? error.status : 503, headers });
  }
}
