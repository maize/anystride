import type { Metadata } from "next";
import Link from "next/link";
import { pricingSections, productUpdated } from "@/lib/public-product";

const title = "Anystride pricing: free plans and coaching fees";
const description = "Free public running plans, prices set by independent coaches, a 10% storefront commission, and early access training tools. See costs and approval requirements.";
export const metadata: Metadata = {
  title: { absolute: title }, description, alternates: { canonical: "/pricing" },
  openGraph: { title, description, url: "/pricing", type: "website" },
};
export default function PricingPage() {
  return <article className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
    <p className="text-sm font-semibold uppercase tracking-wide text-brand-text">Costs and conditions</p>
    <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Anystride pricing</h1>
    <p className="mt-6 text-lg text-muted-foreground">Start with free running plans. Choose personal coaching when you want individual support.</p>
    <p className="mt-4 text-sm text-muted-foreground">Updated <time dateTime={productUpdated}>October 31, 2026</time></p>
    <div className="mt-12 space-y-8">{pricingSections.map(section => <section key={section.title}>
      <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
      <p className="mt-4 text-pretty text-muted-foreground">{section.body}</p>
    </section>)}</div>
    <section className="mt-12 rounded-2xl border border-border p-6">
      <h2 className="text-2xl font-semibold">Choose your next step</h2>
      <div className="mt-4 flex flex-wrap gap-6"><Link href="/plans" className="action-link">Find a free plan →</Link><Link href="/coaches" className="action-link">Find a coach →</Link><Link href="/for-coaches" className="action-link">Explore coaching tools →</Link></div>
    </section>
    <p className="mt-8 text-sm text-muted-foreground">Read the <Link href="/terms" className="underline underline-offset-4">terms</Link> and each service’s conditions before purchasing. <a href="/pricing.txt" className="underline underline-offset-4">Plain text pricing</a> is available with the same information.</p>
  </article>;
}
