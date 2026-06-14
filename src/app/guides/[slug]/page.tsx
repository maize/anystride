import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllGuides, getGuideBySlug } from "@/lib/guides";
import { getPlanBySlug } from "@/lib/plans";
import { PlanCard } from "@/components/PlanCard";
import { JsonLd } from "@/components/JsonLd";

export function generateStaticParams() {
  return getAllGuides().map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return { title: "Guide not found" };
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: { type: "article", title: guide.title, description: guide.description },
  };
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  const relatedPlans = (guide.relatedPlans ?? [])
    .map((s) => getPlanBySlug(s))
    .filter((p) => p !== undefined);

  const url = `https://anystride.com/guides/${guide.slug}`;

  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: guide.title,
          description: guide.description,
          datePublished: guide.updated,
          dateModified: guide.updated,
          author: { "@type": "Organization", name: "anystride" },
          publisher: { "@type": "Organization", name: "anystride" },
          mainEntityOfPage: url,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: guide.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Guides",
              item: "https://anystride.com/guides",
            },
            { "@type": "ListItem", position: 2, name: guide.title, item: url },
          ],
        }}
      />

      <Link
        href="/guides"
        className="text-sm font-medium text-muted-foreground hover:text-brand"
      >
        ← All guides
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
        {guide.title}
      </h1>
      <p className="mt-2 text-xs text-muted-foreground">
        Updated{" "}
        {new Date(guide.updated).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted-foreground">
        {guide.intro.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {guide.sections.map((section) => (
        <section key={section.heading} className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            {section.heading}
          </h2>
          <div className="mt-3 space-y-3 leading-relaxed">
            {section.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {section.bullets && (
            <ul className="mt-3 space-y-2">
              {section.bullets.map((b) => (
                <li key={b} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {/* Calculator CTA */}
      <div className="mt-10 flex flex-col gap-3 rounded-xl border border-border bg-muted p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Get your personal numbers</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Training paces, predicted times, and the plans that fit you.
          </p>
        </div>
        <Link
          href="/calculator"
          className="shrink-0 rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          Open the calculator →
        </Link>
      </div>

      {/* FAQ */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">
          Frequently asked questions
        </h2>
        <div className="mt-4 space-y-4">
          {guide.faq.map((f) => (
            <div key={f.q}>
              <h3 className="font-semibold">{f.q}</h3>
              <p className="mt-1 text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related plans */}
      {relatedPlans.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">
            Related training plans
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {relatedPlans.map((plan) => (
              <PlanCard key={plan!.slug} plan={plan!} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
