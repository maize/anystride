import { MarketplaceError } from "./marketplace-config";

function invalid(message = "Check the form and try again."): never { throw new MarketplaceError(message, 400); }
function text(value: unknown, min: number, max: number) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) invalid();
  return value.trim();
}
function id(value: unknown) {
  const result = text(value, 36, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) invalid();
  return result.toLowerCase();
}
function integer(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) invalid();
  return value;
}
function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  if (!choices.includes(value as T)) invalid();
  return value as T;
}

export function parseMarketplaceAction(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid();
  const b = input as Record<string, unknown>;
  const allowed: Record<string, string[]> = {
    apply: ["name", "bio", "credentials"],
    service: ["id", "title", "description", "amount", "currency", "durationWeeks"],
    "edit-service": ["id", "title", "description", "amount", "currency", "durationWeeks", "version"],
    inquire: ["id", "serviceId", "message", "shareWithCoach"],
    respond: ["id", "status"],
    review: ["target", "id", "status", "version"],
  };
  if (typeof b.action !== "string" || !Object.hasOwn(allowed, b.action) ||
      Object.keys(b).some((key) => key !== "action" && !allowed[b.action as string].includes(key))) invalid();
  switch (b.action) {
    case "apply": return { action: "apply" as const, name: text(b.name, 2, 100), bio: text(b.bio, 40, 2000), credentials: text(b.credentials, 10, 1000) };
    case "service": return { action: "service" as const, id: id(b.id), title: text(b.title, 5, 120), description: text(b.description, 40, 2000), amount: integer(b.amount, 100, 100000), currency: choice(b.currency, ["usd", "eur", "gbp"] as const), durationWeeks: integer(b.durationWeeks, 1, 52) };
    case "edit-service": return { action: "edit-service" as const, id: id(b.id), version: integer(b.version, 1, 2147483646), title: text(b.title, 5, 120), description: text(b.description, 40, 2000), amount: integer(b.amount, 100, 100000), currency: choice(b.currency, ["usd", "eur", "gbp"] as const), durationWeeks: integer(b.durationWeeks, 1, 52) };
    case "inquire":
      if (b.shareWithCoach !== true) invalid("Confirm that this request may be shared with the coach.");
      return { action: "inquire" as const, id: id(b.id), serviceId: id(b.serviceId), message: text(b.message, 20, 1500) };
    case "respond": return { action: "respond" as const, id: id(b.id), status: choice(b.status, ["accepted", "declined", "cancelled"] as const) };
    case "review": return { action: "review" as const, target: choice(b.target, ["coach", "service"] as const), id: b.target === "coach" ? text(b.id, 5, 100) : id(b.id), status: choice(b.status, ["approved", "rejected", "suspended"] as const), version: integer(b.version, 1, 2147483646) };
    default: return invalid();
  }
}
export type MarketplaceAction = ReturnType<typeof parseMarketplaceAction>;
