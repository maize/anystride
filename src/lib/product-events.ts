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
  "coach_application_open",
  "coaching_preview_interact",
  "coaching_preview_signup",
  "coaching_category_open",
  "coach_match_open",
  "coach_match_request",
  "coach_contact_click",
  "partnership_enquiry",
  "race_hub_enquiry",
] as const;

export type ProductEvent = (typeof PRODUCT_EVENTS)[number];

/** Classify a saved enquiry without forwarding any of its contents to analytics. */
export function enquiryProductEvent(kind: string, interest: unknown): ProductEvent {
  if (kind === "coach_match") return "coach_match_request";
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
  if (["runner", "coach"].includes(String(input.preview_role))) safe.preview_role = String(input.preview_role);
  if (["switch-role", "screen", "workout", "athlete-calendar"].includes(String(input.preview_action))) safe.preview_action = String(input.preview_action);
  if (["beginners", "half-marathon", "marathon"].includes(String(input.coaching_focus))) safe.coaching_focus = String(input.coaching_focus);
  return safe;
}
