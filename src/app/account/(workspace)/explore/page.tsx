import { accountData } from "@/lib/account-data";
import { AccountEmpty, AccountHeading, accountInput, accountPrice } from "@/components/AccountUI";
import { MarketplaceForm } from "@/components/MarketplaceForm";
import Link from "next/link";

export default async function ExplorePage() {
  const data = await accountData();
  return <>
    <AccountHeading title="Explore coaching">Find a service and tell the coach what you would like to work on. Sending a request is free.</AccountHeading>
    {!data.catalog.length && <AccountEmpty title="No services to request yet" href="/coaching" action="Browse the coach directory">New offers will appear here after review. If you are a coach, your own listings are in your Coach workspace.</AccountEmpty>}
    <div className="divide-y divide-border">{data.catalog.map((service) => {
      const existing = data.requests.find((request) => request.is_runner && ["requested", "accepted"].includes(request.status) && request.service_id === service.id);
      return <article key={service.id} id={`service-${service.id}`} className="scroll-mt-8 py-8 first:pt-0">
        <p className="text-sm text-muted-foreground">{service.coach_name}</p><h2 className="mt-2 text-2xl font-semibold">{service.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{accountPrice(service.amount, service.currency)} proposed total · {service.duration_weeks} {service.duration_weeks === 1 ? "week" : "weeks"}</p>
        <p className="mt-4 max-w-2xl whitespace-pre-wrap break-words leading-relaxed">{service.description}</p>
        {existing ? <Link href="/account/coaching" className="action-link mt-4">View your existing request <span aria-hidden="true">→</span></Link> : <details className="mt-6 max-w-2xl"><summary className="cursor-pointer font-semibold text-brand">Ask about this service</summary><div className="mt-4"><MarketplaceForm action="inquire" fields={{ serviceId: service.id }} button="Send coaching request" success="Request sent. Follow the reply in My coaching.">
          <label className="block text-sm font-medium">Your running goal<textarea name="message" required minLength={20} maxLength={1500} rows={4} className={accountInput} /></label>
          <p className="text-sm text-muted-foreground">Tell the coach what you want to work toward. Leave out medical history and payment details.</p>
          <label className="flex items-start gap-4 text-sm"><input type="checkbox" name="shareWithCoach" required className="mt-1 accent-brand" />Share this request with this coach and Anystride. This is an enquiry, not a purchase.</label>
        </MarketplaceForm></div></details>}
      </article>;
    })}</div>
  </>;
}
