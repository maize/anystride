import Stripe from "stripe";
import { paymentConfig } from "./payment-config";

/** Server-only SDK; never expose the key or forward Stripe exceptions to clients. */
export function testStripe() {
  return new Stripe(paymentConfig().key, { timeout: 10_000, maxNetworkRetries: 1 });
}
