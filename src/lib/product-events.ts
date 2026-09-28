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
  "coach_match_open",
  "coach_match_request",
  "coach_contact_click",
  "partnership_enquiry",
  "clinic_interest",
  "race_hub_enquiry",
] as const;

export type ProductEvent = (typeof PRODUCT_EVENTS)[number];

/** Classify a saved enquiry without forwarding any of its contents to analytics. */
export function enquiryProductEvent(kind: string, interest: unknown): ProductEvent {
  if (kind === "coach_match") return "coach_match_request";
  if (interest === "clinic_attend" || interest === "clinic_host") return "clinic_interest";
  if (interest === "race_hub") return "race_hub_enquiry";
  return "partnership_enquiry";
}

/** Only public content identifiers; never pass dates, times, mileage or form data. */
export function productEventParameters(input: Record<string, unknown>) {
  const safe: Record<string, string> = {};
  for (const key of ["plan_slug", "race_slug", "guide_slug", "coach_slug", "link_kind"]) {
    const value = input[key];
    if (typeof value === "string" && /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(value) && value.length <= 100) {
      safe[key] = value;
    }
  }
  return safe;
}
