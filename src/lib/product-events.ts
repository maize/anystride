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
  "sign_up_start",
  "sign_up",
  "login",
  "sign_up_abandon",
  "coach_storefront_start",
  "coach_storefront_step",
  "coach_storefront_publish",
  "coach_storefront_abandon",
  "view_item",
  "begin_checkout",
  "purchase",
  "checkout_abandon",
] as const;

export type ProductEvent = (typeof PRODUCT_EVENTS)[number];

export const PROFILE_FIELDS = ["slug", "location", "headline", "photoUrl", "specialties", "approach"] as const;
export const SERVICE_FIELDS = ["title", "description", "kind", "price", "currency", "durationWeeks", "inclusions", "delivery", "cancellation", "nextSteps", "available"] as const;
const LAST_FIELDS = ["email", ...PROFILE_FIELDS, ...SERVICE_FIELDS] as const;

const STEPS = { profile: 1, service: 2, payouts: 3, offer: 1, email: 1 } as const;
export type AnalyticsStepName = keyof typeof STEPS;
export type AuthEntry = "coach" | "runner" | "checkout" | "invite";
export type ItemCategory = "package" | "consultation";

export interface AnalyticsItem {
  item_id: string;
  item_category: ItemCategory;
  price: number;
  quantity: 1;
}

export type AnalyticsValue = string | number | AnalyticsItem[];

const SLUG = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PUBLIC_PATH = /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/;

/** Classify a saved enquiry without forwarding any of its contents to analytics. */
export function enquiryProductEvent(kind: string, interest: unknown): ProductEvent {
  if (kind === "coach_match") return "coach_match_request";
  if (interest === "race_hub") return "race_hub_enquiry";
  return "partnership_enquiry";
}

function slug(value: unknown) {
  return typeof value === "string" && SLUG.test(value) && value.length <= 100 ? value : null;
}

/** Storefront prices are integer cents from 1 to 1,000 currency units. */
export function majorCurrencyValue(cents: number) {
  if (!Number.isSafeInteger(cents) || cents < 100 || cents > 100000) return null;
  return cents / 100;
}

/** Public pathname only. Query strings, hashes and account routes are dropped. */
export function publicPagePath(value: string) {
  if (!value || value.length > 180 || value.includes("?") || value.includes("#") || value.includes("\\")) return null;
  if (value === "/account" || value.startsWith("/account/") || value === "/coaching/payment-return") return null;
  if (!PUBLIC_PATH.test(value)) return null;
  return value;
}

/** Landing sections where scroll depth and engaged time are measured. */
export function isEngagementPath(pathname: string) {
  const path = publicPagePath(pathname);
  if (!path || path === "/coaching/apply" || path.startsWith("/coaching/apply/")) return false;
  return ["/plans", "/guides", "/racers", "/coaches", "/coaching"].some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export const SCROLL_DEPTHS = [25, 50, 75, 90] as const;
export const ENGAGED_TIME_MSEC = 10_000;

export function newlyReachedScrollDepths(percent: number, seen: readonly number[]) {
  if (!Number.isFinite(percent) || percent < 0) return [];
  return SCROLL_DEPTHS.filter((depth) => percent + 0.001 >= depth && !seen.includes(depth));
}

function money(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value * 100) / 100;
  if (rounded < 1 || rounded > 1000) return null;
  return rounded;
}

function commerce(input: Record<string, unknown>): Record<string, AnalyticsValue> {
  const rawCurrency = typeof input.currency === "string" ? input.currency.toUpperCase() : "";
  const currency = rawCurrency === "USD" || rawCurrency === "EUR" || rawCurrency === "GBP" ? rawCurrency : null;
  const value = money(input.value);
  const itemId = typeof input.item_id === "string" ? input.item_id.toLowerCase() : "";
  const transactionId = typeof input.transaction_id === "string" ? input.transaction_id.toLowerCase() : "";
  const itemCategory = input.item_category === "package" || input.item_category === "consultation" ? input.item_category : null;
  if (!currency || value === null || !UUID.test(itemId) || !itemCategory) return {};
  const safe: Record<string, AnalyticsValue> = {
    currency,
    value,
    items: [{ item_id: itemId, item_category: itemCategory, price: value, quantity: 1 }],
  };
  if (UUID.test(transactionId)) safe.transaction_id = transactionId;
  return safe;
}

/** Only public, enumerated values. Names, emails, messages and free text are dropped. */
export function productEventParameters(input: Record<string, unknown>) {
  const safe: Record<string, AnalyticsValue> = {};
  for (const key of ["plan_slug", "race_slug", "guide_slug", "coach_slug", "link_kind"] as const) {
    const value = slug(input[key]);
    if (value) safe[key] = value;
  }
  if (input.preview_role === "runner" || input.preview_role === "coach") safe.preview_role = input.preview_role;
  if (input.preview_action === "switch-role" || input.preview_action === "screen" || input.preview_action === "workout" || input.preview_action === "athlete-calendar") safe.preview_action = input.preview_action;
  if (input.coaching_focus === "beginners" || input.coaching_focus === "half-marathon" || input.coaching_focus === "marathon") safe.coaching_focus = input.coaching_focus;
  if (input.method === "email") safe.method = "email";
  if (input.entry === "coach" || input.entry === "runner" || input.entry === "checkout" || input.entry === "invite") safe.entry = input.entry;
  if (typeof input.last_field === "string" && (LAST_FIELDS as readonly string[]).includes(input.last_field)) safe.last_field = input.last_field;
  if (typeof input.step_name === "string" && Object.hasOwn(STEPS, input.step_name)) {
    const step = input.step_name as AnalyticsStepName;
    if (input.step_number === STEPS[step]) {
      safe.step_name = step;
      safe.step_number = STEPS[step];
    }
  }
  Object.assign(safe, commerce(input));
  return safe;
}
