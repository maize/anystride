import { requirePaymentOperator, testOffer } from "@/lib/payment-config";
import { checkTestCoach } from "@/lib/payment-checkout";
import { paymentFailure, paymentReply } from "@/lib/payment-http";
import { testStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    requirePaymentOperator(request);
    const offer = testOffer(new URL(request.url).searchParams.get("offerId") ?? "");
    return paymentReply(await checkTestCoach(testStripe(), offer));
  } catch (error) { return paymentFailure(error); }
}
