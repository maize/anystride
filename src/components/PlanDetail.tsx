import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlanBySlug } from "@/lib/plans";
import { DistanceBadge, LevelBadge, IntensityMeter } from "@/components/Badge";
import { PlanExperience } from "@/components/PlanExperience";
import { JsonLd } from "@/components/JsonLd";
import {
  faqPageSchema,
  planPageCopy,
  type TextPart,
} from "@/lib/plan-page-intent";

export async function PlanDetail({ params, basePath = "/plans" }: { params: Promise<{ slug: string }>; basePath?: string }) {
  const { slug } = await params;
  const plan = getPlanBySlug(slug);
  if (!plan) notFound();
  const copy = planPageCopy(plan);

  return (
    <div className={basePath === "/plans" ? "mx-auto max-w-5xl px-5 py-12" : ""}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Plans",
              item: "https://anystride.com/plans",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: copy.heading,
              item: `https://anystride.com/plans/${plan.slug}`,
            },
          ],
        }}
      />
      <JsonLd data={faqPageSchema(copy.faqs)} />
      <Link
        href={basePath}
        className="text-sm font-medium text-muted-foreground hover:text-brand"
      >
        ← All plans
      </Link>

      <div className="mt-4 flex flex-wrap gap-2">
        <DistanceBadge distance={plan.distance} />
        <LevelBadge level={plan.level} />
      </div>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        {copy.heading}
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        {plan.summary}
      </p>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        <PlanCopy parts={copy.affiliation} />
      </p>
      <PlanComparisonLink slug={plan.slug} />

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-border p-5 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Duration</dt>
          <dd className="mt-0.5 font-semibold">{plan.durationWeeks} weeks</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Frequency</dt>
          <dd className="mt-0.5 font-semibold">{plan.daysPerWeek} days / week</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Time / week</dt>
          <dd className="mt-0.5 font-semibold">{plan.timePerWeek}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Intensity</dt>
          <dd className="mt-0.5">
            <IntensityMeter intensity={plan.intensity} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Start if you can…</dt>
          <dd className="mt-0.5 font-semibold">{plan.prerequisite}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Builds up to</dt>
          <dd className="mt-0.5 font-semibold">{plan.peakWorkout}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">Source</dt>
          <dd className="mt-0.5 font-semibold">
            <a
              href={plan.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline"
            >
              {plan.source.name} ↗
            </a>
          </dd>
        </div>
      </dl>

      {copy.sections.map((section) => (
        <section key={section.id} className="mt-8" aria-labelledby={section.id}>
          <h2 id={section.id} className="text-xl font-semibold tracking-tight">
            {section.heading}
          </h2>
          <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">
            <PlanCopy parts={section.answer} />
          </p>
          {section.id === "who" && (
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-3">
              {plan.bestFor.map((item) => (
                <li key={item} className="flex gap-2 text-sm">
                  <span className="text-brand">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          )}
          {section.id === "paces" && (
            <Link
              href="/calculator"
              className="mt-4 inline-flex rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
            >
              Find my paces →
            </Link>
          )}
        </section>
      ))}

      {plan.communityNote && (
        <div className="mt-6 rounded-xl border border-border bg-muted p-4 text-sm">
          <p className="font-semibold">Why the community recommends this</p>
          <p className="mt-1 text-muted-foreground">{plan.communityNote}</p>
        </div>
      )}

      {plan.kind === "full" && plan.weeks && copy.schedule ? (
        <PlanExperience
          plan={{
            slug: plan.slug,
            name: plan.name,
            durationWeeks: plan.durationWeeks,
            weeks: plan.weeks,
          }}
          scheduleHeading={copy.schedule.heading}
          scheduleIntro={copy.schedule.intro}
        />
      ) : (
        copy.structure && (
          <>
            <h2 className="mt-10 text-xl font-semibold tracking-tight">
              {copy.structure.heading}
            </h2>
            <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">
              <PlanCopy parts={copy.structure.answer} />
            </p>
            {plan.outline && (
              <ul className="mt-4 space-y-2">
                {plan.outline.map((line) => (
                  <li key={line} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}

            {(plan.pros || plan.cons) && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {plan.pros && (
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-sm font-semibold">Strengths</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                      {plan.pros.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="text-emerald-600">+</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {plan.cons && (
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-sm font-semibold">Trade-offs</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                      {plan.cons.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="text-amber-600">−</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <a
              href={plan.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex rounded-full border border-border px-5 py-2 text-sm font-medium hover:border-brand hover:text-brand"
            >
              View the full {plan.name} schedule at {plan.source.name} ↗
            </a>
            <p className="mt-3 text-xs text-muted-foreground">
              We summarize this popular plan and link to the original rather than
              reproduce its copyrighted week-by-week schedule.
            </p>
          </>
        )
      )}

      <section className="mt-10" aria-labelledby="plan-faq">
        <h2 id="plan-faq" className="text-xl font-semibold tracking-tight">
          Frequently asked questions
        </h2>
        <div className="mt-4 divide-y divide-border border-y border-border">
          {copy.faqs.map((faq) => (
            <div key={faq.question} className="py-4">
              <h3 className="text-base font-semibold">{faq.question}</h3>
              <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">
                <PlanCopy parts={faq.answer} />
              </p>
            </div>
          ))}
        </div>
      </section>

      {basePath === "/plans" && (
        <section className="mt-10 border-t border-border pt-8">
          <h2 className="text-2xl font-semibold">What if I need help adapting this plan?</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            A free plan gives you a schedule. If your availability or goals change, a coach can help you decide what to adjust. Ask what individual review and communication their service includes.
          </p>
          <div className="mt-4 flex flex-wrap gap-6">
            <Link
              href={plan.distance === "half-marathon" ? "/coaching/focus/half-marathon" : plan.distance === "marathon" ? "/coaching/focus/marathon" : plan.level === "beginner" ? "/coaching/focus/beginners" : "/coaches"}
              className="action-link"
            >
              Explore relevant coaches →
            </Link>
            <Link href="/#account-preview" className="action-link">Preview coached training →</Link>
          </div>
        </section>
      )}

      <p className="mt-10 text-xs text-muted-foreground">
        anystride plans are educational summaries of community-trusted training
        methodologies, not medical or individualized coaching advice. Listen to
        your body, and consult a doctor before starting a new program.
      </p>
    </div>
  );
}

function PlanComparisonLink({ slug }: { slug: string }) {
  if (slug === "pfitzinger-18-55") {
    return (
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Comparing it with Hansons? See{" "}
        <Link
          href="/compare/pfitz-18-55-vs-hansons"
          className="font-medium text-brand underline underline-offset-2"
        >
          Pfitz 18/55 vs Hansons
        </Link>
        .
      </p>
    );
  }
  if (slug === "hansons-marathon-method") {
    return (
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Comparing it with Pfitz 18/55? See{" "}
        <Link
          href="/compare/pfitz-18-55-vs-hansons"
          className="font-medium text-brand underline underline-offset-2"
        >
          Hansons vs Pfitz 18/55
        </Link>
        .
      </p>
    );
  }
  return null;
}

function PlanCopy({ parts }: { parts: TextPart[] }) {
  return (
    <>
      {parts.map((part, index) =>
        typeof part === "string" ? (
          <span key={index}>{part}</span>
        ) : part.href.startsWith("/") ? (
          <Link
            key={index}
            href={part.href}
            className="font-medium text-brand underline underline-offset-2"
          >
            {part.label}
          </Link>
        ) : (
          <a
            key={index}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand underline underline-offset-2"
          >
            {part.label}
          </a>
        ),
      )}
    </>
  );
}
