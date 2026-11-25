import type { Metadata } from "next";
import Link from "next/link";
import { coachingCompetitors, comparisonChecked } from "@/lib/coaching-comparisons";
import { workspacePricingDescription } from "@/lib/public-product";

const title = "Anystride vs Final Surge vs V.O2 for Running Coaches";
const description = "Final Surge for team tools and devices. V.O2 for custom VDOT pacing and a marketplace. Anystride invites athletes and reviews results. No Garmin or COROS sync or watch delivery.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/alternatives" },
  openGraph: { title, description, url: "/alternatives", type: "website" },
};

export default function AlternativesPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <p className="eyebrow">Choosing your coaching workspace</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">Anystride vs Final Surge vs V.O2: which coaching platform fits</h1>
      <p className="mt-5 max-w-3xl text-lg text-muted-foreground">Final Surge is for established team tools, communication and device connections. V.O2 is for custom VDOT pacing and an established marketplace. Anystride is for inviting athletes, assigning plans and reviewing results, with no Garmin or COROS sync or watch delivery.</p>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        <Link href="/for-coaches" className="font-medium text-brand underline underline-offset-2">Anystride’s running coach software</Link>
        {" "}covers invitations, 1 to 24 week plans, workout assignment and result review. {workspacePricingDescription} Coach approval is required before athlete tools open.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">Published by Anystride. Sources checked {comparisonChecked}. We describe our limitations alongside our features.</p>
      <div className="mt-10 divide-y divide-border">
        {Object.entries(coachingCompetitors).map(([slug, entry]) => (
          <article key={slug} className="py-8">
            <h2 className="text-2xl font-semibold">When is {entry.name} the better fit?</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">{entry.strength}</p>
            <Link href={`/alternatives/${slug}`} className="action-link mt-3">Read the comparison →</Link>
          </article>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-6">
        <Link href="/compare/vdot-vs-final-surge" className="action-link">V.O2 vs Final Surge →</Link>
        <Link href="/for-coaches/switching" className="action-link">Moving your first athlete →</Link>
        <Link href="/for-coaches" className="action-link">Anystride’s running coach software →</Link>
      </div>
    </div>
  );
}
