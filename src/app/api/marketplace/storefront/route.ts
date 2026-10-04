import { after, NextResponse } from "next/server";
import { requireMarketplaceActor } from "@/lib/marketplace-auth";
import { MarketplaceError, marketplaceOrigin } from "@/lib/marketplace-config";
import { paymentBody } from "@/lib/payment-http";
import { PaymentError } from "@/lib/payment-config";
import { parseStorefrontAction } from "@/lib/storefront-input";
import { saveStorefront } from "@/lib/storefront-store";
import { startSellerOnboarding, startStorefrontCheckout, reconcileStorefrontOrder, cancelStorefrontCheckout } from "@/lib/storefront-payments";
import { notifyMarketplaceReview } from "@/lib/marketplace-notifications";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" };
export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== marketplaceOrigin()) throw new MarketplaceError("Open this form on Anystride and try again.", 403);
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new MarketplaceError("Use the Anystride form.", 415);
    const actor = await requireMarketplaceActor();
    let body;
    try { body = JSON.parse(await paymentBody(request, 16384)); } catch (error) { if (error instanceof PaymentError) throw error; throw new MarketplaceError("Invalid form data.", 400); }
    const input = parseStorefrontAction(body);
    if (input.action === "profile" || input.action === "offer") {
      const result = await saveStorefront(actor, input);
      if (result.notification) { const notification = result.notification; try { after(() => notifyMarketplaceReview(notification)); } catch { console.error("Storefront review notification could not be scheduled."); } }
      return NextResponse.json({ saved: true }, { headers });
    }
    const result = input.action === "payouts" ? await startSellerOnboarding(actor) : input.action === "checkout" ? await startStorefrontCheckout(actor,input.serviceId,input.orderId,input.version) : input.action === "cancel" ? await cancelStorefrontCheckout(input.orderId, actor) : await reconcileStorefrontOrder(input.orderId, actor);
    return NextResponse.json(result, { headers });
  } catch (error) {
    const known = error instanceof MarketplaceError || error instanceof PaymentError;
    return NextResponse.json({ error: known ? error.message : "We couldn’t complete that request. Please try again; your details have been kept." }, { status: known ? error.status : 503, headers });
  }
}
