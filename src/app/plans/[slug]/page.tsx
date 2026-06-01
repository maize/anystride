import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPlans, getPlanBySlug } from "@/lib/plans";
import { DistanceBadge, LevelBadge, IntensityMeter } from "@/components/Badge";
import { WeekTable } from "@/components/WeekTable";

export function generateStaticParams() {
  return getAllPlans().map((plan) => ({ slug: plan.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/plans/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const plan = getPlanBySlug(slug);
  if (!plan) return { title: "Plan not found" };
  return {
    title: plan.name,
    description: plan.summary,
  };
}

export default async function PlanPage({ params }: PageProps<"/plans/[slug]">) {
  const { slug } = await params;
  const plan = getPlanBySlug(slug);
  if (!plan) notFound();

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <Link
        href="/plans"
        className="text-sm font-medium text-muted-foreground hover:text-brand"
      >
        ← All plans
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-wrap gap-2">
        <DistanceBadge distance={plan.distance} />
        <LevelBadge level={plan.level} />
      </div>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        {plan.name}
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        {plan.summary}
      </p>

      {/* At a glance */}
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

      {/* Best for */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Best for
        </h2>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-3">
          {plan.bestFor.map((item) => (
            <li key={item} className="flex gap-2 text-sm">
              <span className="text-brand">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {plan.communityNote && (
        <div className="mt-6 rounded-xl border border-border bg-muted p-4 text-sm">
          <p className="font-semibold">Why the community recommends this</p>
          <p className="mt-1 text-muted-foreground">{plan.communityNote}</p>
        </div>
      )}

      {/* Personalize CTA */}
      <div className="mt-8 flex flex-col gap-3 rounded-xl border border-border bg-muted p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Run this plan at the right paces</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Get your easy, tempo, and interval paces from a recent time or goal.
          </p>
        </div>
        <Link
          href="/calculator"
          className="shrink-0 rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          Find my paces →
        </Link>
      </div>

      {/* Schedule (full plans) or structure overview (explainers) */}
      {plan.kind === "full" && plan.weeks ? (
        <>
          <h2 className="mt-10 text-xl font-semibold tracking-tight">
            The plan, week by week
          </h2>
          <div className="mt-4 space-y-4">
            {plan.weeks.map((week) => (
              <WeekTable key={week.week} week={week} />
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 className="mt-10 text-xl font-semibold tracking-tight">
            How the plan is structured
          </h2>
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
                    {plan.pros.map((p) => (
                      <li key={p} className="flex gap-2">
                        <span className="text-emerald-600">+</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {plan.cons && (
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-semibold">Trade-offs</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                    {plan.cons.map((c) => (
                      <li key={c} className="flex gap-2">
                        <span className="text-amber-600">−</span>
                        {c}
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
      )}

      {/* Disclaimer */}
      <p className="mt-10 text-xs text-muted-foreground">
        anystride plans are educational summaries of community-trusted training
        methodologies, not medical or individualized coaching advice. Listen to
        your body, and consult a doctor before starting a new program.
      </p>
    </div>
  );
}
