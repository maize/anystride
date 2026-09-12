/** Stable event names shared by the browser and the weekly GA report. */
export const PRODUCT_EVENTS = [
  "plan_finder_complete",
  "plan_activated",
  "plan_resume",
  "workout_complete",
  "plan_calendar_download",
  "plan_print",
  "race_source_click",
  "guide_plan_click",
] as const;

export type ProductEvent = (typeof PRODUCT_EVENTS)[number];

/** Only public content identifiers; never pass dates, times, mileage or form data. */
export function productEventParameters(input: Record<string, unknown>) {
  const safe: Record<string, string> = {};
  for (const key of ["plan_slug", "race_slug", "guide_slug", "link_kind"]) {
    const value = input[key];
    if (typeof value === "string" && /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(value) && value.length <= 100) {
      safe[key] = value;
    }
  }
  return safe;
}
