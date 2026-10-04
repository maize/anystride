import Link from "next/link";
import { notFound } from "next/navigation";
import { accountActor } from "@/lib/account-data";
import { marketplaceReviews, type ReviewStatus } from "@/lib/marketplace-store";
import { AccountEmpty, AccountHeading, AccountStatus, accountPrice } from "@/components/AccountUI";
import { MarketplaceForm } from "@/components/MarketplaceForm";
import { AdminReviewNavigation } from "@/components/AdminReviewNavigation";

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string }> }) {
  const actor = await accountActor();
  if (!actor.admin) notFound();
  const data = await marketplaceReviews(actor);
  const params = await searchParams;
  const type = params.type === "services" ? "services" : "coaches";
  const statuses: ReviewStatus[] = ["pending", "approved", "rejected", "suspended"];
  const status = statuses.includes(params.status as ReviewStatus) ? params.status as ReviewStatus : "pending";
  const labels = { pending: "Awaiting review", approved: "Approved", rejected: "Changes needed", suspended: "Suspended" };
  const items = type === "coaches"
    ? data.reviewCoaches.map((coach) => ({ id: coach.id, version: coach.version, status: coach.status, title: coach.name, description: coach.bio, detail: coach.credentials, target: "coach" as const, canApprove: true }))
    : data.reviewServices.map((service) => ({ id: service.id, version: service.version, status: service.status, title: service.title, description: service.description, detail: `${service.coach_name} · ${accountPrice(service.amount, service.currency)} · ${service.duration_weeks} weeks`, target: "service" as const, canApprove: service.coach_status === "approved" }));
  const filtered = items.filter((item) => item.status === status);
  return <>
    <AccountHeading title="Admin reviews">Review coach applications and service proposals separately. Every decision is recorded.</AccountHeading>
    <AdminReviewNavigation active={type} coaches={data.reviewCoaches.filter((c) => c.status === "pending").length} services={data.reviewServices.filter((s) => s.status === "pending").length} />
    <nav aria-label="Review status" className="mb-8 flex flex-wrap gap-2">{statuses.map((value) => <Link key={value} href={`/account/review?type=${type}&status=${value}`} aria-current={value === status ? "page" : undefined} className={`rounded-lg px-3 py-2 text-sm transition-colors duration-300 ease-stride ${value === status ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-brand"}`}>{labels[value]}</Link>)}</nav>
    <h2 className="mb-6 text-2xl font-semibold">{labels[status]} <span className="text-muted-foreground">({filtered.length})</span></h2>
    {!filtered.length && <AccountEmpty title={status === "pending" ? "You’re up to date" : "No items in this view"}>{status === "pending" ? `There are no ${type === "coaches" ? "coach applications" : "service proposals"} awaiting review.` : "Choose another status to see earlier decisions."}</AccountEmpty>}
    <div className="divide-y divide-border">{filtered.map((item) => <article key={`${item.id}:${item.version}`} className="py-8 first:pt-0">
      <div className="flex flex-wrap justify-between gap-4"><h3 className="text-xl font-semibold">{item.title}</h3><AccountStatus status={item.status} /></div>
      <p className="mt-4 max-w-2xl whitespace-pre-wrap break-words">{item.description}</p>
      <p className="mt-4 whitespace-pre-wrap break-words text-sm text-muted-foreground">{item.detail}</p>
      {!item.canApprove && <p className="mt-4 text-sm text-muted-foreground">Approve the coach’s application before approving this service.</p>}
      <div className="mt-6 flex flex-wrap gap-4">{(["approved", "rejected", "suspended"] as const).filter((next) => next !== status && (next !== "approved" || item.canApprove) && (next !== "suspended" || status === "approved")).map((next) => <MarketplaceForm key={next} action="review" fields={{ id: item.id, version: item.version, target: item.target, status: next }} button={next === "approved" ? "Approve" : next === "rejected" ? "Request changes" : "Suspend"} success="Review saved." />)}</div>
    </article>)}</div>
  </>;
}
