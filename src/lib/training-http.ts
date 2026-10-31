import "server-only";
import { NextResponse } from "next/server";
import { MarketplaceError, marketplaceOrigin } from "./marketplace-config";
import { PaymentError } from "./payment-config";
import { paymentBody } from "./payment-http";
export const trainingHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" };
export function trainingFailure(error: unknown) {
  const known = error instanceof MarketplaceError || error instanceof PaymentError;
  return NextResponse.json({ error: known ? error.message : "Training is temporarily unavailable. Retry your request; your form is still here." }, { status: known ? error.status : 503, headers: trainingHeaders });
}
export function trainingOrigin(request: Request) {
  if (request.headers.get("origin") !== marketplaceOrigin()) throw new MarketplaceError("Use the Anystride training workspace.", 403);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new MarketplaceError("Use the training form.", 415);
}
export async function trainingBody(request: Request, limit = 8192): Promise<unknown> {
  try { return JSON.parse(await paymentBody(request, limit)); }
  catch (error) { if (error instanceof PaymentError) throw error; throw new MarketplaceError("Invalid training request.", 400); }
}
