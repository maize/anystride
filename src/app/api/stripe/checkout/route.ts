import { PaymentError, parseCheckout, requirePaymentOperator } from "@/lib/payment-config";
import { createTestCheckout } from "@/lib/payment-checkout";
import { paymentBody, paymentFailure, paymentReply } from "@/lib/payment-http";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requirePaymentOperator(request);
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new PaymentError("Expected JSON.", 415);
    let body: unknown;
    try { body = JSON.parse(await paymentBody(request, 4096)); } catch (error) {
      if (error instanceof PaymentError) throw error;
      throw new PaymentError("Invalid JSON.", 400);
    }
    return paymentReply(await createTestCheckout(parseCheckout(body)));
  } catch (error) { return paymentFailure(error); }
}
