import Link from "next/link";
import type { TrainingPlan } from "@/data/types";
import { DistanceBadge, LevelBadge } from "./Badge";

export function PlanCard({ plan }: { plan: TrainingPlan }) {
  return (
    <Link
      href={`/plans/${plan.slug}`}
      className="group flex flex-col rounded-xl border border-border p-5 transition hover:border-brand hover:shadow-sm"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <DistanceBadge distance={plan.distance} />
        <LevelBadge level={plan.level} />
      </div>
      <h3 className="text-lg font-semibold tracking-tight group-hover:text-brand">
        {plan.name}
      </h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{plan.summary}</p>
      <p className="mt-4 text-xs font-medium text-muted-foreground">
        {plan.durationWeeks} weeks · {plan.daysPerWeek} days/week
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {plan.kind === "full"
          ? "✓ Full schedule included"
          : "↗ Guide + link to official plan"}
      </p>
    </Link>
  );
}
