import "server-only";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { MarketplaceError, marketplaceOrigin } from "./marketplace-config";
import { marketplaceTransaction } from "./marketplace-store";
import { checkoutOffer } from "./storefront-store";
import type { MarketplaceActor } from "./marketplace-auth";

export function storefrontPaymentConfig() {
  const env = process.env;
  const mode = env.STOREFRONT_PAYMENTS_MODE;
  if (mode !== "test" && mode !== "live") throw new MarketplaceError("Online purchases are not available yet.");
  const key = env.STOREFRONT_STRIPE_SECRET_KEY ?? "";
  const platform = env.STOREFRONT_STRIPE_PLATFORM_ACCOUNT_ID ?? "";
  const webhook = env.STOREFRONT_STRIPE_WEBHOOK_SECRET ?? "";
  const feeBps = Number(env.STOREFRONT_PLATFORM_FEE_BPS ?? "0");
  const origin = marketplaceOrigin();
  if (!new RegExp(`^sk_${mode}_[A-Za-z0-9]+$`).test(key) || !/^acct_[A-Za-z0-9]+$/.test(platform) || !/^whsec_[A-Za-z0-9]+$/.test(webhook) || !Number.isInteger(feeBps) || feeBps < 0 || feeBps > 5000 || (mode === "live" && !origin.startsWith("https:"))) throw new MarketplaceError("Online purchases are temporarily unavailable.");
  return { mode: mode as "test" | "live", key, platform, webhook, feeBps, origin };
}
export function storefrontPaymentMode(): "test" | "live" | "off" {
  try { return storefrontPaymentConfig().mode; } catch { return "off"; }
}
function provider() { return new Stripe(storefrontPaymentConfig().key, { maxNetworkRetries: 1, timeout: 10000 }); }
async function platformAccount(stripe: Stripe) {
  const account = await stripe.accounts.retrieve(null);
  if (account.id !== storefrontPaymentConfig().platform || !account.country) throw new MarketplaceError("Payment account setup is incomplete.");
  return account;
}
async function sellerRecord(coachId: string) {
  const config = storefrontPaymentConfig();
  return marketplaceTransaction(async (db) => (await db.query<{ stripe_account: string | null; onboarding_id: string; created_at: Date }>("SELECT stripe_account,onboarding_id,created_at FROM marketplace_storefront_sellers WHERE coach_id=$1 AND platform=$2 AND mode=$3", [coachId,config.platform,config.mode])).rows[0]);
}
function accountReady(account: Stripe.Account, platform: Stripe.Account) {
  return account.id !== platform.id && account.country === platform.country && account.details_submitted && account.charges_enabled && account.payouts_enabled && account.capabilities?.transfers === "active";
}
export async function storefrontSellerStatus(actor: MarketplaceActor) {
  const mode = storefrontPaymentMode();
  if (mode === "off") return { mode, ready: false, connected: false };
  const seller = await sellerRecord(actor.id);
  if (!seller?.stripe_account) return { mode, ready: false, connected: false };
  const stripe = provider();
  const [platform, account] = await Promise.all([platformAccount(stripe), stripe.accounts.retrieve(seller.stripe_account)]);
  return { mode, ready: accountReady(account, platform), connected: true };
}

export async function startSellerOnboarding(actor: MarketplaceActor) {
  const config = storefrontPaymentConfig();
  const stripe = provider();
  const platform = await platformAccount(stripe);
  // A durable reference keeps account creation idempotent across retries.
  await marketplaceTransaction(async (db) => {
    const { rows: [coach] } = await db.query("SELECT status FROM marketplace_coaches WHERE user_id=$1", [actor.id]);
    if (coach?.status !== "approved") throw new MarketplaceError("Your coach application must be approved first.", 403);
    await db.query("INSERT INTO marketplace_storefront_sellers(coach_id,platform,mode,onboarding_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING", [actor.id,config.platform,config.mode,randomUUID()]);
  });
  let seller = await sellerRecord(actor.id);
  if (!seller?.stripe_account) {
    if (!seller || Date.now() - new Date(seller.created_at).getTime() > 23 * 60 * 60 * 1000) throw new MarketplaceError("Your payout setup needs a status check. Please contact Anystride before starting again.", 409);
    const account = await stripe.accounts.create({ type: "express", country: platform.country, email: actor.email, capabilities: { card_payments: { requested: true }, transfers: { requested: true } }, metadata: { anystride_coach: actor.id } }, { idempotencyKey: `storefront-seller-${seller!.onboarding_id}` });
    await marketplaceTransaction(async (db) => { await db.query("UPDATE marketplace_storefront_sellers SET stripe_account=$4 WHERE coach_id=$1 AND platform=$2 AND mode=$3 AND stripe_account IS NULL", [actor.id,config.platform,config.mode,account.id]); });
    seller = await sellerRecord(actor.id);
  }
  const link = await stripe.accountLinks.create({ account: seller!.stripe_account!, type: "account_onboarding", return_url: `${config.origin}/account/storefront`, refresh_url: `${config.origin}/account/storefront?setup=retry` });
  if (new URL(link.url).origin !== "https://connect.stripe.com") throw new MarketplaceError("Could not open payout setup.");
  return { url: link.url };
}

