import { MarketplaceError } from "./marketplace-config";
import { parseTrainingAction, trainingReference } from "./training-input";
import { TRAINING_LIMITS, type TrainingEntry } from "./training";

export type CoachingAction =
  | { action: "invite"; id: string; name: string; email: string }
  | { action: "accept" | "decline" | "revoke"; id: string; version: number }
  | { action: "assign"; athletes: string[]; entry: TrainingEntry };
export function parseCoachingAction(input: unknown): CoachingAction {
  const invalid = (): never => { throw new MarketplaceError("Check the athlete details and try again.", 400); };
  if (!input || typeof input !== "object" || Array.isArray(input)) return invalid();
  const body = input as Record<string, unknown>;
  const keys = (allowed: string[]) => { if (Object.keys(body).length !== allowed.length || Object.keys(body).some((k) => !allowed.includes(k))) invalid(); };
  if (body.action === "invite") {
    keys(["action", "id", "name", "email"]);
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 80 || /[\x00-\x1f]/.test(body.name)) return invalid();
    if (typeof body.email !== "string" || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return invalid();
    return { action: "invite", id: trainingReference(body.id), name: body.name.trim(), email: body.email.trim().toLowerCase() };
  }
  if (body.action === "assign") {
    keys(["action", "athletes", "entry"]);
    if (!Array.isArray(body.athletes) || !body.athletes.length || body.athletes.length > TRAINING_LIMITS.batch) return invalid();
    const athletes = body.athletes.map(trainingReference);
    if (new Set(athletes).size !== athletes.length) return invalid();
    const parsed = parseTrainingAction({ action: "save", entry: body.entry });
    if (parsed.action !== "save" || parsed.entry.version !== 0 || parsed.entry.kind !== "workout" || parsed.entry.status !== "planned") return invalid();
    return { action: "assign", athletes, entry: parsed.entry };
  }
  keys(["action", "id", "version"]);
  if (!["accept", "decline", "revoke"].includes(String(body.action)) || typeof body.version !== "number" || !Number.isSafeInteger(body.version) || body.version < 1 || body.version > 1000000) return invalid();
  return { action: body.action as "accept" | "decline" | "revoke", id: trainingReference(body.id), version: body.version };
}
