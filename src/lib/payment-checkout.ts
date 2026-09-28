import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { PaymentError, paymentConfig, testOffer, type TestOffer } from "./payment-config";
import { paymentPool, paymentTransaction, type TestBooking } from "./payment-store";
import { testStripe } from "./stripe";

export function checkoutParameters(bookingId: string, email: string, offer: TestOffer, origin: string): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "payment",
    payment_method_types: ["card"],
    client_reference_id: bookingId,
    customer_email: email,
    metadata: { app: "anystride", booking_id: bookingId },
    line_items: [{ quantity: 1, price_data: { currency: offer.currency, unit_amount: offer.amount, product_data: { name: `[TEST] ${offer.title}` } } }],
    payment_intent_data: { application_fee_amount: offer.fee, transfer_data: { destination: offer.coachAccount }, metadata: { app: "anystride", booking_id: bookingId } },
    // No session ID, email or private token in an analytics-visible return URL.
    success_url: `${origin}/coaching/payment-return`,
    cancel_url: `${origin}/coaching/payment-return`,
    custom_text: { submit: { message: "Anystride test booking. No real coaching service or coach access is purchased." } },
  };
}

export async function checkTestCoach(stripe: Stripe, offer: TestOffer) {
  const config = paymentConfig();
  const [platform, coach] = await Promise.all([stripe.accounts.retrieve(null), stripe.accounts.retrieve(offer.coachAccount)]);
  if (platform.id !== config.platform || coach.id === platform.id) throw new PaymentError("Stripe account does not match the configured test platform.");
  // Cross-border settlement and live liability choices are intentionally out of scope.
  if (!platform.country || coach.country !== platform.country || !coach.details_submitted || !coach.charges_enabled || !coach.payouts_enabled || coach.capabilities?.transfers !== "active") {
    throw new PaymentError("The test coach account is not ready for this payment.", 409);
  }
  return { ready: true, testMode: true, coachAccount: coach.id };
}

export async function createTestCheckout(input: { bookingId: string; offerId: string; email: string }) {
  const config = paymentConfig();
  const offer = testOffer(input.offerId);
  const stripe = testStripe();
  await checkTestCoach(stripe, offer);
  const params = checkoutParameters(input.bookingId, input.email, offer, config.origin);
  const fingerprint = createHash("sha256").update(JSON.stringify({ platform: config.platform, params })).digest("hex");
  // Commit the attempt BEFORE calling Stripe, including if the later network call
  // times out. Its age prevents replay after Stripe's idempotency retention window.
  await paymentPool().query(`INSERT INTO stripe_test_bookings
    (id, request_hash, offer_id, coach_account, amount, currency, fee, test_email, checkout_params)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
  [input.bookingId, fingerprint, offer.id, offer.coachAccount, offer.amount, offer.currency, offer.fee, input.email, JSON.stringify(params)]);

  return paymentTransaction(async (client) => {
    const { rows: [booking] } = await client.query<TestBooking>("SELECT * FROM stripe_test_bookings WHERE id = $1 FOR UPDATE", [input.bookingId]);
    if (!booking || booking.request_hash !== fingerprint) throw new PaymentError("Booking ID already used with different details.", 409);
    if (booking.status !== "pending") throw new PaymentError("This booking is no longer payable.", 409);
    if (!booking.checkout_session_id && Date.now() - new Date(booking.created_at).getTime() > 23 * 60 * 60 * 1000) {
      throw new PaymentError("Old payment attempt needs operator reconciliation. Do not issue a replacement automatically.", 409);
    }
    const session = booking.checkout_session_id
      ? await stripe.checkout.sessions.retrieve(booking.checkout_session_id)
      : await stripe.checkout.sessions.create(booking.checkout_params, { idempotencyKey: `anystride-test-${booking.id}` });
    if (session.livemode || session.client_reference_id !== booking.id || session.amount_total !== booking.amount || session.currency !== booking.currency) throw new PaymentError("Stripe checkout did not match the booking.");
    if (session.status !== "open" || !session.url || new URL(session.url).origin !== "https://checkout.stripe.com") throw new PaymentError("Checkout is closed. Check the webhook payment record before trying again.", 409);
    await client.query("UPDATE stripe_test_bookings SET checkout_session_id = $2, updated_at = now() WHERE id = $1", [booking.id, session.id]);
    return { bookingId: booking.id, url: session.url, testMode: true };
  });
}
