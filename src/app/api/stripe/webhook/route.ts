import { paymentConfig, PaymentError } from "@/lib/payment-config";
import { paymentBody, paymentFailure, paymentReply } from "@/lib/payment-http";
import { processTestEvent } from "@/lib/payment-webhook";
import { testStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const config = paymentConfig();
    const signature = request.headers.get("stripe-signature");
    if (!signature) throw new PaymentError("Missing Stripe signature.", 400);
    const raw = await paymentBody(request, 262144);
    const stripe = testStripe();
    let event;
    try { event = stripe.webhooks.constructEvent(raw, signature, config.webhookSecret); }
    catch { throw new PaymentError("Invalid Stripe signature.", 400); }
    await processTestEvent(stripe, event);
    return paymentReply({ received: true });
  } catch (error) { return paymentFailure(error); }
}
