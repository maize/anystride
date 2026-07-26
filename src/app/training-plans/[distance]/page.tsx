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
    title: `Free ${label} training plans`,
    description: `Free ${label} training plans for every level, with week-by-week schedules. Pick a plan, get your training paces, and start — no login, no paywall.`,
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
        Community-sourced {label} training plans for every level, laid out
        week-by-week. Free to follow — no login, no paywall. Not sure which to
        pick? Compare them, or get your paces from a recent time.
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
