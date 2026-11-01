/** Compact, provider-independent instructions. Pace is stored in seconds per kilometre. */
export const STRUCTURE_LIMITS = { blocks: 12, steps: 24, expandedSteps: 200, repeats: 30 } as const;
export const STEP_KINDS = ["warmup", "work", "recovery", "cooldown"] as const;
export const TARGET_KINDS = ["none", "effort", "pace", "heartRate", "power"] as const;
export interface WorkoutStep {
  kind: typeof STEP_KINDS[number]; unit: "minutes" | "km" | "open"; amount: number | null;
  target: typeof TARGET_KINDS[number]; low: number | null; high: number | null; notes: string;
}
export interface WorkoutBlock { repeat: number; steps: WorkoutStep[] }
export const emptyWorkoutStep = (): WorkoutStep => ({ kind: "work", unit: "minutes", amount: 5, target: "none", low: null, high: null, notes: "" });
export function structureTotals(blocks: WorkoutBlock[]) {
  let minutes = 0, km = 0, count = 0, timed = 0, distanced = 0;
  for (const block of blocks) for (const step of block.steps) {
    count += block.repeat;
    if (step.unit === "minutes") { minutes += (step.amount ?? 0) * block.repeat; timed += block.repeat; }
    if (step.unit === "km") { km += (step.amount ?? 0) * block.repeat; distanced += block.repeat; }
  }
  return { minutes: Math.round(minutes * 100) / 100, km: Math.round(km * 100) / 100, count, allTimed: count > 0 && count === timed, allDistance: count > 0 && count === distanced };
}
export function paceLabel(seconds: number) { return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`; }
export function stepLabel(step: WorkoutStep) {
  const kind = { warmup: "Warm-up", work: "Work", recovery: "Recovery", cooldown: "Cool-down" }[step.kind];
  const duration = step.unit === "open" ? "until ready" : `${step.amount} ${step.unit === "minutes" ? "min" : "km"}`;
  const range = step.low === step.high ? `${step.low}` : `${step.low}–${step.high}`;
  const target = step.target === "none" ? "" : step.target === "pace" ? `${paceLabel(step.low!)}–${paceLabel(step.high!)} /km` : `${range} ${step.target === "effort" ? "effort /10" : step.target === "heartRate" ? "bpm" : "W"}`;
  return `${kind}: ${duration}${target ? ` · ${target}` : ""}${step.notes ? ` · ${step.notes}` : ""}`;
}
export function structureText(blocks: WorkoutBlock[]) { return blocks.map((b) => `${b.repeat > 1 ? `${b.repeat}× [ ` : ""}${b.steps.map(stepLabel).join(" → ")}${b.repeat > 1 ? " ]" : ""}`).join("; "); }
/** PostgreSQL jsonb reorders object keys; compare content, not reference/key order. */
export function canonicalTrainingJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalTrainingJson).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonicalTrainingJson(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
