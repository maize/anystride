import "server-only";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import type { MarketplaceActor } from "./marketplace-auth";
import { MarketplaceError, marketplaceOrigin } from "./marketplace-config";
import { marketplaceTransaction } from "./marketplace-store";
import { paymentConfig, testOffer } from "./payment-config";
import { checkoutParameters, createTestCheckout } from "./payment-checkout";
import { paymentTransaction } from "./payment-store";
import type { TestBooking } from "./payment-store";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function sandboxReference(value: unknown): string {
  if (typeof value !== "string" || !uuid.test(value)) throw new MarketplaceError("Invalid sandbox reference.", 400);
  return value.toLowerCase();
}

export function sandboxWorkspaceEnabled() {
  if (process.env.MARKETPLACE_SANDBOX_WORKSPACES !== "on") return false;
  // Production must never expose this experiment, even if a switch is set by mistake.
  if (process.env.VERCEL_ENV === "production") return false;
  try { return paymentConfig().origin === marketplaceOrigin(); } catch { return false; }
}
function requireSandbox() {
  if (!sandboxWorkspaceEnabled()) throw new MarketplaceError("Sandbox coaching is not enabled.", 404);
}

interface Snapshot { title: string; description: string; amount: number; currency: string; durationWeeks: number; coachName: string; serviceVersion: number }
interface RequestRecord { id: string; runner_id: string; coach_id: string; service_id: string; status: string; service_snapshot: Snapshot; service_status: string; coach_status: string }

export interface AccountPurchase {
  request_id: string; service_snapshot: Snapshot; status: TestBooking["status"];
  amount: number; currency: string; created_at: Date;
}

/** History survives withdrawal and suspension. Only the paying athlete can see it;
 * workspace access is still checked separately against the current request. */
export async function sandboxPurchaseHistory(actor: MarketplaceActor): Promise<AccountPurchase[]> {
  if (!sandboxWorkspaceEnabled()) return [];
  return paymentTransaction(async (client) => {
    const { rows } = await client.query<AccountPurchase>(`SELECT w.request_id,w.service_snapshot,b.status,b.amount,b.currency,b.created_at
      FROM stripe_test_workspaces w JOIN stripe_test_bookings b ON b.id=w.request_id AND b.request_hash=w.payment_hash
      WHERE w.runner_id=$1 ORDER BY b.created_at DESC LIMIT 100`, [actor.id]);
    return rows;
  });
}

async function ownedRequest(actor: MarketplaceActor, requestId: string) {
  requireSandbox();
  const id = sandboxReference(requestId);
  return marketplaceTransaction(async (client) => {
    const { rows: [request] } = await client.query<RequestRecord>(`SELECT r.id,r.runner_id,r.coach_id,r.service_id,r.status,r.service_snapshot,
      s.status AS service_status,c.status AS coach_status FROM marketplace_requests r
      JOIN marketplace_services s ON s.id=r.service_id JOIN marketplace_coaches c ON c.user_id=r.coach_id
      WHERE r.id=$1 AND (r.runner_id=$2 OR r.coach_id=$2)`, [id, actor.id]);
    // Administrator status does not grant access to private conversations.
    if (!request) throw new MarketplaceError("Coaching request not found.", 404);
    if (request.status !== "accepted" || request.service_status !== "approved" || request.coach_status !== "approved") {
      throw new MarketplaceError("This coaching request is not active.", 409);
    }
    return request;
  });
}

function mappedOffer(request: RequestRecord) {
  let bindings: unknown;
  try { bindings = JSON.parse(process.env.STRIPE_TEST_SERVICE_BINDINGS ?? "[]"); }
  catch { throw new MarketplaceError("Sandbox service setup is incomplete."); }
  if (!Array.isArray(bindings) || bindings.length > 20) throw new MarketplaceError("Sandbox service setup is incomplete.");
  const matches = bindings.filter((b) => b?.serviceId === request.service_id && b?.coachUserId === request.coach_id);
  if (matches.length !== 1 || typeof matches[0].offerId !== "string") throw new MarketplaceError("This service is not connected to sandbox checkout.", 409);
  const offer = testOffer(matches[0].offerId);
  const snapshot = request.service_snapshot;
  if (offer.amount !== snapshot.amount || offer.currency !== snapshot.currency || offer.title !== snapshot.title) {
    throw new MarketplaceError("The sandbox offer does not match the agreed service.", 409);
  }
  return offer;
}

/** Account-based checkout is separate from the operator-only API. No client price,
 * destination, fee, email, participant ID or replacement booking ID is accepted. */
