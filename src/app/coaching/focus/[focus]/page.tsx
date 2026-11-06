import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { publicCoachingFocusCards } from "@/lib/public-coaching-focus";
import { coachingFocusPage, minimumFocusListings } from "@/lib/coaching-focus";
import { CoachCard } from "@/components/CoachCard";
import { JsonLd } from "@/components/JsonLd";
export const dynamic = "force-dynamic";
const load = cache(async (slug: string) => {
  const page = coachingFocusPage(slug);
  if (!page) notFound();
  const categories = await publicCoachingFocusCards();
  return { page, cards: categories[slug] };
});
export async function generateMetadata({ params }: { params: Promise<{ focus: string }> }): Promise<Metadata> {
  const { focus } = await params; const { page, cards } = await load(focus);
  return { title: page.title, description: page.intro, alternates: { canonical: `/coaching/focus/${focus}` }, robots: cards.length < minimumFocusListings ? { index: false, follow: true } : undefined };
}
export default async function FocusPage({ params }: { params: Promise<{ focus: string }> }) {
  const { focus } = await params; const { page, cards } = await load(focus);
  return <div className="mx-auto max-w-5xl px-5 py-12"><JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: page.title, url: `https://anystride.com/coaching/focus/${focus}` }} /><JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Running coaches", item: "https://anystride.com/coaches" }, { "@type": "ListItem", position: 2, name: page.title, item: `https://anystride.com/coaching/focus/${focus}` }] }} /><Link href="/coaches" className="action-link">← All running coaches</Link><h1 className="mt-5 text-4xl font-semibold tracking-tight">{page.title}</h1><p className="mt-5 max-w-2xl text-lg text-muted-foreground">{page.intro}</p><p className="mt-4 max-w-2xl text-sm text-muted-foreground">Listings match the recorded training focus, not a ranking or endorsement. Unclaimed profiles come from public sources; only marked profiles are approved Anystride coaches. Confirm availability, service details and prices with the coach.</p><div className="mt-6 flex flex-wrap gap-6"><Link href="/coaching/match" className="action-primary">Ask for help choosing</Link><Link href="/#account-preview" className="action-link">See how coaching works →</Link></div>
    <section className="mt-10" aria-labelledby="focus-listings"><h2 id="focus-listings" className="text-2xl font-semibold">Explore relevant coaches</h2>{cards.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map(card => <CoachCard key={card.key} coach={card.coach} href={card.href} approved={card.approved} />)}</div> : <p className="mt-4 text-muted-foreground">No matching profiles are available right now. Browse the full directory or ask for a match.</p>}</section>
    <section className="mt-12 grid gap-8 border-t border-border py-8 sm:grid-cols-2"><div><h2 className="text-2xl font-semibold">Before you choose</h2><ul className="mt-5 list-disc space-y-3 pl-5 text-muted-foreground">{page.questions.map(question => <li key={question}>{question}</li>)}</ul></div><div><h2 className="text-2xl font-semibold">A plan or a coach?</h2><p className="mt-5 text-muted-foreground">A plan gives you a schedule to follow. Coaching can add individual review and adjustments, depending on the service. Ask about communication frequency and what happens if your training changes.</p><Link href={`/training-plans/${page.planDistance}`} className="action-link mt-4">Compare free training plans →</Link></div></section></div>;
}
