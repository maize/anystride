/**
 * Anonymous start-CTA experiment.
 * Add a slug to enroll another plan page later. Do not put visitor data in the variant.
 */
export const PLAN_START_EXPERIMENT_ID = "plan_start_cta" as const;
export const PLAN_EXPERIMENT_STORAGE_KEY = "anystride:experiment:plan_start_cta";
export const PLAN_EXPERIMENT_COOKIE = "anystride_xv";
export const PLAN_EXPERIMENT_MAX_AGE = 15_552_000;

export const PLAN_START_EXPERIMENT_SLUGS = ["pfitzinger-18-55"] as const;

export const PLAN_EXPERIMENT_VARIANTS = ["control", "treatment"] as const;
export type PlanExperimentVariant = (typeof PLAN_EXPERIMENT_VARIANTS)[number];

const ENROLLED = new Set<string>(PLAN_START_EXPERIMENT_SLUGS);

export function planExperimentEnabled(slug: string) {
  return ENROLLED.has(slug);
}

export interface PlanAlternative {
  href: string;
  label: string;
}

/** Secondary next step for visitors who are not going to start this plan. */
export function planExperimentAlternatives(slug: string): PlanAlternative[] {
  if (slug === "pfitzinger-18-55") {
    return [
      { href: "/plans/higdon-marathon-novice-1", label: "Hal Higdon Marathon Novice 1" },
      { href: "/plans/hansons-marathon-method", label: "Hansons Marathon Method" },
      { href: "/coaching/focus/marathon", label: "Marathon coaches" },
    ];
  }
  return [{ href: "/coaches", label: "Find a coach" }];
}

export function planStartModuleCopy(kind: "full" | "explainer", durationWeeks: number) {
  if (kind === "full") {
    return "Set a start date on this page. You can then download the calendar and keep progress in this browser. No account is required.";
  }
  const weeks = Number.isInteger(durationWeeks) && durationWeeks > 0 ? durationWeeks : 0;
  return `Pick the date week 1 begins. Anystride saves it in this browser. You can then download a ${weeks}-week calendar of week markers. Daily workouts from the book are not included.`;
}

export function parsePlanExperimentVariant(value: string | null | undefined): PlanExperimentVariant | null {
  if (value === "control" || value === "treatment") return value;
  if (value === "plan_start_cta.control") return "control";
  if (value === "plan_start_cta.treatment") return "treatment";
  return null;
}

export function planExperimentCookieValue(variant: PlanExperimentVariant) {
  return variant === "treatment" ? "plan_start_cta.treatment" : "plan_start_cta.control";
}

/** Uniform draw on [0, 1). Values outside that range stay on control. */
export function assignPlanExperimentVariant(randomUnit: number): PlanExperimentVariant {
  if (!Number.isFinite(randomUnit) || randomUnit < 0 || randomUnit >= 1) return "control";
  return randomUnit < 0.5 ? "control" : "treatment";
}

export function randomUnitInterval() {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] / 4294967296;
  }
  return Math.random();
}

/** Public slug plus the experiment enum. Dates, mileage and contact fields are not accepted here. */
export function planActivationParameters(slug: string, variant: PlanExperimentVariant | null) {
  const params: Record<string, string> = { plan_slug: slug };
  if (variant && planExperimentEnabled(slug)) {
    params.experiment = PLAN_START_EXPERIMENT_ID;
    params.variant = variant;
  }
  return params;
}

export interface ExperimentPersistence {
  getLocal: () => string | null;
  setLocal: (value: string) => void;
  getCookie: () => string | null;
  setCookie: (value: string) => void;
}

/**
 * Local storage wins when both are present, so the assignment stays stable.
 * The stored strings are only `control` or `treatment` (cookie uses the experiment prefix).
 */
export function resolvePlanExperimentVariant(
  storage: ExperimentPersistence,
  randomUnit: number,
): PlanExperimentVariant {
  const variant = parsePlanExperimentVariant(storage.getLocal())
    ?? parsePlanExperimentVariant(storage.getCookie())
    ?? assignPlanExperimentVariant(randomUnit);
  storage.setLocal(variant);
  storage.setCookie(planExperimentCookieValue(variant));
  return variant;
}
