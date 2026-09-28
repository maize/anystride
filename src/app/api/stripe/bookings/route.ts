import { requirePaymentOperator } from "@/lib/payment-config";
import { paymentFailure, paymentReply } from "@/lib/payment-http";
import { paymentPool } from "@/lib/payment-store";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    requirePaymentOperator(request);
    const { rows } = await paymentPool().query(`SELECT id, offer_id, status, amount, currency, fee,
      checkout_session_id, payment_intent_id, created_at, updated_at
      FROM stripe_test_bookings ORDER BY created_at DESC, id DESC LIMIT 100`);
    return paymentReply({ bookings: rows, testMode: true, limit: 100 });
  } catch (error) { return paymentFailure(error); }
}
