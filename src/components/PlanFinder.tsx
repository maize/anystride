"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  DISTANCE_LABELS,
  LEVEL_LABELS,
} from "@/data/types";
import {
  FINDER_DISTANCES,
  WEEKLY_BASE_OPTIONS,
  findPlans,
  type FinderDistance,
  type PlanFinderCandidate,
  type WeeklyBase,
} from "@/lib/plan-finder";

const AVAILABLE_DAYS = [2, 3, 4, 5, 6];

function Choice({
  name,
  value,
  checked,
  label,
  detail,
  onChange,
  required = false,
}: {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  detail?: string;
  onChange: () => void;
  required?: boolean;
}) {
  return (
    <label className="group cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        required={required}
        className="peer sr-only"
      />
      <span className="flex h-full flex-col justify-center rounded-lg border border-border bg-background px-4 py-3 transition-all duration-300 ease-stride group-hover:-translate-y-0.5 group-hover:border-brand peer-checked:border-brand peer-checked:bg-brand/10 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
        <span className="font-medium">{label}</span>
        {detail && (
          <span className="mt-0.5 text-xs text-muted-foreground">{detail}</span>
        )}
      </span>
    </label>
  );
}

function Question({
  number,
  legend,
  description,
  children,
}: {
  number: string;
  legend: string;
  description: string;
  children: React.ReactNode;
}) {
  const descriptionId = `plan-finder-question-${number}`;

  return (
    <fieldset aria-describedby={descriptionId} className="border-t border-border py-6">
      <legend className="flex items-baseline gap-3 font-semibold">
        <span className="font-mono text-xs text-brand tabular-nums">{number}</span>
        {legend}
      </legend>
      <p id={descriptionId} className="mt-1 pl-8 text-sm text-muted-foreground">
        {description}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function PlanFinder({
  candidates,
}: {
  candidates: PlanFinderCandidate[];
}) {
  const [distance, setDistance] = useState<FinderDistance | null>(null);
  const [weeklyBase, setWeeklyBase] = useState<WeeklyBase | null>(null);
  const [availableDays, setAvailableDays] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const resultRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const result = useMemo(() => {
    if (!submitted || !distance || !weeklyBase || !availableDays) return null;
    return findPlans(candidates, { distance, weeklyBase, availableDays });
  }, [availableDays, candidates, distance, submitted, weeklyBase]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    window.requestAnimationFrame(() => {
      resultRef.current?.focus();
      if (window.innerWidth < 1024) {
        resultRef.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "start",
        });
      }
    });
  }

  function resetFinder() {
    setDistance(null);
    setWeeklyBase(null);
    setAvailableDays(null);
    setSubmitted(false);
    window.requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    });
  }

  return (
    <div>
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-brand">Plan finder</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          A plan you can actually start
        </h2>
        <p className="mt-3 text-muted-foreground">
          Answer three questions. We&apos;ll compare your goal, current running
          and real weekly availability with every plan in the library.
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-5 lg:items-start">
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="rounded-2xl bg-muted px-5 pb-6 pt-1 sm:px-8 sm:pb-8 lg:col-span-3"
        >
          <Question
            number="01"
            legend="What are you training for?"
            description="Choose the race distance you want this plan to prepare you for."
          >
            {FINDER_DISTANCES.map((option) => (
              <Choice
                key={option}
                name="finder-distance"
                value={option}
                checked={distance === option}
                label={DISTANCE_LABELS[option]}
                onChange={() => setDistance(option)}
                required
              />
            ))}
          </Question>

          <Question
            number="02"
            legend="How much do you run now?"
            description="Use a typical week, not your biggest recent week."
          >
            {WEEKLY_BASE_OPTIONS.map((option) => (
              <Choice
                key={option.value}
                name="finder-base"
                value={option.value}
                checked={weeklyBase === option.value}
                label={option.label}
                detail={option.detail}
                onChange={() => setWeeklyBase(option.value)}
                required
              />
            ))}
          </Question>

          <Question
            number="03"
            legend="How many days can you protect for running?"
            description="Pick a schedule you can repeat on busy weeks."
          >
            {AVAILABLE_DAYS.map((days) => (
              <Choice
                key={days}
                name="finder-days"
                value={String(days)}
                checked={availableDays === days}
                label={days === 6 ? "6 days or more" : `${days} days`}
                onChange={() => setAvailableDays(days)}
                required
              />
            ))}
          </Question>

          <button
            type="submit"
            className="mt-2 w-full rounded-full bg-brand px-6 py-2 text-base font-semibold text-brand-foreground transition-all duration-300 ease-stride hover:bg-brand/90 active:scale-[0.98] sm:w-auto"
          >
            Match me with a plan
          </button>
        </form>

        <aside
          ref={resultRef}
          tabIndex={-1}
          aria-labelledby="plan-finder-result-title"
          className="scroll-mt-24 rounded-2xl border border-border p-6 outline-none lg:sticky lg:top-24 lg:col-span-2 sm:p-8"
        >
          {!result ? (
            <div className="flex min-h-64 flex-col justify-between">
              <div>
                <p className="font-mono text-xs text-brand tabular-nums">YOUR MATCH</p>
                <h3
                  id="plan-finder-result-title"
                  className="mt-3 text-2xl font-semibold tracking-tight"
                >
                  Three answers, one clear place to start
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  We rank plans by opening mileage and days per week. You will
                  see the tradeoffs, not a mystery score.
                </p>
              </div>
              <p className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
                No login and no email required.
              </p>
            </div>
          ) : (
            <div aria-live="polite">
              <p className="font-mono text-xs text-brand tabular-nums">
                {result.primary.hasConstraint ? "CLOSEST MATCH" : "BEST MATCH"}
              </p>
              <h3
                id="plan-finder-result-title"
                className="mt-3 text-2xl font-semibold tracking-tight"
              >
                {result.primary.plan.name}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {LEVEL_LABELS[result.primary.plan.level]} ·{" "}
                {result.primary.plan.durationWeeks} weeks ·{" "}
                {result.primary.plan.daysPerWeek} days per week
              </p>
              <p className="mt-5 text-sm">{result.primary.plan.summary}</p>

              <h4 className="mt-6 text-sm font-semibold">Why it fits</h4>
              <ol className="mt-2">
                {result.primary.reasons.map((reason, index) => (
                  <li
                    key={reason}
                    className="grid grid-cols-[24px_1fr] gap-2 border-t border-border py-3 text-sm"
                  >
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ol>

              <Link
                href={`/plans/${result.primary.plan.slug}`}
                className="mt-3 block rounded-full bg-brand px-6 py-2 text-center text-base font-semibold text-brand-foreground transition-all duration-300 ease-stride hover:bg-brand/90 active:scale-[0.98]"
              >
                Open {result.primary.plan.name}
              </Link>

              {result.alternatives.length > 0 && (
                <div className="mt-7 border-t border-border pt-5">
                  <h4 className="text-sm font-semibold">Also consider</h4>
                  <div className="mt-3 space-y-2">
                    {result.alternatives.map(({ plan }) => (
                      <Link
                        key={plan.slug}
                        href={`/plans/${plan.slug}`}
                        className="group flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3 transition-all duration-300 ease-stride hover:-translate-y-0.5"
                      >
                        <span>
                          <span className="block text-sm font-medium group-hover:text-brand">
                            {plan.name}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {plan.daysPerWeek} days · starts near{" "}
                            {plan.weeklyVolume.start} miles
                          </span>
                        </span>
                        <span aria-hidden="true">→</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
                <Link
                  href={`/plans?distance=${result.primary.plan.distance}`}
                  className="font-medium text-brand hover:underline"
                >
                  See every {DISTANCE_LABELS[result.primary.plan.distance]} plan
                </Link>
                <button
                  type="button"
                  onClick={resetFinder}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  Start over
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