export interface OrderSnapshot {
  coachName: string; slug: string; title: string; description: string; inclusions: string[];
  delivery: string; durationWeeks: number; kind: string; cancellation: string; nextSteps: string; contactEmail: string; buyerEmail: string;
}
export interface StorefrontOrder {
  id: string; buyer_id: string; coach_id: string; service_id: string; service_version: number; snapshot: OrderSnapshot;
  amount: number; currency: string; fee: number; refunded: number; platform: string; mode: "test" | "live";
  stripe_account: string; stripe_session: string | null; stripe_payment_intent: string | null;
  checkout_params: Stripe.Checkout.SessionCreateParams; status: "pending" | "paid" | "partially_refunded" | "refunded" | "disputed" | "expired" | "failed"; created_at: Date;
}

export async function startStorefrontCheckout(actor: MarketplaceActor, serviceId: string, orderId: string, version: number) {
  const config = storefrontPaymentConfig();
  const stripe = provider();
  const offer = await checkoutOffer(serviceId);
  if (!offer || !offer.available) throw new MarketplaceError("This service is not currently available to buy.", 409);
  if (offer.coach_id === actor.id) throw new MarketplaceError("You cannot buy your own service.", 403);
  if (offer.version !== version) throw new MarketplaceError("This offer changed. Refresh to see the current details before buying.", 409);
  const seller = await sellerRecord(offer.coach_id);
  if (!seller?.stripe_account) throw new MarketplaceError("This coach is still setting up payments. Please try again later.", 409);
  const [platform, account] = await Promise.all([platformAccount(stripe), stripe.accounts.retrieve(seller.stripe_account)]);
  if (!accountReady(account, platform)) throw new MarketplaceError("This coach cannot accept payments yet.", 409);
  const order = await marketplaceTransaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`storefront-buyer:${actor.id}`]);
    const { rows: [existing] } = await db.query<StorefrontOrder>("SELECT * FROM marketplace_storefront_orders WHERE id=$1", [orderId]);
    if (existing) {
      if (existing.buyer_id !== actor.id || existing.service_id !== serviceId || existing.service_version !== version || existing.platform !== config.platform || existing.mode !== config.mode) throw new MarketplaceError("This checkout reference is already in use.", 409);
      return existing;
    }
    const { rows: [pending] } = await db.query<StorefrontOrder>("SELECT * FROM marketplace_storefront_orders WHERE buyer_id=$1 AND service_id=$2 AND platform=$3 AND mode=$4 AND status='pending'", [actor.id,serviceId,config.platform,config.mode]);
    if (pending) {
      // A new price must never silently reuse an older offer's checkout.
      if (pending.service_version !== version) throw new MarketplaceError("You have an earlier checkout for this service. Open Purchases & sales to check its status before buying the updated offer.", 409);
      return pending;
    }
    // Recheck eligibility under locks after the provider call, in the same order
    // as service moderation. An offer edit cannot race with this snapshot.
    const { rows: [coach] } = await db.query("SELECT status FROM marketplace_coaches WHERE user_id=$1 FOR SHARE", [offer.coach_id]);
    const { rows: [current] } = await db.query("SELECT s.status,s.version,o.available,p.published FROM marketplace_services s JOIN marketplace_storefront_offers o ON o.service_id=s.id JOIN marketplace_storefronts p ON p.coach_id=s.coach_id WHERE s.id=$1 FOR SHARE OF s,o,p", [serviceId]);
    if (coach?.status !== "approved" || current?.status !== "approved" || current.version !== version || !current.available || !current.published) throw new MarketplaceError("This offer changed. Refresh before buying.", 409);
    const { rows: [count] } = await db.query("SELECT count(*)::int AS n FROM marketplace_storefront_orders WHERE buyer_id=$1 AND created_at > now() - interval '1 day'", [actor.id]);
    if (count.n >= 20) throw new MarketplaceError("You have reached today's checkout limit. Please try again tomorrow.", 429);
    const snapshot: OrderSnapshot = { coachName: offer.coach_name, slug: offer.slug, title: offer.title, description: offer.description, inclusions: offer.inclusions, delivery: offer.delivery, durationWeeks: offer.duration_weeks, kind: offer.kind, cancellation: offer.cancellation, nextSteps: offer.next_steps, contactEmail: offer.contact_email, buyerEmail: actor.email };
    const fee = Math.floor(offer.amount * config.feeBps / 10000);
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "payment", payment_method_types: ["card"], customer_email: actor.email, client_reference_id: orderId,
      metadata: { app: "anystride_storefront", order_id: orderId },
      line_items: [{ quantity: 1, price_data: { currency: offer.currency, unit_amount: offer.amount, product_data: { name: `${config.mode === "test" ? "[TEST] " : ""}${offer.title}` } } }],
      payment_intent_data: { application_fee_amount: fee, transfer_data: { destination: account.id }, metadata: { app: "anystride_storefront", order_id: orderId } },
      success_url: `${config.origin}/account/orders/${orderId}`, cancel_url: `${config.origin}/account/orders/${orderId}`,
      ...(config.mode === "test" ? { custom_text: { submit: { message: "Test checkout only. No real coaching service is purchased." } } } : {}),
    };
    const { rows: [saved] } = await db.query<StorefrontOrder>(`INSERT INTO marketplace_storefront_orders(id,buyer_id,coach_id,service_id,service_version,snapshot,amount,currency,fee,platform,mode,stripe_account,checkout_params)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`, [orderId,actor.id,offer.coach_id,serviceId,version,JSON.stringify(snapshot),offer.amount,offer.currency,fee,config.platform,config.mode,account.id,JSON.stringify(params)]);
    return saved;
  });
  if (order.status !== "pending") return { url: `${config.origin}/account/orders/${order.id}`, resetAttempt: true };
  if (!order.stripe_session && Date.now() - new Date(order.created_at).getTime() > 23 * 60 * 60 * 1000) throw new MarketplaceError("This checkout needs a payment status check. Open your purchases before trying again.", 409);
  const session = order.stripe_session ? await stripe.checkout.sessions.retrieve(order.stripe_session) : await stripe.checkout.sessions.create(order.checkout_params, { idempotencyKey: `storefront-order-${order.id}` });
  if (session.livemode !== (order.mode === "live") || session.client_reference_id !== order.id || session.amount_total !== order.amount || session.currency !== order.currency || session.metadata?.order_id !== order.id) throw new MarketplaceError("The payment details could not be verified.");
  await marketplaceTransaction(async (db) => { await db.query("UPDATE marketplace_storefront_orders SET stripe_session=$2,updated_at=now() WHERE id=$1 AND (stripe_session IS NULL OR stripe_session=$2)", [order.id,session.id]); });
  if (session.status !== "open") {
    await reconcileStorefrontOrder(order.id, actor);
    return { url: `${config.origin}/account/orders/${order.id}`, resetAttempt: true };
  }
  if (!session.url || new URL(session.url).origin !== "https://checkout.stripe.com") throw new MarketplaceError("Could not open secure checkout.");
  return { url: session.url };
}

