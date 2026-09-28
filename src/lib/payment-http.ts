import { NextResponse } from "next/server";
import { PaymentError } from "./payment-config";

export function paymentReply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" } });
}

export function paymentFailure(error: unknown) {
  return paymentReply({ error: error instanceof PaymentError ? error.message : "Payment service unavailable. Retry the same booking ID; do not create another booking." }, error instanceof PaymentError ? error.status : 503);
}

export async function paymentBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new PaymentError("Missing request body.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new PaymentError("Request body too large.", 413); }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
