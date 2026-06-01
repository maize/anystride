export type Distance = "5k" | "10k" | "half-marathon" | "marathon" | "ultra";

export type Level = "beginner" | "intermediate" | "advanced";

export type Intensity = "low" | "moderate" | "high";

export type WorkoutType =
  | "rest"
  | "walk-run"
  | "easy"
  | "long"
  | "tempo"
  | "interval"
  | "cross"
  | "race";

export interface Workout {
  type: WorkoutType;
  /** Short label shown in the schedule cell, e.g. "3 mi easy" or "Rest". */
  label: string;
  /** Optional extra guidance shown on hover / detail. */
  note?: string;
}

export interface PlanWeek {
  week: number;
  /** Optional theme for the week, e.g. "Build" or "Taper". */
  focus?: string;
  /** Exactly 7 entries, Monday → Sunday. */
  days: Workout[];
}

export interface TrainingPlan {
  slug: string;
  name: string;
  distance: Distance;
  level: Level;
  durationWeeks: number;
  daysPerWeek: number;
  summary: string;
  /** One-line "start this if you can already…" prerequisite. */
  prerequisite: string;
  /** Rough weekly time commitment, e.g. "1.5–2.5 hrs". */
  timePerWeek: string;
  /** How much hard/fast running the plan asks for. */
  intensity: Intensity;
  /** The biggest session you build up to, e.g. "30-min continuous run". */
  peakWorkout: string;
  /** Short bullets: who this plan is a great fit for. */
  bestFor: string[];
  /** Attribution + link to the community source / methodology. */
  source: { name: string; url: string };
  /** Why the running community recommends this plan. */
  communityNote?: string;
  weeks: PlanWeek[];
}

export const INTENSITY_LABELS: Record<Intensity, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
};

export const DISTANCE_LABELS: Record<Distance, string> = {
  "5k": "5K",
  "10k": "10K",
  "half-marathon": "Half Marathon",
  marathon: "Marathon",
  ultra: "Ultra",
};

export const LEVEL_LABELS: Record<Level, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const WORKOUT_LABELS: Record<WorkoutType, string> = {
  rest: "Rest",
  "walk-run": "Walk/Run",
  easy: "Easy",
  long: "Long",
  tempo: "Tempo",
  interval: "Intervals",
  cross: "Cross-train",
  race: "Race",
};

/** Display order for filters and listings. */
export const DISTANCE_ORDER: Distance[] = [
  "5k",
  "10k",
  "half-marathon",
  "marathon",
  "ultra",
];

export const LEVEL_ORDER: Level[] = ["beginner", "intermediate", "advanced"];