export async function cancelStorefrontCheckout(orderId: string, actor: MarketplaceActor) {
  const config = storefrontPaymentConfig();
  const order = await marketplaceTransaction(async (db) => (await db.query<StorefrontOrder>("SELECT * FROM marketplace_storefront_orders WHERE id=$1 AND buyer_id=$2", [orderId,actor.id])).rows[0]);
  if (!order) throw new MarketplaceError("Purchase not found.", 404);
  if (order.platform !== config.platform || order.mode !== config.mode) throw new MarketplaceError("This purchase belongs to another payment environment.", 409);
  if (order.status !== "pending") throw new MarketplaceError("This checkout is already closed. Refresh its payment status.", 409);
  if (!order.stripe_session) throw new MarketplaceError("Checkout is still being prepared. Try again shortly.", 409);
  const stripe = provider();
  const session = await stripe.checkout.sessions.retrieve(order.stripe_session);
  if (session.client_reference_id !== order.id || session.metadata?.order_id !== order.id || session.livemode !== (order.mode === "live")) throw new MarketplaceError("Payment verification failed.");
  // Expiring an unpaid provider session closes the actual payment link. A local
  // status change alone could leave two checkouts payable for one service.
  if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
  return reconcileStorefrontOrder(orderId, actor);
}

/** Re-read the provider under a per-order lock. Old or reordered events cannot
 * regress a refund/dispute to a paid state using a stale event payload. */
