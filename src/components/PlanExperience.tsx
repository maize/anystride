"use client";

import {
  type FormEvent,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { PlanWeek } from "@/data/types";
import { WeekTable } from "@/components/WeekTable";
import {
  buildPlanCalendar,
  EMPTY_PLAN_PROGRESS,
  getPlanPhase,
  parseLocalDate,
  type SavedPlanProgress,
} from "@/lib/plan-progress";

interface PlanExperienceProps {
  plan: {
    slug: string;
    name: string;
    durationWeeks: number;
    weeks: PlanWeek[];
  };
}

interface ProgressStore {
  getSnapshot: () => SavedPlanProgress;
  getServerSnapshot: () => SavedPlanProgress;
  subscribe: (listener: () => void) => () => void;
  update: (
    updateProgress: (current: SavedPlanProgress) => SavedPlanProgress,
  ) => void;
}

const progressStores = new Map<string, ProgressStore>();

function readSavedProgress(value: string | null): SavedPlanProgress {
  if (!value) return EMPTY_PLAN_PROGRESS;

  try {
    const parsed = JSON.parse(value) as Partial<SavedPlanProgress>;
    if (
      typeof parsed.active !== "boolean" ||
      typeof parsed.startDate !== "string" ||
      (parsed.unit !== "mi" && parsed.unit !== "km") ||
      !Array.isArray(parsed.completedWorkoutIds)
    ) {
      return EMPTY_PLAN_PROGRESS;
    }

    return {
      active: parsed.active,
      startDate: parsed.startDate,
      unit: parsed.unit,
      completedWorkoutIds: parsed.completedWorkoutIds.filter(
        (id): id is string => typeof id === "string",
      ),
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return EMPTY_PLAN_PROGRESS;
  }
}

function getProgressStore(slug: string): ProgressStore {
  const existingStore = progressStores.get(slug);
  if (existingStore) return existingStore;

  const storageKey = `anystride:plan:${slug}:v1`;
  const listeners = new Set<() => void>();
  let current = EMPTY_PLAN_PROGRESS;
  let initialized = false;

  function getSnapshot() {
    if (!initialized && typeof window !== "undefined") {
      try {
        current = readSavedProgress(window.localStorage.getItem(storageKey));
      } catch {
        current = EMPTY_PLAN_PROGRESS;
      }
      initialized = true;
    }
    return current;
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);

    function handleStorage(event: StorageEvent) {
      if (event.key !== storageKey) return;
      current = readSavedProgress(event.newValue);
      initialized = true;
      listeners.forEach((notify) => notify());
    }

    window.addEventListener("storage", handleStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", handleStorage);
    };
  }

  const store: ProgressStore = {
    getSnapshot,
    getServerSnapshot: () => EMPTY_PLAN_PROGRESS,
    subscribe,
    update(updateProgress) {
      const next = updateProgress(getSnapshot());
      current = next;
      initialized = true;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // The plan still works for this visit when storage is unavailable.
      }
      listeners.forEach((listener) => listener());
    },
  };

  progressStores.set(slug, store);
  return store;
}

