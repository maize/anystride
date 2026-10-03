import Link from "next/link";
import { accountActor, accountData } from "@/lib/account-data";
import { sandboxPurchaseHistory, sandboxWorkspaceEnabled, type AccountPurchase } from "@/lib/sandbox-workspace";
import { AccountEmpty, AccountHeading, AccountStatus, accountDate, accountPrice } from "@/components/AccountUI";
import { MarketplaceForm } from "@/components/MarketplaceForm";
import { SandboxCoachingForm } from "@/components/SandboxCoachingForm";

const paymentLabels = { pending: "Payment pending", paid: "Payment confirmed", refunded: "Refunded", review: "Payment under review", failed: "Payment failed", expired: "Checkout expired" };

export default async function MyCoachingPage() {
  const actor = await accountActor();
  const data = await accountData();
  const requests = data.requests.filter((request) => request.is_runner);
  const sandbox = sandboxWorkspaceEnabled();
  let purchases: AccountPurchase[] = [];
  let purchaseError = false;
  try { purchases = await sandboxPurchaseHistory(actor); } catch { purchaseError = true; }
  return <>
    <AccountHeading title="My coaching">Your requests, coach replies, and purchases. Coaching you offer to others is in your Coach workspace.</AccountHeading>
    <nav aria-label="My coaching sections" className="mb-8 flex gap-6 text-sm font-semibold"><a href="#requests" className="hover:text-brand">My requests ({requests.length})</a><a href="#purchases" className="hover:text-brand">Purchases</a></nav>
    <section id="requests" aria-labelledby="requests-heading" className="scroll-mt-8">
      <h2 id="requests-heading" className="mb-6 text-2xl font-semibold">My requests</h2>
      {!requests.length && <AccountEmpty title="Find support for your next goal" href="/account/explore" action="Explore coaching services">Send a coach a request and follow their response here. There is no charge to enquire.</AccountEmpty>}
      <div className="divide-y divide-border">{requests.map((request) => {
        const payment = purchases.find((purchase) => purchase.request_id === request.id);
        return <article key={request.id} className="py-8 first:pt-0">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">With {request.service_snapshot.coachName} · {accountDate(request.created_at)}</p><h3 className="mt-2 text-xl font-semibold">{request.service_snapshot.title}</h3></div><AccountStatus status={request.status} /></div>
          <p className="mt-2 text-sm text-muted-foreground">Proposed {accountPrice(request.service_snapshot.amount, request.service_snapshot.currency)} · {request.service_snapshot.durationWeeks} {request.service_snapshot.durationWeeks === 1 ? "week" : "weeks"}</p>
          <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold hover:text-brand">Your request and original offer</summary><p className="mt-4 whitespace-pre-wrap break-words">{request.message}</p><p className="mt-4 whitespace-pre-wrap break-words text-sm text-muted-foreground">{request.service_snapshot.description}</p></details>
          <p className="mt-4 text-sm text-muted-foreground">{request.status === "requested" ? "Waiting for the coach to reply. You can check back here for their response." : request.status === "accepted" ? "The coach accepted your enquiry. This is not a purchase or a confirmed coaching engagement." : request.status === "declined" ? "The coach declined this enquiry. You can explore other services." : "You withdrew this request."}</p>
          {request.status === "accepted" && sandbox && !purchaseError && !payment && <div className="mt-4"><p className="mb-4 text-sm text-muted-foreground">Test checkout is available here. No real money is charged.</p><SandboxCoachingForm requestId={request.id} action="checkout" /></div>}
          {payment && <a href="#purchases" className="action-link mt-2">View test payment status <span aria-hidden="true">↓</span></a>}
          {["requested", "accepted"].includes(request.status) && !payment && !purchaseError && <div className="mt-4"><MarketplaceForm action="respond" fields={{ id: request.id, status: "cancelled" }} button="Withdraw request" success="Your request has been withdrawn." /></div>}
        </article>;
      })}</div>
    </section>
    <section id="purchases" aria-labelledby="purchases-heading" className="mt-8 scroll-mt-8 border-t border-border pt-8">
      <h2 id="purchases-heading" className="mb-6 text-2xl font-semibold">{sandbox ? "Test purchases & payments" : "Purchases"}</h2>
      {purchaseError ? <p role="alert" className="text-muted-foreground">We could not load your payment history. <a href="/account/coaching#purchases" className="underline">Try again</a>.</p> : !purchases.length ? <AccountEmpty title="No purchases yet">{sandbox ? "Completed test checkouts and their payment status will appear here. Test payments do not buy a real service." : "Online purchases are not available yet. Your enquiries and coach replies are listed above; accepting an enquiry does not charge you."}</AccountEmpty> : <>
        <p className="mb-6 text-sm text-muted-foreground">These are test payments only. No real coaching service has been purchased.</p>
        <div className="divide-y divide-border">{purchases.map((purchase) => <article key={purchase.request_id} className="py-6 first:pt-0">
          <div className="flex flex-wrap justify-between gap-4"><div><h3 className="text-xl font-semibold">{purchase.service_snapshot.title}</h3><p className="mt-2 text-sm text-muted-foreground">{purchase.service_snapshot.coachName} · Checkout started {accountDate(purchase.created_at)}</p></div><p className="font-semibold tabular-nums">{accountPrice(purchase.amount, purchase.currency)}</p></div>
          <p className="mt-4 text-sm font-medium">Test mode · {paymentLabels[purchase.status]}</p>
          {purchase.status === "paid" && <Link href={`/account/workspaces/${purchase.request_id}`} className="action-link mt-2">Open coaching workspace <span aria-hidden="true">→</span></Link>}
          {purchase.status === "pending" && requests.some((request) => request.id === purchase.request_id && request.status === "accepted") && <div className="mt-4"><SandboxCoachingForm requestId={purchase.request_id} action="checkout" /></div>}
          {purchase.status === "refunded" && <p className="mt-2 text-sm text-muted-foreground">This payment was refunded. Workspace access is closed.</p>}
          {purchase.status === "review" && <p className="mt-2 text-sm text-muted-foreground">Workspace access is on hold while the payment is reviewed.</p>}
        </article>)}</div>
      </>}
    </section>
  </>;
}