export async function reconcileStorefrontOrder(orderId: string, actor?: MarketplaceActor, sessionHint?: string, eventId?: string) {
  const config = storefrontPaymentConfig();
  const stripe = provider();
  return marketplaceTransaction(async (db) => {
    const { rows: [order] } = await db.query<StorefrontOrder>("SELECT * FROM marketplace_storefront_orders WHERE id=$1 FOR UPDATE", [orderId]);
    if (!order || (actor && actor.id !== order.buyer_id && actor.id !== order.coach_id)) throw new MarketplaceError("Purchase not found.", 404);
    if (order.platform !== config.platform || order.mode !== config.mode) throw new MarketplaceError("This purchase belongs to another payment environment.", 409);
    if (eventId && (await db.query("SELECT 1 FROM marketplace_storefront_events WHERE platform=$1 AND event_id=$2", [config.platform,eventId])).rows.length) return { saved: true };
    const sessionId = order.stripe_session ?? sessionHint;
    if (!sessionId) throw new MarketplaceError("Checkout is still being prepared. Try again shortly.", 409);
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent.latest_charge"] });
    if (session.livemode !== (order.mode === "live") || session.client_reference_id !== order.id || session.amount_total !== order.amount || session.currency !== order.currency || session.metadata?.app !== "anystride_storefront" || session.metadata?.order_id !== order.id) throw new MarketplaceError("Payment verification failed.");
    const intent = typeof session.payment_intent === "object" ? session.payment_intent : null;
    const charge = intent && typeof intent.latest_charge === "object" ? intent.latest_charge : null;
    if (intent && (intent.application_fee_amount !== order.fee || (typeof intent.transfer_data?.destination === "string" ? intent.transfer_data.destination : intent.transfer_data?.destination?.id) !== order.stripe_account)) throw new MarketplaceError("Payment recipient verification failed.");
    const refunded = charge?.amount_refunded ?? 0;
    if (refunded < 0 || refunded > order.amount) throw new MarketplaceError("Refund verification failed.");
    let status: StorefrontOrder["status"] = "pending";
    if (charge?.disputed) status = "disputed";
    else if (refunded === order.amount) status = "refunded";
    else if (refunded > 0) status = "partially_refunded";
    else if (session.payment_status === "paid" && intent?.status === "succeeded" && charge?.paid) status = "paid";
    else if (session.status === "expired") status = "expired";
    // Terminal financial states must not be erased by a temporarily incomplete
    // provider expansion. Reconciliation may still upgrade expired to paid.
    if (["paid","partially_refunded","refunded","disputed"].includes(order.status) && status === "pending") throw new MarketplaceError("The payment status is still being confirmed.");
    await db.query("UPDATE marketplace_storefront_orders SET status=$2,refunded=$3,stripe_session=$4,stripe_payment_intent=$5,updated_at=now() WHERE id=$1", [order.id,status,refunded,session.id,intent?.id ?? null]);
    if (eventId) await db.query("INSERT INTO marketplace_storefront_events(platform,event_id,order_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING", [config.platform,eventId,order.id]);
    return { saved: true };
  });
}

export async function handleStorefrontWebhook(raw: string, signature: string) {
  const config = storefrontPaymentConfig();
  const stripe = provider();
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(raw, signature, config.webhook); } catch { throw new MarketplaceError("Invalid payment signature.", 400); }
  if (event.livemode !== (config.mode === "live") || event.account || event.context) throw new MarketplaceError("Unexpected payment environment.", 400);
  let orderId: string | undefined;
  let sessionId: string | undefined;
  if (["checkout.session.completed","checkout.session.async_payment_succeeded","checkout.session.async_payment_failed","checkout.session.expired"].includes(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.app !== "anystride_storefront") return { received: true };
    orderId = session.metadata.order_id; sessionId = session.id;
  } else if (["charge.refunded","charge.dispute.created","charge.dispute.updated","charge.dispute.closed"].includes(event.type)) {
    const object = event.data.object as Stripe.Charge | Stripe.Dispute;
    const intentId = typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id;
    if (!intentId) return { received: true };
    const intent = await stripe.paymentIntents.retrieve(intentId);
    if (intent.metadata.app !== "anystride_storefront") return { received: true };
    orderId = intent.metadata.order_id;
  } else return { received: true };
  if (!orderId || !/^[0-9a-f-]{36}$/.test(orderId)) throw new MarketplaceError("Invalid order reference.", 400);
  await reconcileStorefrontOrder(orderId, undefined, sessionId, event.id);
  return { received: true };
}

export async function storefrontOrders(actor: MarketplaceActor, orderId?: string) {
  return marketplaceTransaction(async (db) => {
    const { rows } = await db.query<Pick<StorefrontOrder,"id"|"status"|"amount"|"currency"|"refunded"|"fee"|"mode"|"snapshot"|"created_at"> & { is_buyer: boolean }>(`SELECT id,status,amount,currency,refunded,fee,mode,snapshot,created_at,buyer_id=$1 AS is_buyer FROM marketplace_storefront_orders
      WHERE (buyer_id=$1 OR coach_id=$1) ${orderId ? "AND id=$2" : ""} ORDER BY created_at DESC LIMIT 100`, orderId ? [actor.id,orderId] : [actor.id]);
    return rows.map((order) => ({ ...order, snapshot: { ...order.snapshot, ...(["paid","partially_refunded"].includes(order.status) ? {} : { nextSteps: "", contactEmail: "", buyerEmail: "" }) } }));
  });
}
