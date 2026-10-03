import Link from "next/link";
import { accountData } from "@/lib/account-data";
import { sandboxWorkspaceEnabled } from "@/lib/sandbox-workspace";
import { AccountEmpty, AccountHeading, AccountStatus, CoachNavigation, accountDate, accountPrice } from "@/components/AccountUI";
import { MarketplaceForm } from "@/components/MarketplaceForm";

export default async function EnquiriesPage() {
  const data = await accountData();
  const requests = data.requests.filter((request) => !request.is_runner).sort((a, b) => Number(b.status === "requested") - Number(a.status === "requested"));
  return <>
    <AccountHeading title="Athlete enquiries">Requests sent to your coaching services. Read each athlete’s goal and decide whether you can help.</AccountHeading>
    <CoachNavigation active="enquiries" />
    {!requests.length && <AccountEmpty title="No athlete enquiries yet" href="/account/services" action="Manage my services">Once your service is approved, athletes can find it in the coaching directory and send you a request.</AccountEmpty>}
    <div className="divide-y divide-border">{requests.map((request) => <article key={request.id} className="py-8 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">Athlete enquiry · {accountDate(request.created_at)} · {request.id.slice(0, 8)}</p><h2 className="mt-2 text-xl font-semibold">{request.service_snapshot.title}</h2></div><AccountStatus status={request.status} /></div>
      <p className="mt-2 text-sm text-muted-foreground">Requested offer: {accountPrice(request.service_snapshot.amount, request.service_snapshot.currency)} · {request.service_snapshot.durationWeeks} {request.service_snapshot.durationWeeks === 1 ? "week" : "weeks"}</p>
      <p className="mt-4 max-w-2xl whitespace-pre-wrap break-words">{request.message}</p>
      {request.status === "requested" && <div className="mt-6 flex flex-wrap gap-4"><MarketplaceForm action="respond" fields={{ id: request.id, status: "accepted" }} button="Accept enquiry" success="Enquiry accepted. The athlete can see your response." /><MarketplaceForm action="respond" fields={{ id: request.id, status: "declined" }} button="Decline enquiry" success="The athlete can see that you declined this enquiry." /></div>}
      {request.status === "accepted" && <><p className="mt-4 text-sm text-muted-foreground">You accepted this enquiry. This does not confirm a purchase or start a paid coaching engagement.</p>{sandboxWorkspaceEnabled() && <Link href={`/account/workspaces/${request.id}`} className="action-link mt-2">View test coaching workspace <span aria-hidden="true">→</span></Link>}</>}
    </article>)}</div>
  </>;
}
