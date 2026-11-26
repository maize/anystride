import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllGuides, getGuideBySlug } from "@/lib/guides";
import { getPlanBySlug } from "@/lib/plans";
import { PlanCard } from "@/components/PlanCard";
import { JsonLd } from "@/components/JsonLd";

/** Internal markdown links `[label](/path)` and `**bold**`. Plain text is returned unchanged. */
function renderGuideText(text: string): ReactNode {
  if (!text.includes("**") && !text.includes("](")) return text;

  const pattern = /(\*\*([^*]+)\*\*)|\[([^\]]+)\]\(([^)]*)\)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let part = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      nodes.push(<Fragment key={`t${part}`}>{text.slice(lastIndex, start)}</Fragment>);
      part += 1;
    }
    if (match[1]) {
      nodes.push(<strong key={`b${part}`}>{match[2]}</strong>);
    } else {
      const label = match[3] ?? "";
      const href = match[4] ?? "";
      if (href.startsWith("/") && !href.startsWith("//")) {
        nodes.push(
          <Link key={`a${part}`} href={href} className="text-brand underline underline-offset-4">
            {label}
          </Link>,
        );
      } else {
        nodes.push(<Fragment key={`r${part}`}>{match[0]}</Fragment>);
      }
    }
    part += 1;
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(<Fragment key={`t${part}`}>{text.slice(lastIndex)}</Fragment>);
  }
  return nodes;
}

function sectionHeadingId(heading: string): string {
  return `guide-${heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

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
    openGraph: {
      type: "article", title: guide.title, description: guide.description,
      url: `/guides/${guide.slug}`, modifiedTime: guide.updated,
    },
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
  const isPlanSelectionGuide = guide.slug === "how-to-choose-a-training-plan";
  const isCadenceGuide = guide.slug === "running-cadence";

  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: guide.title,
          description: guide.description,
          dateModified: guide.updated,
          author: { "@type": "Organization", name: "anystride", url: "https://anystride.com/editorial" },
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
        By <Link href="/editorial" className="underline underline-offset-4 hover:text-brand">anystride</Link>
        {" · "}
        Updated{" "}
        {new Date(guide.updated).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        })}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        General training information. Not independently reviewed by a named clinician or sports dietitian.
      </p>

      {guide.tldr ? (
        <aside className="mt-6 rounded-xl border border-border bg-muted px-4 py-3" aria-label="TL;DR">
          <p className="text-xs font-semibold tracking-wide">TL;DR</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{guide.tldr}</p>
        </aside>
      ) : null}

      <div className={`${guide.tldr ? "mt-4" : "mt-6"} space-y-4 text-lg leading-relaxed text-muted-foreground`}>
        {guide.intro.map((p, i) => (
          <p key={i}>{renderGuideText(p)}</p>
        ))}
      </div>

      {guide.sections.map((section) => (
        <section key={section.heading} className="mt-10">
          <h2
            id={section.table ? sectionHeadingId(section.heading) : undefined}
            className="text-xl font-semibold tracking-tight"
          >
            {section.heading}
          </h2>
          {section.body.length > 0 && (
            <div className="mt-3 space-y-3 leading-relaxed">
              {section.body.map((p, i) => (
                <p key={i}>{renderGuideText(p)}</p>
              ))}
            </div>
          )}
          {section.table && (
            <div className="mt-4 overflow-x-auto">
              <table
                className="w-full border-collapse text-left text-sm"
                aria-labelledby={sectionHeadingId(section.heading)}
              >
                <thead>
                  <tr className="border-b border-border">
                    {section.table.columns.map((column, index) => (
                      <th key={`${column}-${index}`} scope="col" className="py-2 pr-4 font-semibold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.table.rows.map((row) => (
                    <tr key={row[0]} className="border-b border-border align-top">
                      {row.map((cell, index) =>
                        index === 0 ? (
                          <th key={index} scope="row" className="py-2 pr-4 font-medium">
                            {cell}
                          </th>
                        ) : (
                          <td key={index} className="py-2 pr-4 text-muted-foreground">
                            {cell}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {section.bullets && (
            section.ordered ? (
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                {section.bullets.map((b, index) => (
                  <li key={index} className="pl-1">
                    {renderGuideText(b)}
                  </li>
                ))}
              </ol>
            ) : (
              <ul className="mt-3 space-y-2">
                {section.bullets.map((b, index) => (
                  <li key={b.includes("**") || b.includes("](") ? index : b} className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <span>{renderGuideText(b)}</span>
                  </li>
                ))}
              </ul>
            )
          )}
          {section.closing && section.closing.length > 0 && (
            <div className="mt-3 space-y-3 leading-relaxed">
              {section.closing.map((p, i) => (
                <p key={i}>{renderGuideText(p)}</p>
              ))}
            </div>
          )}
        </section>
      ))}

      {guide.sources && guide.sources.length > 0 && (
        <section aria-labelledby="guide-sources" className="mt-10 border-t border-border pt-6">
          <h2 id="guide-sources" className="text-xl font-semibold tracking-tight">Sources & further reading</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {guide.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-4">
                  {source.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Next step */}
      <div className="mt-10 flex flex-col gap-3 rounded-xl border border-border bg-muted p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">
            {isPlanSelectionGuide
              ? "Compare the plans on your shortlist"
              : isCadenceGuide
                ? "Build a week that fits your running"
                : "Get your personal numbers"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isPlanSelectionGuide
              ? "Compare weekly time, running days and what each plan expects before you start."
              : isCadenceGuide
                ? "Browse plans by distance and starting point, then use cadence only if it helps answer a specific form question."
                : "Training paces, predicted times, and the plans that fit you."}
          </p>
        </div>
        <Link
          href={isPlanSelectionGuide ? "/compare" : isCadenceGuide ? "/plans" : "/calculator"}
          className="shrink-0 rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          {isPlanSelectionGuide
            ? "Compare training plans →"
            : isCadenceGuide
              ? "Explore training plans →"
              : "Open the calculator →"}
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
        <section className="mt-12" data-guide-plans={guide.slug}>
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
