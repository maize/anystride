import Link from "next/link";
import type { TrainingPlan } from "@/data/types";
import { DISTANCE_LABELS, LEVEL_LABELS } from "@/data/types";

export function PlanCard({ plan }: { plan: TrainingPlan }) {
  return (
    <Link
      href={`/plans/${plan.slug}`}
      className="group flex h-full flex-col rounded-2xl bg-muted p-6 transition-all duration-300 ease-stride hover:-translate-y-1 hover:ring-1 hover:ring-border"
    >
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <span className="text-3xl font-semibold tracking-tighter text-brand">{DISTANCE_LABELS[plan.distance]}</span>
        <span className="rounded-md bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
          {plan.kind === "full" ? "Complete schedule" : "Method overview"}
        </span>
      </div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{LEVEL_LABELS[plan.level]}</p>
      <h3 className="text-2xl font-semibold tracking-tight transition-colors duration-300 ease-stride group-hover:text-brand">
        {plan.name}
      </h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{plan.summary}</p>
      <div className="mt-8 flex items-end justify-between gap-4 border-t border-border pt-4">
        <p className="text-sm font-medium tabular-nums">{plan.durationWeeks} weeks <span className="mx-1 text-muted-foreground">/</span> {plan.daysPerWeek} days a week</p>
        <span aria-hidden="true" className="text-xl transition-transform duration-300 ease-stride group-hover:translate-x-1">↗</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{plan.kind === "full" ? "Start, save and follow it here" : "Read the method and find its official source"}</p>
    </Link>
  );
}
