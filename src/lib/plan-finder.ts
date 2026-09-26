import type { Distance, Level, TrainingPlan } from "@/data/types";

export type FinderDistance = Exclude<Distance, "ultra">;
export type WeeklyBase =
  | "not-running"
  | "under-10"
  | "10-to-19"
  | "20-to-34"
  | "35-plus";

export interface PlanFinderCandidate {
  slug: string;
  name: string;
  distance: Distance;
  level: Level;
  durationWeeks: number;
  daysPerWeek: number;
  summary: string;
  prerequisite: string;
  weeklyVolume: TrainingPlan["weeklyVolume"];
  kind: TrainingPlan["kind"];
}

export interface PlanFinderAnswers {
  distance: FinderDistance;
  weeklyBase: WeeklyBase;
  availableDays: number;
}

export interface PlanFinderMatch {
  plan: PlanFinderCandidate;
  reasons: string[];
  hasConstraint: boolean;
}

export interface PlanFinderResult {
  primary: PlanFinderMatch;
  alternatives: PlanFinderMatch[];
}

export const FINDER_DISTANCES: FinderDistance[] = [
  "5k",
  "10k",
  "half-marathon",
  "marathon",
];

export const WEEKLY_BASE_OPTIONS: Array<{
  value: WeeklyBase;
  label: string;
  detail: string;
}> = [
  {
    value: "not-running",
    label: "Starting from zero",
    detail: "I do not run most weeks",
  },
  { value: "under-10", label: "Under 10 miles", detail: "Under 16 km" },
  { value: "10-to-19", label: "10 to 19 miles", detail: "16 to 31 km" },
  { value: "20-to-34", label: "20 to 34 miles", detail: "32 to 55 km" },
  { value: "35-plus", label: "35 miles or more", detail: "56 km or more" },
];

const BASE_RANGES: Record<
  WeeklyBase,
  { minimum: number; maximum: number }
> = {
  "not-running": { minimum: 0, maximum: 0 },
  "under-10": { minimum: 1, maximum: 9 },
  "10-to-19": { minimum: 10, maximum: 19 },
  "20-to-34": { minimum: 20, maximum: 34 },
  "35-plus": { minimum: 35, maximum: Number.POSITIVE_INFINITY },
};

export function toPlanFinderCandidate(
  plan: TrainingPlan,
): PlanFinderCandidate {
  return {
    slug: plan.slug,
    name: plan.name,
    distance: plan.distance,
    level: plan.level,
    durationWeeks: plan.durationWeeks,
    daysPerWeek: plan.daysPerWeek,
    summary: plan.summary,
    prerequisite: plan.prerequisite,
    weeklyVolume: plan.weeklyVolume,
    kind: plan.kind,
  };
}

function scoreMileage(
  plan: PlanFinderCandidate,
  weeklyBase: WeeklyBase,
): number {
  if (weeklyBase === "not-running") {
    return plan.slug === "couch-to-5k"
      ? 48
      : 4 - plan.weeklyVolume.start * 3;
  }

  const range = BASE_RANGES[weeklyBase];
  const start = plan.weeklyVolume.start;

  if (start >= range.minimum && start <= range.maximum) return 28;
  if (start < range.minimum) {
    return Math.max(8, 22 - (range.minimum - start) * 0.5);
  }
  return Math.max(-20, 12 - (start - range.maximum) * 3);
}

function scoreDays(plan: PlanFinderCandidate, availableDays: number): number {
  const difference = availableDays - plan.daysPerWeek;
  if (difference === 0) return 24;
  if (difference === 1) return 18;
  if (difference > 1) return 12;
  if (difference === -1) return -18;
  return -35;
}

function explainMatch(
  plan: PlanFinderCandidate,
  answers: PlanFinderAnswers,
): PlanFinderMatch {
  const reasons: string[] = [];
  const range = BASE_RANGES[answers.weeklyBase];
  const start = plan.weeklyVolume.start;
  let hasConstraint = false;

  if (answers.weeklyBase === "not-running" && plan.slug === "couch-to-5k") {
    reasons.push(
      "It starts with walk and run intervals, so you do not need a running base.",
    );
  } else if (start >= range.minimum && start <= range.maximum) {
    reasons.push(
      `Its opening week of about ${start} miles sits inside your current range.`,
    );
  } else if (start < range.minimum) {
    reasons.push(
      `Its opening week of about ${start} miles stays below your current base.`,
    );
  } else {
    hasConstraint = true;
    reasons.push(
      `It starts near ${start} miles per week, so build toward that volume first.`,
    );
  }

  if (plan.daysPerWeek === answers.availableDays) {
    reasons.push(`${plan.daysPerWeek} running days match the time you have.`);
  } else if (plan.daysPerWeek < answers.availableDays) {
    reasons.push(
      `${plan.daysPerWeek} running days fit within the ${answers.availableDays} you can protect.`,
    );
  } else {
    const difference = plan.daysPerWeek - answers.availableDays;
    hasConstraint = true;
    reasons.push(
      `It asks for ${plan.daysPerWeek} running days, ${difference} more than you selected.`,
    );
  }

  reasons.push(
    plan.kind === "full"
      ? "The complete week by week schedule is included on Anystride."
      : "Anystride explains the method and links to the official schedule.",
  );

  return { plan, reasons, hasConstraint };
}

export function findPlans(
  candidates: PlanFinderCandidate[],
  answers: PlanFinderAnswers,
): PlanFinderResult | null {
  const ranked = candidates
    .filter((plan) => plan.distance === answers.distance)
    .map((plan) => ({
      plan,
      score:
        scoreMileage(plan, answers.weeklyBase) +
        scoreDays(plan, answers.availableDays) +
        (plan.kind === "full" ? 5 : 0),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.plan.weeklyVolume.start - b.plan.weeklyVolume.start,
    );

  const [primary, ...alternatives] = ranked;
  if (!primary) return null;

  return {
    primary: explainMatch(primary.plan, answers),
    alternatives: alternatives
      .slice(0, 2)
      .map(({ plan }) => explainMatch(plan, answers)),
  };
}
