import type { PlanWeek, Workout } from "@/data/types";

export type DistanceUnit = "mi" | "km";

export interface SavedPlanProgress {
  active: boolean;
  startDate: string;
  unit: DistanceUnit;
  completedWorkoutIds: string[];
  updatedAt: string;
}

export const EMPTY_PLAN_PROGRESS: SavedPlanProgress = {
  active: false,
  startDate: "",
  unit: "mi",
  completedWorkoutIds: [],
  updatedAt: "",
};

const MILES_TO_KILOMETRES = 1.609344;
const DAY_IN_MS = 86_400_000;

function parseDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

export function parseLocalDate(date: string): Date | null {
  const parts = parseDateParts(date);
  if (!parts) return null;

  const parsed = new Date(parts.year, parts.month - 1, parts.day, 12);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateOrdinal(date: string) {
  const parts = parseDateParts(date);
  if (!parts) return null;
  return Date.UTC(parts.year, parts.month - 1, parts.day) / DAY_IN_MS;
}

function localDateOrdinal(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_IN_MS;
}

export type PlanPhase =
  | { kind: "not-started"; week: 1 }
  | { kind: "upcoming"; week: 1; daysUntilStart: number }
  | { kind: "active"; week: number }
  | { kind: "complete"; week: number };

export function getPlanPhase(
  startDate: string,
  durationWeeks: number,
  today = new Date(),
): PlanPhase {
  const start = dateOrdinal(startDate);
  if (start === null) return { kind: "not-started", week: 1 };

  const elapsedDays = localDateOrdinal(today) - start;
  if (elapsedDays < 0) {
    return {
      kind: "upcoming",
      week: 1,
      daysUntilStart: Math.abs(elapsedDays),
    };
  }

  const week = Math.floor(elapsedDays / 7) + 1;
  if (week > durationWeeks) {
    return { kind: "complete", week: durationWeeks };
  }

  return { kind: "active", week };
}

export function getPlanDay(startDate: string, dayOffset: number) {
  const date = parseLocalDate(startDate);
  if (!date) return null;
  date.setDate(date.getDate() + dayOffset);
  return date;
}

export function workoutId(week: number, dayIndex: number) {
  return `${week}:${dayIndex}`;
}

function displayKilometres(miles: number) {
  const kilometres = miles * MILES_TO_KILOMETRES;
  const rounded = Math.round(kilometres * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Full schedules are authored in their source units. This changes only the
 * display label, leaving the plan data and recommendation calculations intact.
 */
export function workoutLabel(workout: Workout, unit: DistanceUnit) {
  if (unit === "mi" || !/\bmi\b/i.test(workout.label)) {
    return workout.label;
  }

  let label = workout.label.replace(
    /(\d+(?:\.\d+)?)\s*mi\b/gi,
    (_, miles: string) => `${displayKilometres(Number(miles))} km`,
  );

  // Some source labels use shorthand after a total, such as
  // “3 mi: 1 easy + 1.5 tempo + 0.5 easy”. Convert those segments too.
  const colon = label.indexOf(":");
  if (colon !== -1) {
    const before = label.slice(0, colon + 1);
    const after = label.slice(colon + 1).replace(
      /(\d+(?:\.\d+)?)\s+(?=(?:easy|tempo|long|interval)\b)/gi,
      (_, miles: string) => `${displayKilometres(Number(miles))} km `,
    );
    label = before + after;
  }

  return label;
}

function formatCalendarDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatCalendarTimestamp(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeCalendarText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

interface CalendarPlan {
  slug: string;
  name: string;
  weeks: PlanWeek[];
}

export function buildPlanCalendar(
  plan: CalendarPlan,
  startDate: string,
  unit: DistanceUnit,
) {
  const generatedAt = formatCalendarTimestamp(new Date());
  const events = plan.weeks.flatMap((week, weekIndex) =>
    week.days.flatMap((workout, dayIndex) => {
      if (workout.type === "rest") return [];

      const date = getPlanDay(startDate, weekIndex * 7 + dayIndex);
      if (!date) return [];
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      const label = workoutLabel(workout, unit);
      const description = [
        `Week ${week.week}${week.focus ? ` · ${week.focus}` : ""}`,
        workout.note,
        "Plan saved locally with anystride.",
      ]
        .filter(Boolean)
        .join("\n\n");

      return [
        "BEGIN:VEVENT",
        `UID:${plan.slug}-w${week.week}-d${dayIndex + 1}@anystride.com`,
        `DTSTAMP:${generatedAt}`,
        `DTSTART;VALUE=DATE:${formatCalendarDate(date)}`,
        `DTEND;VALUE=DATE:${formatCalendarDate(endDate)}`,
        `SUMMARY:${escapeCalendarText(`${plan.name}: ${label}`)}`,
        `DESCRIPTION:${escapeCalendarText(description)}`,
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
      ];
    }),
  );

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//anystride//Training Plan//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeCalendarText(plan.name)}`,
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
