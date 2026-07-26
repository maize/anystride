import Link from "next/link";
import type { TrainingPlan } from "@/data/types";
import { DistanceBadge, LevelBadge } from "./Badge";

export function PlanCard({ plan }: { plan: TrainingPlan }) {
  return (
    <Link
      href={`/plans/${plan.slug}`}
      className="group flex h-full flex-col rounded-xl border border-border p-5 transition-all duration-300 ease-stride hover:-translate-y-0.5 hover:border-brand"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <DistanceBadge distance={plan.distance} />
        <LevelBadge level={plan.level} />
      </div>
      <h3 className="text-lg font-semibold tracking-tight transition-colors duration-300 ease-stride group-hover:text-brand">
        {plan.name}
      </h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{plan.summary}</p>
      <p className="mt-4 text-xs font-medium text-muted-foreground">
        {plan.durationWeeks} weeks · {plan.daysPerWeek} days/week
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            plan.kind === "full" ? "bg-brand" : "border border-muted-foreground"
          }`}
        />
        {plan.kind === "full"
          ? "Full schedule included"
          : "Guide plus link to the official plan"}
      </p>
    </Link>
  );
}
