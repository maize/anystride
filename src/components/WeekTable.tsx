import {
  WORKOUT_LABELS,
  type PlanWeek,
  type WorkoutType,
} from "@/data/types";
import {
  dateInputValue,
  getPlanDay,
  type DistanceUnit,
  workoutId,
  workoutLabel,
} from "@/lib/plan-progress";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TYPE_DOT: Record<WorkoutType, string> = {
  rest: "bg-border",
  "walk-run": "bg-amber-400",
  easy: "bg-emerald-400",
  long: "bg-sky-400",
  tempo: "bg-orange-400",
  interval: "bg-red-400",
  cross: "bg-violet-400",
  race: "bg-brand",
};

interface WeekTableProps {
  week: PlanWeek;
  weekIndex?: number;
  weekStartDate?: string;
  unit?: DistanceUnit;
  isCurrent?: boolean;
  completedWorkoutIds?: ReadonlySet<string>;
  onToggleWorkout?: (id: string, checked: boolean) => void;
}

export function WeekTable({
  week,
  weekIndex = week.week - 1,
  weekStartDate,
  unit = "mi",
  isCurrent = false,
  completedWorkoutIds = new Set<string>(),
  onToggleWorkout,
}: WeekTableProps) {
  return (
    <section
      id={`week-${week.week}`}
      aria-current={isCurrent ? "step" : undefined}
      className={`scroll-mt-24 break-inside-avoid rounded-xl border ${
        isCurrent ? "border-foreground" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Week {week.week}</h3>
          {isCurrent && (
            <span className="rounded-md bg-foreground px-2 py-0.5 text-xs font-medium text-background print:hidden">
              Current week
            </span>
          )}
        </div>
        <span className="text-right text-xs font-medium text-muted-foreground">
          {week.focus}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4 lg:grid-cols-7">
        {week.days.map((workout, dayIndex) => {
          const date = weekStartDate
            ? getPlanDay(weekStartDate, weekIndex * 7 + dayIndex)
            : null;
          const id = workoutId(week.week, dayIndex);
          const isComplete = completedWorkoutIds.has(id);
          const dayName = date
            ? new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(
                date,
              )
            : DAY_NAMES[dayIndex];

          return (
            <div
              key={id}
              className="flex flex-col gap-1 bg-background p-3 last:col-span-2 sm:last:col-span-2 lg:last:col-span-1"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {dayName}
                </span>
                {date && (
                  <time
                    dateTime={dateInputValue(date)}
                    className="text-xs tabular-nums text-muted-foreground"
                  >
                    {new Intl.DateTimeFormat(undefined, {
                      month: "short",
                      day: "numeric",
                    }).format(date)}
                  </time>
                )}
              </div>
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${TYPE_DOT[workout.type]}`}
                />
                {WORKOUT_LABELS[workout.type]}
              </span>
              <span
                className={`text-sm leading-snug ${
                  isComplete ? "text-muted-foreground line-through" : ""
                }`}
              >
                {workoutLabel(workout, unit)}
              </span>
              {workout.note && (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {workout.note}
                </p>
              )}
              {onToggleWorkout && workout.type !== "rest" && (
                <label className="mt-auto flex cursor-pointer items-center gap-2 pt-3 text-xs font-medium print:hidden">
                  <input
                    type="checkbox"
                    checked={isComplete}
                    aria-label={`Mark ${dayName}, week ${week.week}, ${workoutLabel(
                      workout,
                      unit,
                    )} complete`}
                    onChange={(event) =>
                      onToggleWorkout(id, event.target.checked)
                    }
                    className="h-4 w-4 accent-brand"
                  />
                  <span>Workout complete</span>
                </label>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
