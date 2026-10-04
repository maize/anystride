import Link from "next/link";
import { notFound } from "next/navigation";
import { accountActor } from "@/lib/account-data";
import { importedCoachReviews } from "@/lib/imported-coach-store";
import { AccountHeading, accountDate } from "@/components/AccountUI";
import { AdminReviewNavigation } from "@/components/AdminReviewNavigation";
import { ImportedCoachEditor } from "@/components/ImportedCoachEditor";

export default async function ImportedCoachPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await accountActor();
  if (!actor.admin) notFound();
  const { slug } = await params;
  const entry = (await importedCoachReviews(actor)).find((item) => item.slug === slug);
  if (!entry) notFound();
  return <>
    <AccountHeading title={entry.profile?.name ?? entry.name}>Review the original sources before changing or publishing this directory profile. This does not create a coach account or approve a paid service.</AccountHeading>
    <AdminReviewNavigation active="imported" />
    <Link href="/account/review/imported" className="action-link mb-6">← Back to imported coaches</Link>
    <section aria-label="Publication and sources" className="mb-8 rounded-xl bg-muted p-6">
      <p className="font-semibold">{entry.visible ? "Currently live in the directory" : "Not currently public"} · {entry.status === "unreviewed" ? "Not yet reviewed" : entry.status === "published" ? "Editorially approved" : entry.status === "draft" ? "Draft" : "Hidden"}</p>
      <p className="mt-2 text-sm text-muted-foreground">Unclaimed profile{entry.reviewedAt ? ` · Last decision ${accountDate(entry.reviewedAt)}` : ""}. Ownership has not been verified.</p>
      {entry.reason && <p className="mt-4 text-sm text-muted-foreground">Importer note: {entry.reason}</p>}
      {entry.sourceChanged && <p className="mt-4 text-sm font-semibold">The imported source changed after the last review. Your saved corrections have been preserved; check the source again before publishing.</p>}
      <div className="mt-4 flex flex-wrap gap-6 text-sm font-semibold"><a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-brand underline">Original V.O2 profile ↗</a>{entry.profile?.link && <a href={entry.profile.link} target="_blank" rel="noopener noreferrer" className="text-brand underline">Coach website ↗</a>}{entry.visible && <a href={`/coaching/${entry.slug}`} target="_blank" rel="noopener noreferrer" className="underline">View current public listing ↗</a>}</div>
    </section>
    <ImportedCoachEditor key={`${entry.key}:${entry.version}`} entry={entry} />
  </>;
}
