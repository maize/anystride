import Link from "next/link";
import { accountData } from "@/lib/account-data";
import { AccountEmpty, AccountHeading, AccountStatus, CoachNavigation, accountInput, accountPrice } from "@/components/AccountUI";
import { MarketplaceForm } from "@/components/MarketplaceForm";
import { CoachServiceFields } from "@/components/CoachServiceFields";

const guidance = {
  pending: "Your application is waiting for admin review. Your profile is not public yet. Check this page for the decision; after approval, you can build your storefront and connect payouts.",
  approved: "Your coach application is approved. You can now build your public storefront, add services and connect payouts.",
  rejected: "Your application needs attention. Contact Anystride to discuss the changes needed before it can be approved.",
  suspended: "Your coach account is suspended. Your services are hidden from new athletes. Contact Anystride for help.",
};

export default async function ServicesPage() {
  const data = await accountData();
  return <>
    <AccountHeading title="Coach workspace">Manage your coaching profile and services, and follow each submission through review.</AccountHeading>
    <CoachNavigation active="services" />
    {!data.coach ? <section className="max-w-2xl">
      <p className="mb-2 text-sm font-semibold text-brand">Email verified · Step 2 of 3</p><h2 className="text-3xl font-semibold">Tell us about your coaching</h2><p className="mt-2 mb-8 text-muted-foreground">A short introduction is all you need to apply. An admin reviews your experience before you can publish. You’ll add prices, services and payout details after approval.</p>
      <MarketplaceForm action="apply" button="Send coach application" success="Your application has been sent for review.">
        <label className="block text-sm font-medium">Coaching name<input name="name" autoComplete="name" placeholder="Your name or coaching business" required minLength={2} maxLength={100} className={accountInput} /></label>
        <label className="block text-sm font-medium">Your coaching approach<textarea name="bio" placeholder="Who do you coach, and how do you help them? Tell us about the runners you work with and your approach." required minLength={40} maxLength={2000} rows={4} className={accountInput} /></label>
        <label className="block text-sm font-medium">Experience and qualifications<textarea name="credentials" placeholder="Relevant qualifications, coaching experience and sporting background." required minLength={10} maxLength={1000} rows={3} className={accountInput} /></label>
        <p className="text-sm text-muted-foreground">Share professional experience only. Your application is private until reviewed.</p>
      </MarketplaceForm>
    </section> : <>
      <section className="rounded-xl bg-muted p-6" aria-labelledby="profile-heading">
        <div className="flex flex-wrap items-center justify-between gap-4"><h2 id="profile-heading" className="text-xl font-semibold">{data.coach.name}</h2><AccountStatus status={data.coach.status} /></div>
        <p className="mt-4 text-sm text-muted-foreground">{guidance[data.coach.status]}</p>
        {["rejected", "suspended"].includes(data.coach.status) && <a href="mailto:hello@anystride.com" className="action-link mt-2">Contact Anystride <span aria-hidden="true">→</span></a>}
        <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold hover:text-brand">View my application</summary><p className="mt-4 whitespace-pre-wrap break-words text-sm">{data.coach.bio}</p><h3 className="mt-4 text-sm font-semibold">Experience and qualifications</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{data.coach.credentials}</p></details>
      </section>
      {data.coach.status === "approved" && <section className="mt-8 rounded-xl border border-brand p-6"><p className="text-sm font-semibold text-brand">Step 3 of 3</p><h2 className="mt-2 text-2xl font-semibold">Make your storefront yours</h2><p className="mt-4 max-w-xl text-muted-foreground">Add your introduction, create your first service and connect Stripe. Your setup checklist will guide you through each step.</p><Link href="/account/storefront" className="action-primary mt-6">Set up my storefront →</Link></section>}
      <section className="mt-8" aria-labelledby="my-services-heading">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><h2 id="my-services-heading" className="text-2xl font-semibold">My services <span className="text-muted-foreground">({data.services.length})</span></h2>{data.coach.status === "approved" && data.services.length < 10 && <a href="#new-service" className="action-link">Create a service <span aria-hidden="true">↓</span></a>}</div>
        {!data.services.length && <AccountEmpty title="Your first service starts here">{data.coach.status === "approved" ? "Describe a coaching offer below. Once approved, it will appear in the public coaching directory." : "You can create your first service once your coach application is approved."}</AccountEmpty>}
        <div className="divide-y divide-border">{data.services.map((service) => <article key={service.id} className="py-8 first:pt-0">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-xl font-semibold">{service.title}</h3><p className="mt-2 text-sm text-muted-foreground">{accountPrice(service.amount, service.currency)} total · {service.duration_weeks} {service.duration_weeks === 1 ? "week" : "weeks"}</p></div><AccountStatus status={service.status} /></div>
          <p className="mt-4 max-w-2xl whitespace-pre-wrap break-words text-sm leading-relaxed">{service.description}</p>
          <p className="mt-4 text-sm text-muted-foreground">{service.status === "approved" && data.coach?.status === "approved" ? "Visible to athletes. You will find incoming requests in Athlete enquiries." : service.status === "pending" ? "Awaiting review. This service is not currently visible to athletes." : service.status === "rejected" ? "Update this service and send it for another review." : "This service is hidden from new enquiries."}</p>
          {service.status === "approved" && data.coach?.status === "approved" && <Link href={`/coaching#service-${service.id}`} className="action-link mt-2">View public listing <span aria-hidden="true">↗</span></Link>}
          {data.coach?.status === "approved" && service.status !== "suspended" && <details key={service.version} className="mt-4 max-w-2xl"><summary className="cursor-pointer text-sm font-semibold hover:text-brand">Edit service</summary><div className="mt-4 rounded-xl border border-border p-6">
            <p className="mb-6 text-sm text-muted-foreground">Changes go back to Anystride for review. The listing is hidden until approved again. Existing requests keep the original service details and price.</p>
            <MarketplaceForm action="edit-service" fields={{ id: service.id, version: service.version }} button="Save and send for review" success="Changes saved and sent for review."><CoachServiceFields service={service} /></MarketplaceForm>
          </div></details>}
        </article>)}</div>
      </section>
      {data.coach.status === "approved" && <section id="new-service" className="mt-8 max-w-2xl scroll-mt-8 border-t border-border pt-8">
        <h2 className="text-2xl font-semibold">Create a service</h2>
        {data.services.length >= 10 ? <p className="mt-4 text-muted-foreground">You have reached the limit of 10 services. You can edit an existing service above.</p> : <><p className="mt-2 mb-6 text-sm text-muted-foreground">Your offer is published after review. Athletes can enquire about these services. To sell packages directly, add them in My storefront.</p><MarketplaceForm action="service" button="Send service for review" success="Your new service is saved. Track its approval above."><CoachServiceFields /></MarketplaceForm></>}
      </section>}
    </>}
  </>;
}
