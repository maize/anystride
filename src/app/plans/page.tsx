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
  alternates: { canonical: "/plans" },
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
      aria-current={active ? "true" : undefined}
      scroll={false}
      className={
        active
          ? "rounded-lg bg-foreground px-4 py-3 text-sm font-semibold text-background"
          : "rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-stride hover:bg-muted hover:text-foreground"
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
      <div className="flex flex-wrap items-end justify-between gap-8">
        <div>
          <h1 className="text-hero-gradient text-3xl font-bold tracking-tight">Training plans</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Compare complete schedules and trusted training methods by distance
            and experience level.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/#plan-finder"
            className="action-primary"
          >
            Get matched to a plan
          </Link>
          <Link
            href="/compare"
            className="action-link px-4"
          >
            Compare side by side →
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-12 space-y-4 border-y border-border py-6">
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
      <div className="mt-8">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold">{distance ? `${DISTANCE_LABELS[distance]} plans` : "Explore the plans"}</h2>
          <p className="text-sm text-muted-foreground tabular-nums">{plans.length} {plans.length === 1 ? "plan" : "plans"}{(distance || level) && <> · <Link href="/plans" className="hover:text-foreground hover:underline">Clear filters</Link></>}</p>
        </div>
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
