import { structureText, type WorkoutBlock } from "./workout-structure";
/** Shared, provider-independent training data. Distances are stored in kilometres. */
export const TRAINING_LIMITS = { workouts: 20000, templates: 100, perDay: 20, rangeDays: 31, readsPerMonth: 10000, writesPerMonth: 2000, requestsPerMinute: 60, coachWritesPerMonth: 20000, roster: 100, relationships: 500, coachesPerAthlete: 5, batch: 20 } as const;
export const TRAINING_SPORTS = ["run", "bike", "swim", "strength", "other"] as const;
export type TrainingSport = typeof TRAINING_SPORTS[number];
export type TrainingStatus = "planned" | "completed" | "skipped";
export interface TrainingDetails {
  title: string; sport: TrainingSport; notes: string;
  plannedMinutes: number | null; plannedKm: number | null;
  actualMinutes: number | null; actualKm: number | null; effort: number | null;
  status: TrainingStatus;
  structure?: WorkoutBlock[];
}
export interface TrainingEntry extends TrainingDetails {
  id: string; kind: "workout" | "template"; date: string | null; version: number;
  planTitle?: string | null; planAssignmentId?: string | null;
  assignedBy?: string | null; coachCanEdit?: boolean; sourceId?: string | null;
}
export interface TrainingSnapshot {
  entries: TrainingEntry[]; templates: TrainingEntry[];
  athleteName?: string;
  usage: { workouts: number; templates: number; reads: number; writes: number; month: string };
}
export const EMPTY_TRAINING: TrainingDetails = { title: "", sport: "run", notes: "", plannedMinutes: null, plannedKm: null, actualMinutes: null, actualKm: null, effort: null, status: "planned", structure: [] };

export function isTrainingDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "2000-01-01" || value > "2100-12-31") return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function shiftTrainingDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function trainingWeek(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return shiftTrainingDate(date, -(day + 6) % 7);
}
export function trainingTotals(entries: TrainingEntry[]) {
  return entries.reduce((total, entry) => {
    total.sessions++;
    total.plannedMinutes += entry.plannedMinutes ?? 0;
    total.plannedKm += entry.plannedKm ?? 0;
    if (entry.status === "completed") {
      total.completed++;
      total.actualMinutes += entry.actualMinutes ?? 0;
      total.actualKm += entry.actualKm ?? 0;
    }
    if (entry.status === "skipped") total.skipped++;
    return total;
  }, { sessions: 0, completed: 0, skipped: 0, plannedMinutes: 0, plannedKm: 0, actualMinutes: 0, actualKm: 0 });
}

/** A selected-range export, with spreadsheet formula injection protection. */
export function trainingCsv(entries: TrainingEntry[]) {
  const cell = (value: unknown) => {
    let text = value == null ? "" : String(value);
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [
    ["Date", "Workout", "Sport", "Status", "Planned minutes", "Actual minutes", "Planned km", "Actual km", "Effort (1-10)", "Notes", "Workout steps", "Plan"],
    ...entries.map((entry) => [entry.date, entry.title, entry.sport, entry.status, entry.plannedMinutes, entry.actualMinutes, entry.plannedKm, entry.actualKm, entry.effort, entry.notes, structureText(entry.structure ?? []), entry.planTitle]),
  ].map((row) => row.map(cell).join(",")).join("\r\n");
}

/** Strip server-owned provenance before posting an edited workout. */
export function trainingInputEntry(entry: TrainingEntry): TrainingEntry {
  const { id, kind, date, version, title, sport, notes, plannedMinutes, plannedKm, actualMinutes, actualKm, effort, status } = entry;
  return { id, kind, date, version, title, sport, notes, plannedMinutes, plannedKm, actualMinutes, actualKm, effort, status, ...(entry.structure === undefined ? {} : { structure: entry.structure }) };
}
export interface TrainingRelationship {
  id: string; athleteName: string; athleteEmail: string; coachName: string;
  status: "pending" | "active" | "declined" | "revoked"; version: number; expired: boolean;
  planned: number; completed: number; skipped: number; actualMinutes: number;
}
export interface TrainingRoster {
  isCoach: boolean; athletes: TrainingRelationship[]; coaches: TrainingRelationship[];
  from: string; to: string;
}
