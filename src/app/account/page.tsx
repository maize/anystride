import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountSignOut } from "@/components/AccountSignIn";
import { requireMarketplaceActor } from "@/lib/marketplace-auth";
import { marketplaceEnabled, MarketplaceError } from "@/lib/marketplace-config";
import { marketplaceDashboard } from "@/lib/marketplace-store";
import { AccountUnavailable } from "@/components/AccountUnavailable";
import { MarketplaceForm } from "@/components/MarketplaceForm";
import { sandboxWorkspaceEnabled } from "@/lib/sandbox-workspace";
import { SandboxCoachingForm } from "@/components/SandboxCoachingForm";

const accountInput = "mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-base focus:outline-2 focus:outline-offset-2 focus:outline-brand";

function price(amount: number, currency: string) { return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount / 100); }

export default async function AccountPage() {
  if (!marketplaceEnabled()) return <AccountUnavailable />;
  let actor;
  try { actor = await requireMarketplaceActor(); }
  catch (error) {
    if (error instanceof MarketplaceError && error.status === 401) redirect("/account/sign-in");
    return <><h1 className="text-3xl font-semibold">Your coaching account</h1><p role="alert" className="mt-4">{error instanceof MarketplaceError ? error.message : "We could not verify your account. Try again shortly."}</p><div className="mt-4"><AccountSignOut /></div></>;
  }
  let data;
  try { data = await marketplaceDashboard(actor); }
  catch { return <><h1 className="text-3xl font-semibold">Your coaching account</h1><p role="alert" className="mt-4">We could not load your account. Your saved information has not changed.</p><a href="/account" className="mt-4 inline-block underline">Try again</a></>; }
  const sandboxEnabled = sandboxWorkspaceEnabled();
  return <>
    <div className="flex items-center justify-between gap-4"><Link href="/coaching" className="text-sm text-muted-foreground hover:text-brand">← Coaching</Link><AccountSignOut /></div>
    <h1 className="mt-8 text-3xl font-semibold tracking-tight">Your coaching account</h1>
    <p className="mt-4 text-muted-foreground">{sandboxEnabled
      ? "This local sandbox supports applications, enquiries and Stripe test payments. Test payments do not purchase a real coaching service."
      : "This pilot supports applications and enquiries. An accepted request is not a purchase or a confirmed coaching engagement. Payments and paid coach access are not available here yet."}</p>

    <section className="mt-12 space-y-6" aria-labelledby="requests-heading">
      <h2 id="requests-heading" className="text-2xl font-semibold">Your requests</h2>
      {!data.requests.length && <p className="text-muted-foreground">No requests yet. Explore the approved services below, or apply to offer your own coaching.</p>}
      {data.requests.map((r) => <article key={r.id} className="rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold">{r.service_snapshot.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{r.is_runner ? `With ${r.service_snapshot.coachName}` : "Incoming runner request"} · {r.status}</p>
        <p className="mt-2 text-sm">Proposed {price(r.service_snapshot.amount, r.service_snapshot.currency)} for {r.service_snapshot.durationWeeks} weeks</p>
        <p className="mt-4 whitespace-pre-wrap text-pretty">{r.message}</p>
        {r.status === "accepted" && sandboxEnabled && <div className="mt-6 space-y-3 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">Sandbox only. Use a Stripe test card; this does not buy a real coaching service. The workspace unlocks only after payment verification.</p>
          {r.is_runner && <SandboxCoachingForm requestId={r.id} action="checkout" />}
          <a href={`/account/workspaces/${r.id}`} className="text-sm underline">Open sandbox workspace</a>
        </div>}
        {r.is_runner && ["requested", "accepted"].includes(r.status) && <div className="mt-4"><MarketplaceForm action="respond" fields={{ id: r.id, status: "cancelled" }} button="Withdraw request" success="Request withdrawn. No payment was taken." /></div>}
        {!r.is_runner && r.status === "requested" && <div className="mt-4 flex flex-wrap gap-4"><MarketplaceForm action="respond" fields={{ id: r.id, status: "accepted" }} button="Accept enquiry" success="Enquiry accepted. This does not start a paid engagement." /><MarketplaceForm action="respond" fields={{ id: r.id, status: "declined" }} button="Decline enquiry" success="Enquiry declined." /></div>}
      </article>)}
    </section>

    <section className="mt-12 space-y-6" aria-labelledby="services-heading">
      <h2 id="services-heading" className="text-2xl font-semibold">Explore coaching</h2>
      {!data.catalog.length && <p className="text-muted-foreground">There are no approved services available to request yet. The existing <Link href="/coaching" className="underline hover:text-brand">coach directory</Link> is separate from this marketplace.</p>}
      {data.catalog.map((s) => <article key={s.id} className="rounded-xl border border-border p-6">
        <h3 className="text-xl font-semibold">{s.title}</h3><p className="mt-2 text-sm text-muted-foreground">{s.coach_name} · {s.duration_weeks} weeks · Proposed {price(s.amount, s.currency)}</p>
        <p className="my-4 whitespace-pre-wrap text-pretty">{s.description}</p>
        <details><summary className="cursor-pointer font-semibold hover:text-brand">Ask about this service</summary><div className="mt-4"><MarketplaceForm action="inquire" fields={{ serviceId: s.id }} button="Send coaching request" success="Your request is saved and visible to this coach in their account.">
          <label className="block text-sm font-medium">Your running goal<textarea name="message" required minLength={20} maxLength={1500} rows={4} className={accountInput} /></label>
          <p className="text-sm text-muted-foreground">Describe what you want to work toward. Do not include medical history, injury details or payment information.</p>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="shareWithCoach" required className="mt-1 accent-brand" />Share this request with this coach and Anystride. This is an enquiry, not a purchase.</label>
        </MarketplaceForm></div></details>
      </article>)}
    </section>

    <section className="mt-12 space-y-6" aria-labelledby="coach-heading">
      <h2 id="coach-heading" className="text-2xl font-semibold">Offer your coaching</h2>
      {!data.coach ? <><p className="text-muted-foreground">Apply to join the pilot. Anystride reviews each application before a coach can propose services. Your application is private until reviewed.</p><MarketplaceForm action="apply" button="Send coach application" success="Your application is saved for review.">
        <label className="block text-sm font-medium">Coaching name<input name="name" autoComplete="name" required minLength={2} maxLength={100} className={accountInput} /></label>
        <label className="block text-sm font-medium">Your coaching approach<textarea name="bio" required minLength={40} maxLength={2000} rows={4} className={accountInput} /></label>
        <label className="block text-sm font-medium">Experience and qualifications<textarea name="credentials" required minLength={10} maxLength={1000} rows={3} className={accountInput} /></label>
        <p className="text-sm text-muted-foreground">Share professional experience only, not identity documents. Applying does not accept payment terms or guarantee approval.</p>
      </MarketplaceForm></> : <>
        <p className="text-muted-foreground">{data.coach.name} · Application {data.coach.status}</p>
        {data.services.map((s) => <p key={s.id} className="text-sm">{s.title} · {price(s.amount, s.currency)} · {s.status}</p>)}
        {data.coach.status === "approved" && <details><summary className="cursor-pointer font-semibold hover:text-brand">Propose a coaching service</summary><div className="mt-4"><MarketplaceForm action="service" button="Send service for review" success="Your service proposal is saved for review.">
          <label className="block text-sm font-medium">Service title<input name="title" required minLength={5} maxLength={120} className={accountInput} /></label>
          <label className="block text-sm font-medium">What runners receive<textarea name="description" required minLength={40} maxLength={2000} rows={4} className={accountInput} /></label>
          <div className="grid gap-4 sm:grid-cols-3"><label className="block text-sm font-medium">Proposed total price<input type="number" name="price" min="1" max="1000" step="0.01" required className={accountInput} /></label><label className="block text-sm font-medium">Currency<select name="currency" className={accountInput}><option value="usd">USD</option><option value="eur">EUR</option><option value="gbp">GBP</option></select></label><label className="block text-sm font-medium">Duration in weeks<input type="number" name="durationWeeks" min="1" max="52" required className={accountInput} /></label></div>
          <p className="text-sm text-muted-foreground">Describe the total service, contact frequency and limits clearly. Proposals are reviewed before appearing here. These prices are not yet available for purchase.</p>
        </MarketplaceForm></div></details>}
      </>}
    </section>

    {actor.admin && <section className="mt-12 space-y-6" aria-labelledby="review-heading"><h2 id="review-heading" className="text-2xl font-semibold">Review queue</h2><p className="text-sm text-muted-foreground">Verify the coach and service before approval. You cannot review your own application or service. Suspended coaches and services are hidden from new enquiries.</p>
      {!data.reviewCoaches.length && !data.reviewServices.length && <p className="text-muted-foreground">Nothing to review yet.</p>}
      {([...data.reviewCoaches.map((c) => ({ ...c, target: "coach", title: c.name, description: `${c.bio}\n\n${c.credentials}` })), ...data.reviewServices.map((s) => ({ ...s, target: "service" }))]).map((item) => <article key={`${item.target}:${item.id}`} className="rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold">{item.title}</h3><p className="mt-2 text-sm text-muted-foreground">{item.target} · {item.status}</p><p className="my-4 whitespace-pre-wrap">{item.description}</p>
        {item.target === "service" && <p className="mb-4 text-sm">{item.coach_name} · {price(item.amount, item.currency)} · {item.duration_weeks} weeks</p>}
        <div className="flex flex-wrap gap-4">{["approved", "rejected", "suspended"].filter((status) => status !== item.status).map((status) => <MarketplaceForm key={`${item.version}:${status}`} action="review" fields={{ id: item.id, target: item.target, version: item.version, status }} button={status === "approved" ? "Approve" : status === "rejected" ? "Reject" : "Suspend"} success="Review saved." />)}</div>
      </article>)}
    </section>}
  </>;
}
