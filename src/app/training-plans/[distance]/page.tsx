import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPlans, filterPlans } from "@/lib/plans";
import { getAllGuides } from "@/lib/guides";
import { PlanCard } from "@/components/PlanCard";
import { JsonLd } from "@/components/JsonLd";
import {
  DISTANCE_LABELS,
  DISTANCE_ORDER,
  type Distance,
} from "@/data/types";

function distancesWithPlans(): Distance[] {
  const present = new Set(getAllPlans().map((p) => p.distance));
  return DISTANCE_ORDER.filter((d) => present.has(d));
}

export function generateStaticParams() {
  return distancesWithPlans().map((distance) => ({ distance }));
}

function isDistance(v: string): v is Distance {
  return (DISTANCE_ORDER as string[]).includes(v);
}

export async function generateMetadata({
  params,
}: PageProps<"/training-plans/[distance]">): Promise<Metadata> {
  const { distance } = await params;
  if (!isDistance(distance)) return { title: "Plans not found" };
  const label = DISTANCE_LABELS[distance];
  return {
    title: distance === "5k" ? "Free 5K training plans: Couch to 5K and more" : `Free ${label} training plans`,
    description: distance === "5k"
      ? "Compare a 9-week Couch to 5K schedule, a 4-week base-building plan and a Hal Higdon 5K overview. Choose by experience and weekly commitment."
      : `Compare ${label} training schedules and method overviews by experience, plan length and training days. See which plans you can follow here and find official sources.`,
    alternates: { canonical: `/training-plans/${distance}` },
  };
}

export default async function DistanceHubPage({
  params,
}: PageProps<"/training-plans/[distance]">) {
  const { distance } = await params;
  if (!isDistance(distance)) notFound();

  const plans = filterPlans({ distance });
  if (plans.length === 0) notFound();

  const label = DISTANCE_LABELS[distance];
  const planSlugs = new Set(plans.map((p) => p.slug));
  const guides = getAllGuides().filter((g) =>
    (g.relatedPlans ?? []).some((s) => planSlugs.has(s)),
  );
  const url = `https://anystride.com/training-plans/${distance}`;

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Free ${label} training plans`,
          url,
        }}
      />

      <h1 className="text-hero-gradient text-3xl font-bold tracking-tight sm:text-4xl">
        Free {label} training plans
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Compare {label} plans by your starting point, the number of weeks and
        the days you can train. Complete schedules are free to follow here.
        Method overviews explain a plan and link to its official source.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/compare"
          className="rounded-full border border-border px-5 py-2 text-sm font-medium transition-all duration-300 ease-stride hover:border-brand active:scale-[0.98]"
        >
          Compare plans
        </Link>
        <Link
          href="/calculator"
          className="rounded-full border border-border px-5 py-2 text-sm font-medium transition-all duration-300 ease-stride hover:border-brand active:scale-[0.98]"
        >
          Find my paces
        </Link>
      </div>

      {distance === "5k" && <section aria-labelledby="choose-5k-plan" className="mt-10 border-t border-border pt-8">
        <h2 id="choose-5k-plan" className="text-xl font-semibold">Which 5K plan fits your starting point?</h2>
        <div className="mt-4 max-w-3xl space-y-4 text-muted-foreground">
          <p><Link href="/plans/couch-to-5k" className="font-medium text-brand underline underline-offset-4">Couch to 5K</Link> has a complete nine-week run/walk schedule with three sessions a week. It starts with short running intervals and builds toward 30 minutes of continuous running; the distance you cover depends on your pace.</p>
          <p><Link href="/plans/base-building-4-week" className="font-medium text-brand underline underline-offset-4">Base Building</Link> is a four-week block for runners who can already jog for 20–30 minutes. It focuses on a regular easy-running routine before a race-specific plan.</p>
          <p><Link href="/plans/higdon-5k-intermediate" className="font-medium text-brand underline underline-offset-4">Hal Higdon’s 5K Intermediate overview</Link> describes an eight-week, five-day-a-week option for runners who can already finish a 5K. Read the method here, then use the linked official source for the full schedule.</p>
        </div>
      </section>}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.slug} plan={plan} />
        ))}
      </div>

      {guides.length > 0 && (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="text-xl font-semibold tracking-tight">
            {label} training guides
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {guides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="group rounded-xl border border-border p-5 transition-all duration-300 ease-stride hover:-translate-y-0.5 hover:border-brand"
              >
                <h3 className="font-semibold transition-colors duration-300 ease-stride group-hover:text-brand">
                  {guide.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {guide.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
