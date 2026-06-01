import Link from "next/link";
import type { Metadata } from "next";
import { filterPlans } from "@/lib/plans";
import { PlanCard } from "@/components/PlanCard";
import {
  DISTANCE_LABELS,
  DISTANCE_ORDER,
  LEVEL_LABELS,
  LEVEL_ORDER,
  type Distance,
  type Level,
} from "@/data/types";

export const metadata: Metadata = {
  title: "Browse training plans",
  description:
    "Browse free running training plans by distance and experience level.",
};

function isDistance(v: string | undefined): v is Distance {
  return !!v && (DISTANCE_ORDER as string[]).includes(v);
}
function isLevel(v: string | undefined): v is Level {
  return !!v && (LEVEL_ORDER as string[]).includes(v);
}

function buildHref(next: { distance?: string; level?: string }): string {
  const params = new URLSearchParams();
  if (next.distance) params.set("distance", next.distance);
  if (next.level) params.set("level", next.level);
  const qs = params.toString();
  return qs ? `/plans?${qs}` : "/plans";
}

function FilterChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-brand-foreground"
          : "rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:border-brand"
      }
    >
      {label}
    </Link>
  );
}

export default async function PlansPage({
  searchParams,
}: PageProps<"/plans">) {
  const sp = await searchParams;
  const rawDistance = Array.isArray(sp.distance) ? sp.distance[0] : sp.distance;
  const rawLevel = Array.isArray(sp.level) ? sp.level[0] : sp.level;
  const distance = isDistance(rawDistance) ? rawDistance : undefined;
  const level = isLevel(rawLevel) ? rawLevel : undefined;

  const plans = filterPlans({ distance, level });

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Training plans</h1>
          <p className="mt-2 text-muted-foreground">
            Free, community-sourced plans. Filter by distance and level.
          </p>
        </div>
        <Link
          href="/compare"
          className="rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:border-brand hover:text-brand"
        >
          Compare side by side →
        </Link>
      </div>

      {/* Filters */}
      <div className="mt-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Distance
          </span>
          <FilterChip label="All" href={buildHref({ level })} active={!distance} />
          {DISTANCE_ORDER.map((d) => (
            <FilterChip
              key={d}
              label={DISTANCE_LABELS[d]}
              href={buildHref({ distance: d, level })}
              active={distance === d}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Level
          </span>
          <FilterChip
            label="All"
            href={buildHref({ distance })}
            active={!level}
          />
          {LEVEL_ORDER.map((l) => (
            <FilterChip
              key={l}
              label={LEVEL_LABELS[l]}
              href={buildHref({ distance, level: l })}
              active={level === l}
            />
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="mt-10">
        {plans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            <p className="font-medium">No plans match yet.</p>
            <p className="mt-1 text-sm">
              We&apos;re adding more plans for this combination soon.{" "}
              <Link href="/plans" className="text-brand hover:underline">
                Clear filters
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.slug} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
