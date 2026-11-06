import Link from "next/link";
import { JsonLd } from "./JsonLd";
import { CoachingWorkspacePreview } from "./CoachingWorkspacePreview";
import { coachingCompetitors, comparisonChecked, type CoachingCompetitor } from "@/lib/coaching-comparisons";
import { storefrontFeeDescription, workspacePricingDescription } from "@/lib/public-product";

export function CoachingComparison({ competitor }: { competitor: CoachingCompetitor }) {
  const entry = coachingCompetitors[competitor];
  const path = `/alternatives/${competitor}`;
  return <div className="mx-auto max-w-5xl px-5 py-12">
    <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Coaching software", item: "https://anystride.com/alternatives" }, { "@type": "ListItem", position: 2, name: `${entry.name} alternative`, item: `https://anystride.com${path}` }] }} />
    <Link href="/alternatives" className="action-link">← Compare coaching software</Link>
    <p className="eyebrow mt-6">For independent running coaches</p>
    <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">An alternative to {entry.name}?</h1>
    <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{entry.consideration}</p>
    <p className="mt-5 text-sm text-muted-foreground">Published by Anystride. Competitor information checked {comparisonChecked}. This is a comparison of published features, not a hands-on review of the competitor’s account.</p>
    <div className="mt-6 flex flex-wrap gap-6"><Link href="#account-preview" className="action-primary">Explore the workspace</Link><Link href="/for-coaches/switching" className="action-link">Plan your first week →</Link></div>
    <section className="my-10 rounded-xl bg-muted p-6"><h2 className="text-xl font-semibold">When {entry.name} is the better fit</h2><p className="mt-3 text-muted-foreground">{entry.strength}</p></section>
    <section aria-labelledby="features-heading"><h2 id="features-heading" className="text-2xl font-semibold">Compare the work you need to do</h2>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[36rem] text-left text-sm"><caption className="sr-only">{entry.name} and Anystride feature comparison</caption><thead><tr className="border-b border-border"><th scope="col" className="p-4">Workflow</th><th scope="col" className="p-4">{entry.name}</th><th scope="col" className="p-4">Anystride · Early access</th></tr></thead><tbody>{entry.rows.map(([label, other, own]) => <tr key={label} className="border-b border-border align-top"><th scope="row" className="p-4 font-semibold">{label}</th><td className="p-4 leading-relaxed text-muted-foreground">{other}</td><td className="p-4 leading-relaxed text-muted-foreground">{own}</td></tr>)}</tbody></table></div>
    </section>
    <section className="grid gap-8 py-12 sm:grid-cols-2"><div><h2 className="text-2xl font-semibold">What it costs</h2><p className="mt-4 text-muted-foreground">{entry.name}: {entry.price} Listed monthly USD prices; check the source for current terms, taxes and annual options.</p></div><div><h3 className="text-xl font-semibold">Anystride</h3><p className="mt-4 text-muted-foreground">{workspacePricingDescription} {storefrontFeeDescription}</p><p className="mt-4 text-sm text-muted-foreground">A storefront fee and a software subscription are different costs. We do not claim that Anystride is cheaper overall.</p><Link href="/pricing" className="action-link">Read costs and conditions →</Link></div></section>
    <CoachingWorkspacePreview initialView="coach" />
    <section className="border-t border-border py-8"><h2 className="text-2xl font-semibold">Check the sources</h2><ul className="mt-4 space-y-3">{entry.sources.map(source => <li key={source.url}><a href={source.url} className="text-sm underline underline-offset-4">{source.label} ↗</a></li>)}</ul><p className="mt-6 text-sm text-muted-foreground">Before switching, test athlete invitations, one training week and your required devices. There is no automatic import from {entry.name}.</p><Link href="/compare/vdot-vs-final-surge" className="action-link mt-3">V.O2 vs Final Surge →</Link></section>
  </div>;
}
