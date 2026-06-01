import type { Distance, TrainingPlan } from "@/data/types";
import { getAllPlans } from "./plans";

export interface RecommendInput {
  /** Goal race distance. */
  distance: Distance;
  /** Current typical weekly mileage. */
  weeklyMileage: number;
}

export interface PlanRecommendation {
  plan: TrainingPlan;
  /** "ready" = your mileage fits; "stretch" = a bit below the start; "build" = need a base first. */
  fit: "ready" | "stretch" | "build";
  reason: string;
}

/**
 * Recommend plans for a goal distance, ranked by how well the runner's current
 * weekly mileage matches each plan's starting volume. Transparent, rule-based —
 * no black box.
 */
export function recommendPlans(input: RecommendInput): PlanRecommendation[] {
  const { distance, weeklyMileage } = input;
  const candidates = getAllPlans().filter((p) => p.distance === distance);

  const scored = candidates.map((plan) => {
    const start = plan.weeklyVolume.start;
    let fit: PlanRecommendation["fit"];
    let reason: string;

    if (weeklyMileage >= start) {
      fit = "ready";
      reason = `You're running ~${weeklyMileage} mpw and this starts around ${start} mpw — you can begin comfortably.`;
    } else if (weeklyMileage >= start * 0.7) {
      fit = "stretch";
      reason = `Starts around ${start} mpw; you're at ~${weeklyMileage}. Doable, but ease into the first couple of weeks.`;
    } else {
      fit = "build";
      reason = `Starts around ${start} mpw — build your base toward that first, then come back to this plan.`;
    }

    // Rank: ready plans first, then by how close start volume is to current.
    const fitRank = fit === "ready" ? 0 : fit === "stretch" ? 1 : 2;
    const distanceFromStart = Math.abs(start - weeklyMileage);
    return { plan, fit, reason, fitRank, distanceFromStart };
  });

  scored.sort(
    (a, b) => a.fitRank - b.fitRank || a.distanceFromStart - b.distanceFromStart,
  );

  return scored.map(({ plan, fit, reason }) => ({ plan, fit, reason }));
}
