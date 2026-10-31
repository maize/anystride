import { shiftTrainingDate, type TrainingDetails } from "./training";
export const PLAN_LIMITS = { plans: 50, weeks: 24, sessions: 168, bytes: 262144, assignmentWorkouts: 500, assignments: 2000, historyPage: 20 } as const;
export interface PlanSession { id: string; day: number; workout: TrainingDetails }
export interface TrainingPlan { id: string; version: number; title: string; description: string; weeks: number; sessions: PlanSession[] }
export interface PlanSummary { id: string; version: number; title: string; description: string; weeks: number; sessionCount: number }
export interface PlanAssignment { id: string; planTitle: string; athleteName: string; relationshipId: string; startDate: string; weeks: number; workoutCount: number; status: "active" | "removed"; canManage: boolean }
export interface PlanLibrary { plans: PlanSummary[]; assignments: PlanAssignment[]; nextCursor: string | null }
export interface PlanPreview { title: string; startDate: string; endDate: string; firstWorkout: string; lastWorkout: string; workoutsPerAthlete: number; totalWorkouts: number; athletes: { id: string; name: string }[] }
export function planDates(plan: TrainingPlan, start: string) { return plan.sessions.map((session) => ({ ...session, date: shiftTrainingDate(start, session.day) })); }
export function planWeekTotals(plan: TrainingPlan, week: number) {
  const sessions = plan.sessions.filter((s) => Math.floor(s.day / 7) === week);
  return { sessions: sessions.length, minutes: sessions.reduce((n, s) => n + (s.workout.plannedMinutes ?? 0), 0), km: sessions.reduce((n, s) => n + (s.workout.plannedKm ?? 0), 0) };
}