function formatDate(date: string) {
  const parsed = parseLocalDate(date);
  if (!parsed) return "your chosen date";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export function PlanExperience({ plan }: PlanExperienceProps) {
  const store = useMemo(() => getProgressStore(plan.slug), [plan.slug]);
  const progress = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const [formError, setFormError] = useState("");
  const phase = getPlanPhase(progress.startDate, plan.durationWeeks);
  const completed = useMemo(
    () => new Set(progress.completedWorkoutIds),
    [progress.completedWorkoutIds],
  );
  const totalWorkouts = useMemo(
    () =>
      plan.weeks.reduce(
        (total, week) =>
          total + week.days.filter((workout) => workout.type !== "rest").length,
        0,
      ),
    [plan.weeks],
  );
  const resumeWeek = phase.week;
  const planIsActive = progress.active && phase.kind !== "not-started";
  const calendarHref = planIsActive
    ? `data:text/calendar;charset=utf-8,${encodeURIComponent(
        buildPlanCalendar(plan, progress.startDate, progress.unit),
      )}`
    : "";

  function updateProgress(
    changes: Partial<Omit<SavedPlanProgress, "updatedAt">>,
  ) {
    store.update((current) => ({
      ...current,
      ...changes,
      updatedAt: new Date().toISOString(),
    }));
  }

  function startPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!progress.startDate || !parseLocalDate(progress.startDate)) {
      setFormError("Choose the date for your first training day.");
      return;
    }

    setFormError("");
    updateProgress({ active: true });
  }

  function toggleWorkout(id: string, checked: boolean) {
    store.update((current) => {
      const workoutIds = new Set(current.completedWorkoutIds);
      if (checked) workoutIds.add(id);
      else workoutIds.delete(id);

      return {
        ...current,
        completedWorkoutIds: [...workoutIds],
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function scrollToWeek() {
    document
      .getElementById(`week-${resumeWeek}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  let statusHeading = "Set your plan in motion";
  let statusCopy =
    "Choose a start date and distance units. Your progress stays on this device.";

  if (planIsActive) {
    if (phase.kind === "upcoming") {
      statusHeading = `Your plan starts in ${phase.daysUntilStart} ${
        phase.daysUntilStart === 1 ? "day" : "days"
      }`;
      statusCopy = `Week 1 begins ${formatDate(progress.startDate)}.`;
    } else if (phase.kind === "active") {
      statusHeading = `Resume week ${phase.week} of ${plan.durationWeeks}`;
      statusCopy = `${completed.size} of ${totalWorkouts} workouts marked complete.`;
    } else if (phase.kind === "complete") {
      statusHeading = "You reached the end of the plan";
      statusCopy = `${completed.size} of ${totalWorkouts} workouts marked complete.`;
    }
  }

  return (
    <>
      <section
        aria-labelledby="plan-setup-heading"
        className="mt-10 rounded-xl border border-border bg-muted p-5 print:hidden sm:p-6"
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)] lg:items-end">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Your training plan
            </p>
            <h2
              id="plan-setup-heading"
              className="mt-1 text-2xl font-semibold tracking-tight"
              aria-live="polite"
            >
              {statusHeading}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {statusCopy}
            </p>
          </div>

          <form onSubmit={startPlan} className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Plan starts
              <input
                type="date"
                value={progress.startDate}
                onChange={(event) => {
                  setFormError("");
                  updateProgress({
                    startDate: event.target.value,
                    active: event.target.value ? progress.active : false,
                  });
                }}
                required
                aria-describedby={formError ? "plan-start-error" : undefined}
                className="mt-1.5 block w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
              />
            </label>

            <fieldset>
              <legend className="text-sm font-medium">Distance units</legend>
              <div className="mt-1.5 grid grid-cols-2 rounded-lg border border-border bg-background p-1">
                {([
                  ["mi", "Miles"],
                  ["km", "Kilometers"],
                ] as const).map(([unit, label]) => (
                  <button
                    key={unit}
                    type="button"
                    aria-pressed={progress.unit === unit}
                    onClick={() => updateProgress({ unit })}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-300 ease-stride active:scale-[0.98] ${
                      progress.unit === unit
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {formError && (
              <p
                id="plan-start-error"
                role="alert"
                className="text-sm font-semibold text-foreground sm:col-span-2"
              >
                {formError}
              </p>
            )}

            {!planIsActive && (
              <button
                type="submit"
                className="rounded-full bg-foreground px-4 py-2 text-base font-semibold text-background transition-all duration-300 ease-stride hover:opacity-80 active:scale-[0.98] sm:col-span-2 sm:justify-self-start"
              >
                Start this plan
              </button>
            )}
          </form>
        </div>

        {planIsActive && (
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
            <button
              type="button"
              onClick={scrollToWeek}
              className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-all duration-300 ease-stride hover:opacity-80 active:scale-[0.98]"
            >
              Go to week {resumeWeek}
            </button>
            <a
              href={calendarHref}
              download={`${plan.slug}-training-plan.ics`}
              className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold transition-all duration-300 ease-stride hover:border-foreground active:scale-[0.98]"
            >
              Download calendar
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-all duration-300 ease-stride hover:text-foreground active:scale-[0.98]"
            >
              Print plan
            </button>
            <p className="w-full pt-1 text-xs text-muted-foreground sm:ml-auto sm:w-auto sm:pt-0">
              Saved only in this browser. No account needed.
            </p>
          </div>
        )}
      </section>

      <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            The plan, week by week
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {progress.unit === "km"
              ? "Distances are shown in kilometers."
              : "Distances are shown in miles."}
          </p>
        </div>
        {!planIsActive && (
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold transition-all duration-300 ease-stride hover:border-foreground active:scale-[0.98] print:hidden"
          >
            Print plan
          </button>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {plan.weeks.map((week, weekIndex) => (
          <WeekTable
            key={week.week}
            week={week}
            weekStartDate={
              planIsActive ? progress.startDate : undefined
            }
            weekIndex={weekIndex}
            unit={progress.unit}
            isCurrent={
              planIsActive &&
              phase.kind === "active" &&
              resumeWeek === week.week
            }
            completedWorkoutIds={completed}
            onToggleWorkout={planIsActive ? toggleWorkout : undefined}
          />
        ))}
      </div>
    </>
  );
}
