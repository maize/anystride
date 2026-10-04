import Link from "next/link";
import { notFound } from "next/navigation";
import { accountActor } from "@/lib/account-data";
import { storefrontId } from "@/lib/storefront-input";
import { storefrontOrders, storefrontPaymentMode } from "@/lib/storefront-payments";
import { AccountHeading, accountPrice } from "@/components/AccountUI";
import { StorefrontActionButton } from "@/components/StorefrontForm";

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  try { storefrontId(orderId); } catch { notFound(); }
  const [order] = await storefrontOrders(await accountActor(),orderId);
  if (!order) notFound();
  const paid = ["paid","partially_refunded"].includes(order.status);
  const status = { pending:"Awaiting payment confirmation", paid:"Payment confirmed", partially_refunded:"Partially refunded", refunded:"Refunded", disputed:"Payment under review", expired:"Checkout expired", failed:"Payment failed" }[order.status];
  return <><Link href="/account/orders" className="action-link mb-4">← All purchases & sales</Link><AccountHeading title={order.snapshot.title}>With {order.snapshot.coachName}</AccountHeading>
    {order.mode === "test" && <p role="status" className="mb-6 rounded-xl bg-muted p-4 font-semibold text-brand">Test order. No real service has been purchased.</p>}
    <section className="rounded-2xl bg-muted p-8"><p className="text-sm font-semibold">{status}</p><p className="mt-3 text-4xl font-semibold tabular-nums">{accountPrice(order.amount,order.currency)}</p>{order.refunded > 0 && <p className="mt-3 text-sm">Refunded: {accountPrice(order.refunded,order.currency)}</p>}{!order.is_buyer && <p className="mt-4 text-sm text-muted-foreground">Platform fee: {accountPrice(order.fee,order.currency)}. This order total is not a bank payout; payment processing, refunds and transfers may affect settlement.</p>}
      {order.status === "pending" && <p className="mt-4 max-w-xl text-sm text-muted-foreground">Returning from checkout doesn’t confirm payment. Check the latest status below. If you left before paying, you can return to the same service to resume checkout.</p>}
      {storefrontPaymentMode() === order.mode && <div className="mt-6 flex flex-wrap gap-4"><StorefrontActionButton action="reconcile" fields={{ orderId }}>Refresh payment status</StorefrontActionButton>{order.is_buyer && order.status === "pending" && <StorefrontActionButton action="cancel" fields={{ orderId }}>Close unpaid checkout</StorefrontActionButton>}</div>}
    </section>
    {paid && <section className="mt-8"><h2 className="text-2xl font-semibold">{order.is_buyer ? "Your next steps" : "Welcome your new client"}</h2><p className="mt-4 whitespace-pre-wrap leading-relaxed">{order.snapshot.nextSteps}</p>{order.is_buyer ? <a href={`mailto:${order.snapshot.contactEmail}`} className="action-link mt-4">Contact {order.snapshot.coachName} ↗</a> : order.snapshot.buyerEmail && <a href={`mailto:${order.snapshot.buyerEmail}`} className="action-link mt-4 break-all">Contact {order.snapshot.buyerEmail} ↗</a>}</section>}
    <section className="mt-8 border-t border-border pt-8"><h2 className="text-2xl font-semibold">Your original offer</h2><p className="mt-4 whitespace-pre-wrap text-muted-foreground">{order.snapshot.description}</p><ul className="mt-4 space-y-2">{order.snapshot.inclusions.map((line) => <li key={line}>↗ {line}</li>)}</ul><p className="mt-6 text-sm text-muted-foreground">{order.snapshot.delivery}</p><h3 className="mt-6 font-semibold">Cancellation & refunds</h3><p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{order.snapshot.cancellation}</p><a href={`/coaching/with/${order.snapshot.slug}`} className="action-link mt-6">View coach profile ↗</a></section>
  </>;
}
