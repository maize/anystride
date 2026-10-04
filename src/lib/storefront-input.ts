import { MarketplaceError } from "./marketplace-config";

function invalid(message = "Check your storefront details and try again."): never { throw new MarketplaceError(message, 400); }
function text(value: unknown, min: number, max: number) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) invalid();
  return value.trim();
}
function integer(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) invalid();
  return value;
}
function boolean(value: unknown) { if (typeof value !== "boolean") invalid(); return value; }
function lines(value: unknown, min: number, max: number) {
  if (!Array.isArray(value) || value.length < min || value.length > max) invalid();
  return [...new Set(value.map((v) => text(v, 2, 160)))];
}
export function storefrontId(value: unknown) {
  const result = text(value, 36, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) invalid();
  return result.toLowerCase();
}
export function storefrontSlug(value: unknown) {
  const result = text(value, 3, 70);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) invalid("Use lowercase letters, numbers and single hyphens in your profile address.");
  return result;
}
function photo(value: unknown) {
  const result = text(value, 0, 1000);
  if (!result) return "";
  let url: URL;
  try { url = new URL(result); } catch { return invalid("Use a public HTTPS image address."); }
  if (url.protocol !== "https:" || url.username || url.password || url.port || !url.hostname.includes(".") || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(url.hostname)) invalid("Use a public HTTPS image address.");
  return url.href;
}

export function parseStorefrontAction(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid();
  const b = input as Record<string, unknown>;
  const fields: Record<string, string[]> = {
    profile: ["slug", "headline", "location", "photoUrl", "specialties", "approach", "published", "version"],
    offer: ["id", "version", "title", "description", "amount", "currency", "durationWeeks", "kind", "inclusions", "delivery", "nextSteps", "cancellation", "available"],
    checkout: ["serviceId", "orderId", "version"],
    payouts: [],
    dashboard: [],
    reconcile: ["orderId"],
    cancel: ["orderId"],
  };
  if (typeof b.action !== "string" || !Object.hasOwn(fields, b.action) || Object.keys(b).some((k) => k !== "action" && !fields[b.action as string].includes(k))) invalid();
  switch (b.action) {
    case "profile": return { action: "profile" as const, slug: storefrontSlug(b.slug), headline: text(b.headline, 10, 140), location: text(b.location, 2, 100), photoUrl: photo(b.photoUrl), specialties: lines(b.specialties, 1, 6), approach: text(b.approach, 40, 3000), published: boolean(b.published), version: integer(b.version, 0, 2147483646) };
    case "offer": {
      if (!["usd", "eur", "gbp"].includes(b.currency as string) || !["package", "consultation"].includes(b.kind as string)) invalid();
      return { action: "offer" as const, id: storefrontId(b.id), version: integer(b.version, 0, 2147483646), title: text(b.title, 5, 120), description: text(b.description, 40, 2000), amount: integer(b.amount, 100, 100000), currency: b.currency as "usd" | "eur" | "gbp", durationWeeks: integer(b.durationWeeks, 1, 52), kind: b.kind as "package" | "consultation", inclusions: lines(b.inclusions, 1, 8), delivery: text(b.delivery, 10, 500), nextSteps: text(b.nextSteps, 20, 2000), cancellation: text(b.cancellation, 20, 1000), available: boolean(b.available) };
    }
    case "checkout": return { action: "checkout" as const, serviceId: storefrontId(b.serviceId), orderId: storefrontId(b.orderId), version: integer(b.version, 1, 2147483646) };
    case "dashboard": return { action: "dashboard" as const };
    case "payouts": return { action: "payouts" as const };
    case "reconcile": return { action: "reconcile" as const, orderId: storefrontId(b.orderId) };
    case "cancel": return { action: "cancel" as const, orderId: storefrontId(b.orderId) };
    default: return invalid();
  }
}
export type StorefrontAction = ReturnType<typeof parseStorefrontAction>;
