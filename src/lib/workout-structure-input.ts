import { MarketplaceError } from "./marketplace-config";
import { STEP_KINDS, TARGET_KINDS, STRUCTURE_LIMITS, structureTotals, type WorkoutBlock, type WorkoutStep } from "./workout-structure";
const invalid = (message: string): never => { throw new MarketplaceError(message, 400); };
function exact(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length || Object.keys(value).some((k) => !keys.includes(k))) return invalid("Check the structured workout steps.");
  return value as Record<string, unknown>;
}
function number(value: unknown, min: number, max: number, integer = false): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) return invalid("Use a valid step duration, distance, repeat count or target range.");
  return Math.round(value * 100) / 100;
}
export function parseWorkoutStructure(input: unknown): WorkoutBlock[] {
  if (!Array.isArray(input) || input.length > STRUCTURE_LIMITS.blocks) return invalid("Use up to 12 workout blocks.");
  let steps = 0;
  const blocks = input.map((value) => {
    const b = exact(value, ["repeat", "steps"]);
    const repeat = number(b.repeat, 1, STRUCTURE_LIMITS.repeats, true);
    if (!Array.isArray(b.steps) || !b.steps.length) return invalid("Each workout block needs at least one step.");
    steps += b.steps.length;
    if (steps > STRUCTURE_LIMITS.steps) return invalid("Use up to 24 steps before repeats.");
    return { repeat, steps: b.steps.map((value): WorkoutStep => {
      const s = exact(value, ["kind", "unit", "amount", "target", "low", "high", "notes"]);
      if (!STEP_KINDS.includes(s.kind as WorkoutStep["kind"]) || !["minutes", "km", "open"].includes(String(s.unit)) || !TARGET_KINDS.includes(s.target as WorkoutStep["target"])) return invalid("Choose a supported step and target type.");
      if (typeof s.notes !== "string" || s.notes.length > 80 || /[\x00-\x1f]/.test(s.notes)) return invalid("Keep each step note to 80 characters on one line.");
      const amount = s.unit === "open" ? null : number(s.amount, 0.01, s.unit === "minutes" ? 10080 : 2000);
      if (s.unit === "open" && s.amount !== null) return invalid("Open steps do not have a fixed duration.");
      let low: number | null = null, high: number | null = null;
      if (s.target === "none") { if (s.low !== null || s.high !== null) return invalid("Remove the range when no target is selected."); }
      else {
        const bounds = s.target === "effort" ? [1, 10] : s.target === "pace" ? [60, 1800] : s.target === "heartRate" ? [30, 250] : [1, 3000];
        low = number(s.low, bounds[0], bounds[1], true); high = number(s.high, bounds[0], bounds[1], true);
        if (low > high) return invalid("The target range must run from the lower number to the higher number (faster to slower for pace).");
      }
      return { kind: s.kind as WorkoutStep["kind"], unit: s.unit as WorkoutStep["unit"], amount, target: s.target as WorkoutStep["target"], low, high, notes: s.notes.trim() };
    }) };
  });
  const total = structureTotals(blocks);
  if (total.count > STRUCTURE_LIMITS.expandedSteps || total.minutes > 10080 || total.km > 2000) return invalid("Reduce repeats: a workout supports up to 200 expanded steps, 10,080 minutes and 2,000 km.");
  return blocks;
}
