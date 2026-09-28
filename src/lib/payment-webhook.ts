import type Stripe from "stripe";
import { PaymentError } from "./payment-config";
import { paymentTransaction, type TestBooking } from "./payment-store";

const checkoutEvents = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired"]);
const chargeEvents = new Set(["charge.refunded", "charge.dispute.created", "charge.dispute.updated", "charge.dispute.closed"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Only canonical Stripe state can mark a booking paid. Any refund or dispute
 * blocks future access pending reconciliation; stale events cannot restore it. */
export function verifiedPaymentState(booking: TestBooking, session: Stripe.Checkout.Session): TestBooking["status"] {
  if (session.livemode || session.mode !== "payment" || session.client_reference_id !== booking.id ||
      session.metadata?.app !== "anystride" || session.metadata?.booking_id !== booking.id ||
      session.amount_total !== booking.amount || session.currency !== booking.currency ||
      (booking.checkout_session_id && booking.checkout_session_id !== session.id)) throw new PaymentError("Payment does not match its booking.");
  const intent = typeof session.payment_intent === "object" ? session.payment_intent : null;
  if (intent) {
    const destination = intent.transfer_data?.destination;
    if (intent.livemode || intent.amount !== booking.amount || intent.currency !== booking.currency ||
        intent.application_fee_amount !== booking.fee || (typeof destination === "string" ? destination : destination?.id) !== booking.coach_account ||
        intent.metadata?.booking_id !== booking.id || intent.metadata?.app !== "anystride" ||
        (booking.payment_intent_id && intent.id !== booking.payment_intent_id)) throw new PaymentError("Payment destination or amount does not match.");
    const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
    if (session.payment_status === "paid" && !charge) throw new PaymentError("Payment charge details are not available yet.");
    if (charge?.refunded) return "refunded";
    if (charge?.disputed || (charge?.amount_refunded ?? 0) > 0) return "review";
    if (booking.status === "refunded" || booking.status === "review") return booking.status;
    if (session.payment_status === "paid" && session.status === "complete" && intent.status === "succeeded" && intent.amount_received === booking.amount && charge?.paid) return "paid";
  }
  if (session.payment_status === "paid" && !intent) throw new PaymentError("Payment details are not available yet.");
  if (["paid", "review", "refunded"].includes(booking.status)) return booking.status;
  return session.status === "expired" ? "expired" : "pending";
}

export async function processTestEvent(stripe: Stripe, event: Stripe.Event) {
  if (event.livemode || event.account) throw new PaymentError("Only test events from the platform account are accepted.", 400);
  let bookingId: string | undefined;
  let sessionId: string | undefined;
  if (checkoutEvents.has(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.app !== "anystride") return;
    bookingId = session.metadata.booking_id;
    sessionId = session.id;
  } else if (chargeEvents.has(event.type)) {
    const object = event.data.object as Stripe.Charge | Stripe.Dispute;
    const intentId = typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id;
    if (!intentId) return;
    const intent = await stripe.paymentIntents.retrieve(intentId);
    if (intent.metadata?.app !== "anystride") return;
    bookingId = intent.metadata.booking_id;
  } else return;
  if (!bookingId || !uuid.test(bookingId)) throw new PaymentError("Invalid Anystride payment reference.", 400);

  await paymentTransaction(async (client) => {
    const { rows: [booking] } = await client.query<TestBooking>("SELECT * FROM stripe_test_bookings WHERE id = $1 FOR UPDATE", [bookingId]);
    if (!booking) throw new PaymentError("Payment booking not found; retry after reconciliation.");
    const existing = await client.query("SELECT id FROM stripe_test_events WHERE id = $1", [event.id]);
    if (existing.rows.length) return;
    const canonicalId = sessionId ?? booking.checkout_session_id;
    if (!canonicalId) throw new PaymentError("Checkout association is pending; retry the event.");
    // Retrieve AFTER acquiring the booking lock. Concurrent and out-of-order
    // deliveries cannot overwrite a newer status with an older event snapshot.
    const session = await stripe.checkout.sessions.retrieve(canonicalId, { expand: ["payment_intent.latest_charge"] });
    let status = verifiedPaymentState(booking, session);
    if (event.type === "checkout.session.async_payment_failed" && status === "pending") status = "failed";
    if (chargeEvents.has(event.type) && status !== "refunded") status = "review";
    const intentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
    await client.query(`UPDATE stripe_test_bookings SET status = $2, checkout_session_id = $3,
      payment_intent_id = $4, updated_at = now() WHERE id = $1`, [booking.id, status, session.id, intentId]);
    await client.query("INSERT INTO stripe_test_events (id, booking_id, type) VALUES ($1,$2,$3)", [event.id, booking.id, event.type]);
  });
}
