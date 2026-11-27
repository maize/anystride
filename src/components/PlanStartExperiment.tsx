"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { trackProductEvent, trackProductEventOnce } from "@/lib/analytics";
import {
  PLAN_START_EXPERIMENT_ID,
  planActivationParameters,
  planStartModuleCopy,
  type PlanAlternative,
  type PlanExperimentVariant,
} from "@/lib/plan-experiment";
import { buildWeekMarkerCalendar, getPlanPhase, parseLocalDate, type SavedPlanProgress } from "@/lib/plan-progress";
import { getProgressStore } from "@/lib/plan-progress-store";
import { usePlanActivationFunnel, usePlanActivationView } from "@/lib/use-plan-activation";
import { usePlanExperiment } from "@/lib/use-plan-experiment";

interface PlanStartExperimentProps {
  slug: string;
  name: string;
  durationWeeks: number;
  kind: "full" | "explainer";
  alternatives: PlanAlternative[];
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

function focusStart() {
  document.getElementById("plan-setup")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const input = document.getElementById("plan-start-date");
  if (input instanceof HTMLElement) input.focus({ preventScroll: true });
}

function Alternatives({ alternatives }: { alternatives: PlanAlternative[] }) {
  if (alternatives.length === 0) return null;
  return (
    <div id="plan-alternatives" className="mt-4">
      <p className="text-sm font-semibold">Not ready to start?</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {alternatives.map((alternative) => (
          <li key={alternative.href}>
            <Link href={alternative.href} className="text-sm font-medium text-brand underline underline-offset-2">
              {alternative.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StartBar({ hidden, label, onStart }: { hidden: boolean; label: string; onStart: () => void }) {
  useEffect(() => {
    if (hidden) return;
    const narrow = window.matchMedia("(max-width: 1023px)");
    if (!narrow.matches) return;
    const previous = document.body.style.paddingBottom;
    const apply = () => {
      document.body.style.paddingBottom = narrow.matches ? "5.5rem" : previous;
    };
    apply();
    narrow.addEventListener("change", apply);
    return () => {
      narrow.removeEventListener("change", apply);
      document.body.style.paddingBottom = previous;
    };
  }, [hidden]);

  return (
    <div className={`fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur print:hidden lg:hidden ${hidden ? "hidden" : ""}`}>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <a href="#plan-alternatives" className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-brand hover:underline">
          Not ready to start?
        </a>
        <button type="button" onClick={onStart} className="action-primary">
          {label}
        </button>
      </div>
    </div>
  );
}

function ExplainerStart({
  slug,
  name,
  durationWeeks,
  variant,
  alternatives,
}: PlanStartExperimentProps & { variant: PlanExperimentVariant }) {
  const store = useMemo(() => getProgressStore(slug), [slug]);
  const progress = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const [formError, setFormError] = useState("");
  const sectionRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const phase = getPlanPhase(progress.startDate, durationWeeks);
  const planIsActive = progress.active && phase.kind !== "not-started";
  const activation = usePlanActivationFunnel(slug, variant, planIsActive);
  usePlanActivationView(sectionRef, slug, variant);
  const [inView, setInView] = useState(false);
  const calendar = planIsActive ? buildWeekMarkerCalendar({ slug, name, durationWeeks }, progress.startDate) : null;
  const calendarHref = calendar ? `data:text/calendar;charset=utf-8,${encodeURIComponent(calendar)}` : "";

  useEffect(() => {
    const node = formRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    // The bar sits on the bottom edge, so the form counts as visible only when it clears that bar.
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry?.isIntersecting ?? false);
    }, { rootMargin: "0px 0px -88px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function updateProgress(changes: Partial<Omit<SavedPlanProgress, "updatedAt">>) {
    store.update((current) => ({
      ...current,
      ...changes,
      updatedAt: new Date().toISOString(),
    }));
  }

  function startPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startDate = new FormData(event.currentTarget).get("startDate");
    if (typeof startDate !== "string" || !parseLocalDate(startDate)) {
      setFormError("Choose the date for your first training day.");
      return;
    }
    setFormError("");
    updateProgress({ active: true, startDate });
    activation.markActivated();
    trackProductEvent("plan_activated", planActivationParameters(slug, variant));
  }

  let statusHeading = "Start this plan";
  let statusCopy = planStartModuleCopy("explainer", durationWeeks);
  if (planIsActive) {
    if (phase.kind === "upcoming") {
      statusHeading = `Your plan starts in ${phase.daysUntilStart} ${phase.daysUntilStart === 1 ? "day" : "days"}`;
      statusCopy = `Week 1 begins ${formatDate(progress.startDate)}. The calendar marks each of the ${durationWeeks} weeks.`;
    } else if (phase.kind === "active") {
      statusHeading = `Week ${phase.week} of ${durationWeeks}`;
      statusCopy = `Week 1 began ${formatDate(progress.startDate)}. Download the week markers, or keep the date saved in this browser.`;
    } else if (phase.kind === "complete") {
      statusHeading = "You reached the end of the plan";
      statusCopy = `The ${durationWeeks} week markers run from ${formatDate(progress.startDate)}.`;
    }
  }

  return (
    <>
      <section
        id="plan-setup"
        ref={sectionRef}
        aria-labelledby="plan-setup-heading"
        className="scroll-mt-6 rounded-xl border border-border bg-muted p-5 print:hidden sm:p-6"
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.85fr)] lg:items-end">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Free on this device</p>
            <p id="plan-setup-heading" className="mt-1 text-2xl font-semibold tracking-tight" aria-live="polite">
              {statusHeading}
            </p>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{statusCopy}</p>
            <Alternatives alternatives={alternatives} />
          </div>
          <form ref={formRef} onSubmit={startPlan} className="grid gap-4">
            <label className="text-sm font-medium" htmlFor="plan-start-date">
              Plan starts
              <input
                id="plan-start-date"
                type="date"
                name="startDate"
                value={progress.startDate}
                onFocus={() => activation.begin("start_date")}
                onChange={(event) => {
                  setFormError("");
                  activation.begin("start_date");
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
            {formError && (
              <p id="plan-start-error" role="alert" className="text-sm font-semibold text-foreground">
                {formError}
              </p>
            )}
            {!planIsActive && (
              <button type="submit" className="action-primary w-full sm:w-auto sm:justify-self-start">
                Start this plan
              </button>
            )}
          </form>
        </div>
        {planIsActive && calendarHref && (
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
            <a
              href={calendarHref}
              download={`${slug}-week-markers.ics`}
              onClick={() => trackProductEvent("plan_calendar_download", planActivationParameters(slug, variant))}
              className="action-primary"
            >
              Download calendar
            </a>
            <p className="w-full pt-1 text-xs text-muted-foreground sm:ml-auto sm:w-auto sm:pt-0">
              Saved only in this browser. Week markers only — no daily workouts.
            </p>
          </div>
        )}
      </section>
      <StartBar hidden={inView} label={planIsActive ? "Your calendar" : "Start this plan"} onStart={focusStart} />
    </>
  );
}

function FullPlanPrompt({ durationWeeks, alternatives }: { durationWeeks: number; alternatives: PlanAlternative[] }) {
  const promptRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = promptRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? false));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <section ref={promptRef} aria-labelledby="plan-start-prompt" className="rounded-xl border border-border bg-muted p-5 print:hidden sm:p-6">
        <p className="text-sm font-medium text-muted-foreground">Free on this device</p>
        <p id="plan-start-prompt" className="mt-1 text-2xl font-semibold tracking-tight">Start this plan</p>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">{planStartModuleCopy("full", durationWeeks)}</p>
        <button type="button" onClick={focusStart} className="action-primary mt-4">
          Start this plan
        </button>
        <Alternatives alternatives={alternatives} />
      </section>
      <StartBar hidden={inView} label="Start this plan" onStart={focusStart} />
    </>
  );
}

export function PlanStartExperiment(props: PlanStartExperimentProps) {
  const variant = usePlanExperiment(props.slug);
  useEffect(() => {
    if (!variant) return;
    trackProductEventOnce(
      `plan-exposure:${PLAN_START_EXPERIMENT_ID}:${props.slug}`,
      "plan_experiment_exposure",
      planActivationParameters(props.slug, variant),
    );
  }, [props.slug, variant]);

  if (variant !== "treatment") return null;
  if (props.kind === "explainer") return <ExplainerStart {...props} variant={variant} />;
  return <FullPlanPrompt durationWeeks={props.durationWeeks} alternatives={props.alternatives} />;
}
