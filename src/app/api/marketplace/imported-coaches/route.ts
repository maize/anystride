import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireMarketplaceActor } from "@/lib/marketplace-auth";
import { MarketplaceError, marketplaceOrigin } from "@/lib/marketplace-config";
import { parseImportedCoachAction } from "@/lib/imported-coach-input";
import { reviewImportedCoach } from "@/lib/imported-coach-store";
import { importedCoachCandidate } from "@/lib/imported-coach-catalog";
import { paymentBody } from "@/lib/payment-http";
import { PaymentError } from "@/lib/payment-config";

export const runtime = "nodejs";
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" } });

export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== marketplaceOrigin()) throw new MarketplaceError("Open this form on Anystride and try again.", 403);
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new MarketplaceError("Use the imported coach review form.", 415);
    const actor = await requireMarketplaceActor();
    if (!actor.admin) throw new MarketplaceError("Administrator access required.", 403);
    let body: unknown;
    const raw = await paymentBody(request, 16384);
    try { body = JSON.parse(raw); } catch { throw new MarketplaceError("Invalid review data.", 400); }
    const input = parseImportedCoachAction(body);
    const result = await reviewImportedCoach(actor, input);
    // Decisions have committed. A cache invalidation failure must not report a failed save.
    try {
      revalidatePath("/coaching");
      revalidatePath(`/coaching/${importedCoachCandidate(input.key)!.slug}`);
      revalidatePath("/running-coaches", "layout");
      revalidatePath("/sitemap.xml");
    } catch { console.error("Imported coach review: public cache refresh failed."); }
    return reply(result);
  } catch (error) {
    const known = error instanceof MarketplaceError || error instanceof PaymentError;
    return reply({ error: known ? error.message : "We could not save this review. Your edits are still in the form. Please try again." }, known ? error.status : 503);
  }
}
