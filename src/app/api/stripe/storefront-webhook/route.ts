import { NextResponse } from "next/server";
import { handleStorefrontWebhook } from "@/lib/storefront-payments";
import { MarketplaceError } from "@/lib/marketplace-config";
import { paymentBody } from "@/lib/payment-http";
import { PaymentError } from "@/lib/payment-config";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    return NextResponse.json(await handleStorefrontWebhook(await paymentBody(request, 262144), request.headers.get("stripe-signature") ?? ""));
  } catch (error) {
    const known = error instanceof MarketplaceError || error instanceof PaymentError;
    return NextResponse.json({ error: "Payment event could not be processed." }, { status: known ? error.status : 503 });
  }
}
