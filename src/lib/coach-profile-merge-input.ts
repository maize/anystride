import { MarketplaceError } from "./marketplace-config";
import { parseMarketplaceAction } from "./marketplace-input";

export function normalizeCoachEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && !/[\u0000-\u001f\u007f]/.test(email) && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email) ? email : null;
}
export function directoryContactEmail(link: string): string | null {
  if (!/^mailto:/i.test(link)) return null;
  try { return normalizeCoachEmail(decodeURIComponent(link.slice(7).split("?")[0])); } catch { return null; }
}
export function parseCoachProfileMerge(input: unknown) {
  const fail = (): never => { throw new MarketplaceError("Check the profile merge and try again.", 400); };
  if (!input || typeof input !== "object" || Array.isArray(input)) return fail();
  const b = input as Record<string, unknown>;
  if (Object.keys(b).some((key) => !["slug", "application"].includes(key)) || typeof b.slug !== "string" || b.slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b.slug)) return fail();
  if (b.application !== undefined && (!b.application || typeof b.application !== "object" || Array.isArray(b.application) || Object.keys(b.application).some((key) => !["name", "bio", "credentials"].includes(key)))) return fail();
  const application = b.application === undefined ? undefined : parseMarketplaceAction({ ...(b.application as object), action: "apply" });
  if (application && application.action !== "apply") return fail();
  return { slug: b.slug, application };
}
export type CoachProfileMergeInput = ReturnType<typeof parseCoachProfileMerge>;
