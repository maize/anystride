import { PLANS } from "@/data/plans";
import {
  DISTANCE_ORDER,
  LEVEL_ORDER,
  type Distance,
  type Level,
  type TrainingPlan,
} from "@/data/types";

export function getAllPlans(): TrainingPlan[] {
  return [...PLANS].sort((a, b) => {
    const d = DISTANCE_ORDER.indexOf(a.distance) - DISTANCE_ORDER.indexOf(b.distance);
    if (d !== 0) return d;
    return LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level);
  });
}

export function getPlanBySlug(slug: string): TrainingPlan | undefined {
  return PLANS.find((p) => p.slug === slug);
}

export function filterPlans(opts: {
  distance?: Distance;
  level?: Level;
}): TrainingPlan[] {
  return getAllPlans().filter(
    (p) =>
      (!opts.distance || p.distance === opts.distance) &&
      (!opts.level || p.level === opts.level),
  );
}

/** Distances that currently have at least one plan. */
export function availableDistances(): Distance[] {
  const present = new Set(PLANS.map((p) => p.distance));
  return DISTANCE_ORDER.filter((d) => present.has(d));
}
