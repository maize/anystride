export type AuthEntry = "coach" | "runner" | "checkout" | "invite";
export type ConfirmedAuthEvent = "sign_up" | "login";

export interface AuthAnalyticsUser {
  created_at?: string;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  is_anonymous?: boolean;
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const TWO_MINUTES = 2 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;
const COOKIE = /^(sign_up|login)\.(coach|runner|checkout|invite)\.([a-f0-9]{16})$/;

export const AUTH_ANALYTICS_COOKIE = "anystride_ae";

/** The shared email form's destination, never the address itself. */
export function authEntry(path: string): AuthEntry {
  if (path.startsWith("/account/checkout/")) return "checkout";
  if (path === "/account/athletes") return "invite";
  if (path === "/account/coach" || path.startsWith("/account/services")) return "coach";
  return "runner";
}

function time(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * A confirmed magic-link callback is a signup only for a new account's first
 * session. Later callbacks are logins. Anonymous or unconfirmed users are neither.
 */
export function confirmedAuthEvent(user: AuthAnalyticsUser | null | undefined, now: number): ConfirmedAuthEvent | null {
  if (!user || user.is_anonymous) return null;
  const created = time(user.created_at);
  const confirmed = time(user.email_confirmed_at);
  if (created === null || confirmed === null) return null;
  const signedIn = time(user.last_sign_in_at) ?? confirmed;
  const fresh = confirmed - now < TWO_MINUTES && now - confirmed < FIFTEEN_MINUTES;
  const firstSession = Math.abs(signedIn - confirmed) < TWO_MINUTES;
  const recentAccount = confirmed >= created && confirmed - created < ONE_DAY;
  if (fresh && firstSession && recentAccount) return "sign_up";
  return "login";
}

export function parseAuthAnalyticsCookie(value: string) {
  const match = COOKIE.exec(value);
  if (!match) return null;
  return { event: match[1] as ConfirmedAuthEvent, entry: match[2] as AuthEntry, nonce: match[3] };
}

export function formatAuthAnalyticsCookie(event: ConfirmedAuthEvent, entry: AuthEntry, nonce: string) {
  const value = `${event}.${entry}.${nonce}`;
  return parseAuthAnalyticsCookie(value) ? value : null;
}

/** Short-lived, non-identifying cookie set only after the auth code is exchanged. */
export function authAnalyticsCookie(input: {
  user: AuthAnalyticsUser | null | undefined;
  now: number;
  host: string;
  optOut: boolean;
  redirectPath: string;
  nonce: string;
}) {
  if (input.optOut || (input.host !== "anystride.com" && input.host !== "www.anystride.com")) return null;
  const event = confirmedAuthEvent(input.user, input.now);
  if (!event) return null;
  return formatAuthAnalyticsCookie(event, authEntry(input.redirectPath), input.nonce);
}
