import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Editorial standards & corrections",
  description: "Who is responsible for Anystride’s guides, how sources and race coverage are labelled, and how to request a correction.",
  alternates: { canonical: "/editorial" },
};

export default function EditorialPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="text-hero-gradient text-3xl font-bold tracking-tight sm:text-4xl">Editorial standards</h1>
      <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
        anystride is responsible for the guides and race listings published here.
        An organisation byline identifies that responsibility; it does not imply medical credentials or independent expert review.
      </p>
      <div className="mt-10 space-y-9 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold">Training guides</h2>
          <p className="mt-3 text-muted-foreground">Guides provide general information, not personalised medical or nutrition advice. Some existing articles are still awaiting a source review. Where references are listed, you can read the original material. A source link is not an endorsement by its author, and no guide currently carries a named independent clinical review.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Race coverage</h2>
          <p className="mt-3 text-muted-foreground">Race pages distinguish schedules, announced fields and results. Check the displayed verification date and official link: schedules and fields can change after our check. A race being over does not mean we have verified its results. Stale listings are labelled, and the organiser remains the source for late changes.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Dates and corrections</h2>
          <p className="mt-3 text-muted-foreground">“Updated” describes the recorded content revision, not the date you opened the page. We do not assign an original publication date when it is unknown. To flag an error, email <a href="mailto:hello@anystride.com" className="text-brand underline underline-offset-4">hello@anystride.com</a> with the page URL, the claim and a supporting source if available.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">What comes next</h2>
          <p className="mt-3 text-muted-foreground">We are working toward a race and athlete news pilot with source attribution and a human review step. Automatic discovery is planned; it is not a claim that scraped stories are verified or ready to publish.</p>
        </section>
      </div>
      <Link href="/guides" className="action-link mt-10 inline-flex">Explore the guides →</Link>
    </article>
  );
}
