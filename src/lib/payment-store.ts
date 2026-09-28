import { Pool, type PoolClient } from "pg";
import type Stripe from "stripe";
import { paymentConfig } from "./payment-config";

let pool: Pool | undefined;
export function paymentPool() {
  paymentConfig();
  // Explicit, isolated database. No fallback to the lead database, automatic DDL,
  // or certificate-verification bypass. TLS settings belong in the connection URL.
  return pool ??= new Pool({ connectionString: process.env.PAYMENTS_DATABASE_URL, max: 3, connectionTimeoutMillis: 5000 });
}

export interface TestBooking {
  id: string;
  request_hash: string;
  offer_id: string;
  coach_account: string;
  amount: number;
  currency: string;
  fee: number;
  test_email: string;
  checkout_params: Stripe.Checkout.SessionCreateParams;
  checkout_session_id: string | null;
  payment_intent_id: string | null;
  status: "pending" | "paid" | "expired" | "failed" | "review" | "refunded";
  created_at: Date;
}

export async function paymentTransaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await paymentPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '5s'");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
