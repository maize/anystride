import "server-only";
import { isIP } from "node:net";
import { FOCUS_ORDER, type Coach, type CoachFormat } from "@/data/coaches";
import { MarketplaceError } from "./marketplace-config";

function invalid(message = "Check the imported coach details and try again."): never { throw new MarketplaceError(message, 400); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
function fields(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) invalid("Unexpected form fields. Reload the review page.");
}
function text(value: unknown, max: number, min = 1): string {
  if (typeof value !== "string") invalid();
  const result = value.trim();
  if (result.length < min || result.length > max || /[<>\u0000-\u001f\u007f]/u.test(result)) invalid();
  return result;
}
function list(value: unknown, max: number, maxLength: number): string[] {
  if (!Array.isArray(value) || !value.length || value.length > max) invalid();
  const result = value.map((item) => text(item, maxLength));
  if (new Set(result).size !== result.length) invalid("Remove repeated tags or paragraphs.");
  return result;
}
function website(value: unknown): string {
  const raw = text(value, 2048);
  let url: URL;
  try { url = new URL(raw); } catch { return invalid("Enter a full public website address."); }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port || url.search || url.hash ||
      !host.includes(".") || host.endsWith(".") || host === "localhost" || /\.(localhost|local|internal|test|invalid)$/.test(host) ||
      isIP(host.replace(/^\[|\]$/g, "")) || host === "vdoto2.com" || host.endsWith(".vdoto2.com")) invalid("Use the coach’s independent public website, without tracking parameters.");
  return url.href;
}
export type ImportedCoachDetails = Pick<Coach, "name" | "city" | "location" | "format" | "focus" | "specialties" | "experience" | "blurb" | "bio" | "link">;

export function parseImportedCoachDetails(value: unknown): ImportedCoachDetails {
  const p = object(value);
  fields(p, ["name", "city", "location", "format", "focus", "specialties", "experience", "blurb", "bio", "link"]);
  const format = text(p.format, 16) as CoachFormat;
  if (!["online", "in-person", "hybrid"].includes(format)) invalid("Choose a coaching format.");
  const focus = list(p.focus, FOCUS_ORDER.length, 32) as Coach["focus"];
  if (focus.some((item) => !FOCUS_ORDER.includes(item))) invalid("Choose valid training focus tags.");
  return {
    name: text(p.name, 160, 2), city: text(p.city, 120), location: text(p.location, 200), format, focus,
    specialties: list(p.specialties, 12, 120), experience: text(p.experience ?? "", 120, 0),
    blurb: text(p.blurb, 320, 20), bio: list(p.bio, 6, 1200), link: website(p.link),
  };
}

export function parseImportedCoachAction(value: unknown) {
  const p = object(value);
  fields(p, ["key", "version", "sourceRevision", "status", "profile", "notes", "confirmSource"]);
  const key = text(p.key, 110);
  if (!/^vdot:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)) invalid();
  if (!Number.isInteger(p.version) || Number(p.version) < 0 || Number(p.version) > 2147483646) invalid();
  const sourceRevision = text(p.sourceRevision, 64);
  if (!/^[a-f0-9]{64}$/.test(sourceRevision)) invalid();
  const status = text(p.status, 16) as "draft" | "published" | "hidden";
  if (!["draft", "published", "hidden"].includes(status)) invalid();
  if (status === "published" && p.confirmSource !== true) invalid("Confirm that you checked the source before publishing.");
  if (p.confirmSource !== undefined && typeof p.confirmSource !== "boolean") invalid();
  if (status === "hidden" && p.profile !== undefined) invalid();
  return {
    key, version: Number(p.version), sourceRevision, status, notes: text(p.notes ?? "", 1000, 0),
    profile: status === "hidden" ? undefined : parseImportedCoachDetails(p.profile),
  };
}
export type ImportedCoachAction = ReturnType<typeof parseImportedCoachAction>;