export async function startSandboxCheckout(actor: MarketplaceActor, requestId: string) {
  const request = await ownedRequest(actor, requestId);
  if (request.runner_id !== actor.id) throw new MarketplaceError("Only the requesting runner can open checkout.", 403);
  const config = paymentConfig();
  const offer = mappedOffer(request);
  const params = checkoutParameters(request.id, actor.email, offer, config.origin);
  const hash = createHash("sha256").update(JSON.stringify({ platform: config.platform, params })).digest("hex");
  await paymentTransaction(async (client) => {
    await client.query(`INSERT INTO stripe_test_workspaces (request_id,runner_id,coach_id,payment_hash,service_snapshot)
      VALUES ($1,$2,$3,$4,$5) ON CONFLICT (request_id) DO NOTHING`, [request.id, request.runner_id, request.coach_id, hash, JSON.stringify(request.service_snapshot)]);
    const { rows: [binding] } = await client.query("SELECT * FROM stripe_test_workspaces WHERE request_id=$1 FOR UPDATE", [request.id]);
    if (!binding || binding.runner_id !== actor.id || binding.coach_id !== request.coach_id || binding.payment_hash !== hash) {
      throw new MarketplaceError("This payment attempt changed. Ask the operator to reconcile it.", 409);
    }
  });
  // Existing checkout code supplies Stripe idempotency and refuses old/closed attempts.
  return createTestCheckout({ bookingId: request.id, offerId: offer.id, email: actor.email });
}

async function paidWorkspace(client: PoolClient, actor: MarketplaceActor, request: RequestRecord) {
  const { rows: [workspace] } = await client.query(`SELECT w.request_id,w.runner_id,w.coach_id,w.service_snapshot,b.status
    FROM stripe_test_workspaces w JOIN stripe_test_bookings b ON b.id=w.request_id AND b.request_hash=w.payment_hash
    WHERE w.request_id=$1 AND w.runner_id=$2 AND w.coach_id=$3 AND (w.runner_id=$4 OR w.coach_id=$4)
    FOR UPDATE OF b`, [request.id, request.runner_id, request.coach_id, actor.id]);
  // Webhooks lock the same booking row. A refund/dispute and a message cannot
  // race through contradictory payment states in the payment database.
  if (!workspace || workspace.status !== "paid") throw new MarketplaceError("The workspace is locked until a verified sandbox payment is recorded. Refunds and disputes also lock access.", 409);
  return workspace;
}

export async function readSandboxWorkspace(actor: MarketplaceActor, requestId: string) {
  const request = await ownedRequest(actor, requestId);
  return paymentTransaction(async (client) => {
    const workspace = await paidWorkspace(client, actor, request);
    const { rows } = await client.query(`SELECT id,body,created_at,sender_id=$2 AS mine,
      CASE WHEN sender_id=$3 THEN 'coach' ELSE 'runner' END AS sender_role
      FROM stripe_test_workspace_messages WHERE request_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100`, [request.id, actor.id, request.coach_id]);
    return { title: workspace.service_snapshot.title as string, messages: rows.reverse(), testMode: true };
  });
}

export async function writeSandboxMessage(actor: MarketplaceActor, requestId: string, messageId: string, body: string) {
  const id = sandboxReference(messageId);
  if (typeof body !== "string" || !body.trim() || body.trim().length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(body)) throw new MarketplaceError("Write a message of 1–2,000 characters.", 400);
  const text = body.trim();
  const request = await ownedRequest(actor, requestId);
  return paymentTransaction(async (client) => {
    await paidWorkspace(client, actor, request);
    const { rows: [existing] } = await client.query("SELECT request_id,sender_id,body FROM stripe_test_workspace_messages WHERE id=$1", [id]);
    if (existing) {
      if (existing.request_id !== request.id || existing.sender_id !== actor.id || existing.body !== text) throw new MarketplaceError("Message reference already used.", 409);
      return { saved: true };
    }
    const { rows: [count] } = await client.query("SELECT count(*)::int AS n FROM stripe_test_workspace_messages WHERE request_id=$1 AND sender_id=$2 AND created_at > now() - interval '1 day'", [request.id, actor.id]);
    if (count.n >= 100) throw new MarketplaceError("The sandbox allows 100 messages per person per conversation each day.", 429);
    await client.query("INSERT INTO stripe_test_workspace_messages (id,request_id,sender_id,body) VALUES ($1,$2,$3,$4)", [id, request.id, actor.id, text]);
    return { saved: true };
  });
}
