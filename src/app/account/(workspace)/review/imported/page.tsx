import Link from "next/link";
import { notFound } from "next/navigation";
import { accountActor } from "@/lib/account-data";
import { importedCoachReviews, type ImportedCoachReview } from "@/lib/imported-coach-store";
import { MarketplaceError } from "@/lib/marketplace-config";
import { AccountEmpty, AccountHeading, accountInput } from "@/components/AccountUI";
import { AdminReviewNavigation } from "@/components/AdminReviewNavigation";

const filters = [
  ["review", "Needs review"], ["published", "Published"], ["draft", "Drafts"],
  ["hidden", "Hidden"], ["excluded", "Excluded by importer"], ["all", "All imports"],
];
function matches(entry: ImportedCoachReview, state: string) {
  const excluded = ["duplicate", "invalid-profile"].includes(entry.importStatus);
  return state === "all" || (state === "excluded" ? excluded : state === "review" ? entry.status === "unreviewed" && !excluded : entry.status === state && !excluded);
}

export default async function ImportedCoachesPage({ searchParams }: { searchParams: Promise<{ state?: string; q?: string; page?: string }> }) {
  const actor = await accountActor();
  if (!actor.admin) notFound();
  const params = await searchParams;
  const state = filters.some(([key]) => key === params.state) ? params.state! : "review";
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 160) : "";
  let entries;
  try { entries = await importedCoachReviews(actor); }
  catch (error) { return <><AccountHeading title="Imported coaches">Review directory listings separately from coach accounts.</AccountHeading><AdminReviewNavigation active="imported" /><p role="alert">{error instanceof MarketplaceError ? error.message : "We could not load imported coach reviews. Please try again shortly."}</p><Link href="/account/review/imported" className="action-link mt-4">Try again →</Link></>; }
  const filtered = entries.filter((entry) => matches(entry, state) && `${entry.profile?.name ?? entry.name} ${entry.profile?.location ?? entry.location} ${entry.profile?.link ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1));
  const href = (nextState: string, nextPage = 1) => `/account/review/imported?${new URLSearchParams({ state: nextState, q: query, page: String(nextPage) })}`;
  return <>
    <AccountHeading title="Imported coaches">Check the source, correct the profile, then decide whether it belongs in the directory. Publishing is an editorial decision, not verification that the coach owns an Anystride account.</AccountHeading>
    <AdminReviewNavigation active="imported" />
    <p className="mb-8 rounded-xl bg-muted p-4 text-sm text-muted-foreground">{entries.filter((entry) => entry.visible && entry.status === "unreviewed").length} existing listings are live without editorial review. They stay live until you save a draft or hide them. New candidates stay private until approved.</p>
    <nav aria-label="Imported coach status" className="mb-6 flex flex-wrap gap-2">{filters.map(([key, label]) => <Link key={key} href={href(key)} aria-current={state === key ? "page" : undefined} className={`rounded-lg px-3 py-2 text-sm ${state === key ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-brand"}`}>{label} ({entries.filter((entry) => matches(entry, key)).length})</Link>)}</nav>
    <form method="get" action="/account/review/imported" className="mb-8 flex flex-wrap items-end gap-4">
      <input type="hidden" name="state" value={state} />
      <label className="min-w-0 flex-1 text-sm font-medium">Find a coach<input type="search" name="q" defaultValue={query} maxLength={160} placeholder="Name, location, or website" className={accountInput} /></label>
      <button className="action-primary" type="submit">Search imports</button>
    </form>
    <p className="mb-4 text-sm text-muted-foreground tabular-nums">{filtered.length} {filtered.length === 1 ? "result" : "results"} · Page {page} of {pageCount}</p>
    {!filtered.length && <AccountEmpty title="No imports in this view" href="/account/review/imported?state=all" action="See all imports">Try another name or review status.</AccountEmpty>}
    <div className="divide-y divide-border">{filtered.slice((page - 1) * 20, page * 20).map((entry) => <article key={entry.key} className="flex flex-wrap items-center justify-between gap-4 py-6">
      <div className="min-w-0 flex-1"><h2 className="break-words text-lg font-semibold">{entry.profile?.name ?? entry.name}</h2><p className="mt-2 break-words text-sm text-muted-foreground">{entry.profile?.location ?? entry.location}</p><p className="mt-2 text-sm text-muted-foreground">{entry.visible ? "Live" : "Not public"} · {entry.status === "unreviewed" ? "Not yet reviewed" : entry.status === "published" ? "Editorially approved" : entry.status === "draft" ? "Draft" : "Hidden"} · Unclaimed{entry.sourceChanged ? " · Import changed since review" : ""}</p>{entry.reason && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{entry.reason}</p>}</div>
      <Link href={`/account/review/imported/${entry.slug}`} className="action-link shrink-0" aria-label={`Review ${entry.profile?.name ?? entry.name}`}>Review profile <span aria-hidden="true">→</span></Link>
    </article>)}</div>
    <nav aria-label="Imported coach pages" className="mt-8 flex justify-between gap-4">{page > 1 ? <Link href={href(state, page - 1)} className="action-link">← Previous</Link> : <span />}{page < pageCount && <Link href={href(state, page + 1)} className="action-link">Next →</Link>}</nav>
  </>;
}
