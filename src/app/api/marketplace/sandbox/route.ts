import { NextResponse } from "next/server";
import { requireMarketplaceActor } from "@/lib/marketplace-auth";
import { MarketplaceError, marketplaceOrigin } from "@/lib/marketplace-config";
import { PaymentError } from "@/lib/payment-config";
import { paymentBody } from "@/lib/payment-http";
import { startSandboxCheckout, writeSandboxMessage } from "@/lib/sandbox-workspace";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" };
export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== marketplaceOrigin()) throw new MarketplaceError("Use the Anystride account page.", 403);
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new MarketplaceError("Use the account form.", 415);
    const actor = await requireMarketplaceActor();
    let body;
    try { body = JSON.parse(await paymentBody(request, 8192)); }
    catch (error) { if (error instanceof PaymentError) throw error; throw new MarketplaceError("Invalid sandbox request.", 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new MarketplaceError("Invalid sandbox request.", 400);
    const fields = body.action === "checkout" ? ["action", "requestId"] : body.action === "message" ? ["action", "requestId", "id", "body"] : [];
    if (!fields.length || Object.keys(body).some((key) => !fields.includes(key))) throw new MarketplaceError("Invalid sandbox request.", 400);
    const result = body.action === "checkout" ? await startSandboxCheckout(actor, body.requestId)
      : await writeSandboxMessage(actor, body.requestId, body.id, body.body);
    return NextResponse.json(result, { headers });
  } catch (error) {
    const known = error instanceof MarketplaceError || error instanceof PaymentError;
    return NextResponse.json({ error: known ? error.message : "Sandbox coaching is unavailable. Your saved information has not changed." }, { status: known ? error.status : 503, headers });
  }
}
