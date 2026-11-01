import { checkoutReturnPath } from "./account-return";

/** A display preference only; coaching permissions are checked independently. */
export type AccountView = "runner" | "coach";
export const accountViewCookie = "anystride-account-view";
export const accountViewHeader = "x-anystride-account-view";
export function parseAccountView(value: unknown): AccountView | undefined {
  return value === "runner" || value === "coach" ? value : undefined;
}
export function resolveAccountView(requested: unknown, saved: unknown, hasCoachApplication: boolean): AccountView {
  return parseAccountView(requested) ?? parseAccountView(saved) ?? (hasCoachApplication ? "coach" : "runner");
}
export function accountViewForPath(path: string, athleteCalendar = false): AccountView | undefined {
  if (["/account/coach", "/account/services", "/account/storefront", "/account/enquiries", "/account/plans", "/account/review"].some((route) => path === route || path.startsWith(`${route}/`))) return "coach";
  if (path === "/account/training") return athleteCalendar ? "coach" : "runner";
  if (["/account/runner", "/account/connections", "/account/coaching", "/account/explore", "/account/workspaces"].some((route) => path === route || path.startsWith(`${route}/`))) return "runner";
  if (/^\/account\/athletes\/[^/]+\/activities$/.test(path)) return "coach";
  return undefined;
}
export function accountViewCookieOptions(secure: boolean) {
  return { httpOnly: true, secure, sameSite: "lax" as const, path: "/account", maxAge: 60 * 60 * 24 * 365 };
}

export function accountViewDestination(view: AccountView, next: unknown) {
  const path = checkoutReturnPath(next);
  if (view === "runner" && (path === "/account/athletes" || path.startsWith("/account/checkout/"))) return path;
  if (view === "coach" && path.startsWith("/account/services")) return path;
  return "/account";
}
