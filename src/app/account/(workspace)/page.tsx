import Link from "next/link";
import { accountActor, accountData } from "@/lib/account-data";
import { AccountHeading, AccountStatus } from "@/components/AccountUI";

export default async function AccountPage() {
  const actor = await accountActor();
  const data = await accountData();
  const requests = data.requests.filter((request) => request.is_runner);
  const enquiries = data.requests.filter((request) => !request.is_runner && request.status === "requested");
  return <>
    <AccountHeading title="Your account">Keep track of your coaching, discover a service, or manage what you offer as a coach.</AccountHeading>
    <div className="grid gap-8 md:grid-cols-2">
      <section className="rounded-xl bg-muted p-8">
        <p className="text-sm text-muted-foreground">For your running</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">My coaching</h2>
        <p className="mt-4 text-muted-foreground">{requests.length ? `${requests.length} coaching ${requests.length === 1 ? "request" : "requests"}. View replies and your purchase history in one place.` : "Your coach replies and purchase history will appear here once you get started."}</p>
        <Link href="/account/coaching" className="action-link mt-4">View my coaching <span aria-hidden="true">→</span></Link>
      </section>
      <section className="rounded-xl border border-border p-8">
        <p className="text-sm text-muted-foreground">For your coaching business</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Coach workspace</h2>
        <p className="mt-4 text-muted-foreground">{data.coach?.status === "pending" ? "Your application is waiting for admin review. Check its status here before setting up your storefront." : data.coach ? `${data.services.length} services · ${enquiries.length} enquiries awaiting your reply.` : "Apply as a coach, create services, and respond to athletes from your workspace."}</p>
        {data.coach && <div className="mt-4"><AccountStatus status={data.coach.status} /></div>}
        <Link href={data.coach?.status === "approved" ? "/account/storefront" : "/account/services"} className="action-link mt-4">{data.coach?.status === "approved" ? "Set up my storefront" : data.coach ? "View my application" : "Start my coach application"} <span aria-hidden="true">→</span></Link>
      </section>
    </div>
    <section className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8"><div><h2 className="text-xl font-semibold">Find your next coach</h2><p className="mt-2 text-sm text-muted-foreground">Explore reviewed services and ask a coach about your running goal.</p></div><Link href="/account/explore" className="action-primary">Explore services <span aria-hidden="true">→</span></Link></section>
    {actor.admin && <section id="review-heading" className="mt-8 border-t border-border pt-8"><h2 className="text-lg font-semibold">Administration</h2><p className="mt-2 text-sm text-muted-foreground">Review coach applications and service proposals in the dedicated admin area.</p><Link href="/account/review" className="action-link mt-2">Open admin reviews <span aria-hidden="true">→</span></Link></section>}
  </>;
}
