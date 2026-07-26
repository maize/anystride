import {
  WORKOUT_LABELS,
  type PlanWeek,
  type WorkoutType,
} from "@/data/types";

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

export function WeekTable({ week }: { week: PlanWeek }) {
  return (
    <div className="rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-semibold">Week {week.week}</h3>
        {week.focus && (
          <span className="text-xs font-medium text-muted-foreground">
            {week.focus}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4 lg:grid-cols-7">
        {week.days.map((workout, i) => (
          <div
            key={i}
            className="flex flex-col gap-1 bg-background p-3"
            title={workout.note}
          >
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {DAY_NAMES[i]}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${TYPE_DOT[workout.type]}`} />
              {WORKOUT_LABELS[workout.type]}
            </span>
            <span className="text-sm leading-snug">{workout.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
