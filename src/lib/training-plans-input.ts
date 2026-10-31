import { MarketplaceError } from "./marketplace-config";
import { parseTrainingAction, trainingReference } from "./training-input";
import { isTrainingDate, shiftTrainingDate, TRAINING_LIMITS } from "./training";
import { PLAN_LIMITS, type TrainingPlan } from "./training-plans";
export type PlanAction = { action: "save"; plan: TrainingPlan } | { action: "delete"; id: string; version: number } | { action: "remove"; id: string } | { action: "preview" | "assign"; planId: string; version: number; startDate: string; athletes: string[]; id?: string };
const invalid = (message = "Check the training plan and try again."): never => { throw new MarketplaceError(message, 400); };
function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) return invalid(); return value as Record<string, unknown>; }
function keys(value: Record<string, unknown>, allowed: string[]) { if (Object.keys(value).length !== allowed.length || Object.keys(value).some((k) => !allowed.includes(k))) invalid(); }
function version(value: unknown, min = 0): number { if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > 1000000) return invalid(); return value; }
export function parsePlanAction(input: unknown): PlanAction {
  const body = record(input);
  if (body.action === "remove") { keys(body, ["action", "id"]); return { action: "remove", id: trainingReference(body.id) }; }
  if (body.action === "delete") { keys(body, ["action", "id", "version"]); return { action: "delete", id: trainingReference(body.id), version: version(body.version, 1) }; }
  if (body.action === "preview" || body.action === "assign") {
    keys(body, ["action", "planId", "version", "startDate", "athletes", ...(body.action === "assign" ? ["id"] : [])]);
    if (!isTrainingDate(body.startDate)) invalid("Choose a valid plan start date.");
    if (!Array.isArray(body.athletes) || !body.athletes.length || body.athletes.length > TRAINING_LIMITS.batch) return invalid("Select up to 20 connected athletes.");
    const athletes = body.athletes.map(trainingReference).sort();
    if (new Set(athletes).size !== athletes.length) invalid();
    return { action: body.action, planId: trainingReference(body.planId), version: version(body.version, 1), startDate: body.startDate as string, athletes, ...(body.action === "assign" ? { id: trainingReference(body.id) } : {}) };
  }
  keys(body, ["action", "plan"]);
  if (body.action !== "save") return invalid();
  const p = record(body.plan); keys(p, ["id", "version", "title", "description", "weeks", "sessions"]);
  if (typeof p.title !== "string" || !p.title.trim() || p.title.trim().length > 120 || /[\x00-\x1f]/.test(p.title)) invalid("Give the plan a title of up to 120 characters.");
  if (typeof p.description !== "string" || p.description.length > 1000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(p.description)) invalid("Keep the plan description to 1,000 characters.");
  if (typeof p.weeks !== "number" || !Number.isInteger(p.weeks) || p.weeks < 1 || p.weeks > PLAN_LIMITS.weeks) invalid("Choose between 1 and 24 weeks.");
  if (!Array.isArray(p.sessions) || p.sessions.length > PLAN_LIMITS.sessions) return invalid("A plan can contain up to 168 workouts.");
  const seen = new Set<string>(); const days = new Map<number, number>();
  const sessions = p.sessions.map((value) => {
    const s = record(value); keys(s, ["id", "day", "workout"]);
    const id = trainingReference(s.id);
    if (seen.has(id)) invalid("Each plan session needs a unique reference."); seen.add(id);
    if (typeof s.day !== "number" || !Number.isInteger(s.day) || s.day < 0 || s.day >= (p.weeks as number) * 7) invalid("Place every workout within the plan’s weeks before shortening the plan.");
    const day = s.day as number;
    days.set(day, (days.get(day) ?? 0) + 1);
    if (days.get(day)! > TRAINING_LIMITS.perDay) invalid("Use up to 20 workouts on one plan day.");
    const details = record(s.workout);
    keys(details, ["title", "sport", "notes", "plannedMinutes", "plannedKm", "actualMinutes", "actualKm", "effort", "status", ...(Object.hasOwn(details, "structure") ? ["structure"] : [])]);
    let parsed;
    try { parsed = parseTrainingAction({ action: "save", entry: { ...details, id, kind: "workout", date: shiftTrainingDate("2026-01-01", day), version: 0 } }); }
    catch (e) { if (e instanceof MarketplaceError) return invalid(`Week ${Math.floor(day / 7) + 1}, day ${day % 7 + 1}: ${e.message}`); throw e; }
    if (parsed.action !== "save" || parsed.entry.status !== "planned") return invalid("Plan templates contain planned workouts only.");
    const { id: ignoredId, kind, date, version: ignoredVersion, ...workout } = parsed.entry;
    void ignoredId; void kind; void date; void ignoredVersion;
    return { id, day, workout };
  }).sort((a, b) => a.day - b.day || a.id.localeCompare(b.id));
  const plan: TrainingPlan = { id: trainingReference(p.id), version: version(p.version), title: (p.title as string).trim(), description: (p.description as string).trim(), weeks: p.weeks as number, sessions };
  if (Buffer.byteLength(JSON.stringify(plan), "utf8") > PLAN_LIMITS.bytes) invalid("This plan is too large. Shorten instructions or split it into separate phases.");
  return { action: "save", plan };
}
