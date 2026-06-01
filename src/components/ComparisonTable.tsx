import Link from "next/link";
import type { TrainingPlan } from "@/data/types";
import { DISTANCE_LABELS, LEVEL_LABELS } from "@/data/types";
import { IntensityMeter } from "./Badge";

/**
 * Scannable, plan-per-row comparison so the differences between plans are easy to
 * digest at a glance. Scrolls horizontally on small screens.
 */
export function ComparisonTable({ plans }: { plans: TrainingPlan[] }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-3 pr-4 font-medium">Plan</th>
            <th className="py-3 pr-4 font-medium">Distance</th>
            <th className="py-3 pr-4 font-medium">Level</th>
            <th className="py-3 pr-4 font-medium">Length</th>
            <th className="py-3 pr-4 font-medium">Time / week</th>
            <th className="py-3 pr-4 font-medium">Intensity</th>
            <th className="py-3 pr-4 font-medium">Start if you can…</th>
            <th className="py-3 pr-4 font-medium">Builds up to</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr
              key={plan.slug}
              className="border-b border-border align-top transition hover:bg-muted/60"
            >
              <td className="py-4 pr-4">
                <Link
                  href={`/plans/${plan.slug}`}
                  className="font-semibold hover:text-brand"
                >
                  {plan.name}
                </Link>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {plan.daysPerWeek} days / week
                </span>
              </td>
              <td className="py-4 pr-4">{DISTANCE_LABELS[plan.distance]}</td>
              <td className="py-4 pr-4">{LEVEL_LABELS[plan.level]}</td>
              <td className="py-4 pr-4 whitespace-nowrap">
                {plan.durationWeeks} weeks
              </td>
              <td className="py-4 pr-4 whitespace-nowrap">{plan.timePerWeek}</td>
              <td className="py-4 pr-4">
                <IntensityMeter intensity={plan.intensity} />
              </td>
              <td className="py-4 pr-4 text-muted-foreground">
                {plan.prerequisite}
              </td>
              <td className="py-4 pr-4 text-muted-foreground">
                {plan.peakWorkout}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
