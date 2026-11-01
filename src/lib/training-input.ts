import { parseWorkoutStructure } from "./workout-structure-input";
import { structureTotals } from "./workout-structure";
import { MarketplaceError } from "./marketplace-config";
import { isTrainingDate, TRAINING_LIMITS, TRAINING_SPORTS, type TrainingEntry } from "./training";

export type TrainingAction = { action: "save"; entry: TrainingEntry } | { action: "delete"; id: string; version: number };
const invalid = (message = "Invalid training request."): never => { throw new MarketplaceError(message, 400); };
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key)) || allowed.some((key) => !(key in value))) invalid();
}
export function trainingReference(value: unknown) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return invalid();
  return value.toLowerCase();
}
function version(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 1000000) return invalid();
  return value;
}
function metric(value: unknown, max: number, whole = false): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max || (whole && !Number.isInteger(value))) return invalid("Use a valid distance, duration or effort.");
  return Math.round(value * 100) / 100;
}
export function parseTrainingAction(value: unknown): TrainingAction {
  const body = record(value);
  if (body.action === "delete") {
    keys(body, ["action", "id", "version"]);
    const v = version(body.version);
    if (!v) invalid();
    return { action: "delete", id: trainingReference(body.id), version: v };
  }
  keys(body, ["action", "entry"]);
  if (body.action !== "save") invalid();
  const e = record(body.entry);
  keys(e, ["id", "kind", "date", "version", "title", "sport", "notes", "plannedMinutes", "plannedKm", "actualMinutes", "actualKm", "effort", "status", ...(Object.hasOwn(e, "structure") ? ["structure"] : [])]);
  if (e.kind !== "workout" && e.kind !== "template") invalid();
  if ((e.kind === "workout" && !isTrainingDate(e.date)) || (e.kind === "template" && e.date !== null)) invalid("Choose a valid training date between 2000 and 2100.");
  if (typeof e.title !== "string" || !e.title.trim() || e.title.trim().length > 120 || /[\x00-\x1f]/.test(e.title)) invalid("Give your workout a title of up to 120 characters.");
  if (typeof e.notes !== "string" || e.notes.length > 1000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(e.notes)) invalid("Keep notes to 1,000 characters.");
  if (!TRAINING_SPORTS.includes(e.sport as TrainingEntry["sport"]) || !["planned", "completed", "skipped"].includes(e.status as string)) invalid();
  const entry: TrainingEntry = {
    id: trainingReference(e.id), kind: e.kind as TrainingEntry["kind"], date: e.date as string | null, version: version(e.version),
    title: (e.title as string).trim(), notes: (e.notes as string).trim(), sport: e.sport as TrainingEntry["sport"], status: e.status as TrainingEntry["status"],
    plannedMinutes: metric(e.plannedMinutes, 10080), plannedKm: metric(e.plannedKm, 2000),
    actualMinutes: metric(e.actualMinutes, 10080), actualKm: metric(e.actualKm, 2000), effort: metric(e.effort, 10, true),
  };
  if (Object.hasOwn(e, "structure")) {
    entry.structure = parseWorkoutStructure(e.structure);
    const totals = structureTotals(entry.structure);
    if (totals.allTimed) entry.plannedMinutes = totals.minutes;
    if (totals.allDistance) entry.plannedKm = totals.km;
    if ((entry.plannedMinutes !== null && entry.plannedMinutes < totals.minutes) || (entry.plannedKm !== null && entry.plannedKm < totals.km)) invalid("Overall targets cannot be smaller than the workout steps. Leave unknown totals blank.");
  }
  const { id: ignoredId, kind: ignoredKind, date: ignoredDate, version: ignoredVersion, ...details } = entry;
  void ignoredId; void ignoredKind; void ignoredDate; void ignoredVersion;
  // Leave headroom for jsonb formatting under the existing 8 KiB database ceiling.
  if (Buffer.byteLength(JSON.stringify(details), "utf8") > 6144) invalid("This workout is too large. Shorten notes or use repeat blocks.");
  if (entry.effort === 0) invalid("Effort must be between 1 and 10.");
  if (entry.status !== "completed" && [entry.actualMinutes, entry.actualKm, entry.effort].some((v) => v !== null)) invalid("Actual results belong to completed workouts.");
  if (entry.kind === "template" && entry.status !== "planned") invalid("Library workouts cannot include completion results.");
  return { action: "save", entry };
}
export function trainingRange(from: unknown, to: unknown) {
  if (!isTrainingDate(from) || !isTrainingDate(to) || from > to || (Date.parse(to) - Date.parse(from)) / 86400000 >= TRAINING_LIMITS.rangeDays) invalid("Choose a date range of up to 31 days between 2000 and 2100.");
  return { from: from as string, to: to as string };
}
