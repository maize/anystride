import { after, NextResponse } from "next/server";
import { requireMarketplaceActor } from "@/lib/marketplace-auth";
import { MarketplaceError, marketplaceOrigin } from "@/lib/marketplace-config";
import { parseMarketplaceAction } from "@/lib/marketplace-input";
import { actOnMarketplace, marketplaceDashboard } from "@/lib/marketplace-store";
import { paymentBody } from "@/lib/payment-http";
import { PaymentError } from "@/lib/payment-config";
import { notifyMarketplaceReview } from "@/lib/marketplace-notifications";

export const runtime = "nodejs";
function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" } });
}
function failure(error: unknown) {
  const known = error instanceof MarketplaceError || error instanceof PaymentError;
  return reply({ error: known ? error.message : "We could not save or load your account. Try again; your form has been kept." }, known ? error.status : 503);
}
export async function GET() {
  try { return reply(await marketplaceDashboard(await requireMarketplaceActor())); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    // Cookie-authenticated mutations require a fixed trusted origin, not Host.
    if (request.headers.get("origin") !== marketplaceOrigin()) throw new MarketplaceError("Open the form on Anystride and try again.", 403);
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new MarketplaceError("Use the Anystride account form.", 415);
    const actor = await requireMarketplaceActor();
    let body: unknown;
    const raw = await paymentBody(request, 8192);
    try { body = JSON.parse(raw); } catch { throw new MarketplaceError("Invalid form data.", 400); }
    const result = await actOnMarketplace(actor, parseMarketplaceAction(body));
    if (result.notification) {
      const notification = result.notification;
      try {
        after(() => notifyMarketplaceReview(notification));
      } catch {
        // A saved application must never look failed because email scheduling failed.
        console.error("Marketplace review notification: scheduling failed.");
      }
    }
    // Internal notification references never become client-visible response fields.
    return reply({ saved: result.saved });
  } catch (error) { return failure(error); }
}
