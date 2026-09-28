import { PaymentError } from "@/lib/payment-config";
import { paymentBody, paymentReply } from "@/lib/payment-http";
import { liveInboxConfig, receiveLiveStripeEvent } from "@/lib/stripe-event-inbox";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    liveInboxConfig();
    const signature = request.headers.get("stripe-signature");
    if (!signature) throw new PaymentError("Missing Stripe signature.", 400);
    const raw = await paymentBody(request, 262144);
    return paymentReply(await receiveLiveStripeEvent(raw, signature));
  } catch (error) {
    if (!(error instanceof PaymentError)) {
      const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
      const safeCodes = new Set(["SELF_SIGNED_CERT_IN_CHAIN", "DEPTH_ZERO_SELF_SIGNED_CERT",
        "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "CERT_HAS_EXPIRED", "ERR_TLS_CERT_ALTNAME_INVALID",
        "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "28P01", "42501", "42P01", "42703", "53300", "57P01"]);
      // Never log driver messages, connection strings, payloads or secrets.
      console.error("Stripe event persistence failed", typeof code === "string" && safeCodes.has(code) ? code : "UNKNOWN");
    }
    return paymentReply({ error: error instanceof PaymentError ? error.message : "Event storage unavailable. Retry delivery." },
      error instanceof PaymentError ? error.status : 503);
  }
}
