"use client";

import { useState } from "react";
import Link from "next/link";
import {
  computePaces,
  DISTANCES_M,
  formatPace,
  formatTime,
  parseTime,
  RACE_LABELS,
  ZONE_BLURB,
  ZONE_LABELS,
  type RaceKey,
} from "@/lib/paces";
import { recommendPlans, type PlanRecommendation } from "@/lib/recommend";
import { DISTANCE_LABELS, type Distance } from "@/data/types";

type Basis = "recent" | "goal";

const FIT_STYLES: Record<PlanRecommendation["fit"], string> = {
  ready: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  stretch: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  build: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
};
const FIT_LABEL: Record<PlanRecommendation["fit"], string> = {
  ready: "Ready to start",
  stretch: "A small stretch",
  build: "Build base first",
};

// Distances offered for the goal/recommender (no 1-mile plans in the catalog).
const GOAL_DISTANCES: Distance[] = ["5k", "10k", "half-marathon", "marathon"];

export function PaceCalculator() {
  const [raceKey, setRaceKey] = useState<RaceKey>("5k");
  const [time, setTime] = useState("");
  const [basis, setBasis] = useState<Basis>("recent");
  const [mileage, setMileage] = useState("");
  const [goal, setGoal] = useState<Distance>("half-marathon");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof computePaces> | null>(null);
  const [recs, setRecs] = useState<PlanRecommendation[] | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const sec = parseTime(time);
    if (sec === null || sec <= 0) {
      setError("Enter a time as MM:SS or H:MM:SS (e.g. 24:30 or 1:45:00).");
      setResult(null);
      setRecs(null);
      return;
    }
    const res = computePaces(DISTANCES_M[raceKey], sec);
    setResult(res);

    const mpw = Number(mileage);
    if (mileage.trim() !== "" && Number.isFinite(mpw) && mpw >= 0) {
      setRecs(recommendPlans({ distance: goal, weeklyMileage: Math.round(mpw) }));
    } else {
      setRecs(null);
    }
  }

  return (
    <div>
      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-border p-6"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium" htmlFor="race">
              Distance
            </label>
            <select
              id="race"
              value={raceKey}
              onChange={(e) => setRaceKey(e.target.value as RaceKey)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {(Object.keys(DISTANCES_M) as RaceKey[]).map((k) => (
                <option key={k} value={k}>
                  {RACE_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium" htmlFor="time">
              Time (MM:SS or H:MM:SS)
            </label>
            <input
              id="time"
              type="text"
              inputMode="numeric"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="e.g. 24:30"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
        </div>

        <div className="mt-4">
          <span className="text-sm font-medium">This time is my…</span>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setBasis("recent")}
              className={
                basis === "recent"
                  ? "rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-brand-foreground"
                  : "rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:border-brand"
              }
            >
              Recent result
            </button>
            <button
              type="button"
              onClick={() => setBasis("goal")}
              className={
                basis === "goal"
                  ? "rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-brand-foreground"
                  : "rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:border-brand"
              }
            >
              Goal time
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium" htmlFor="mileage">
              Current weekly mileage{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              id="mileage"
              type="number"
              min={0}
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              placeholder="e.g. 20"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="goal">
              Training for{" "}
              <span className="font-normal text-muted-foreground">
                (for plan picks)
              </span>
            </label>
            <select
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value as Distance)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {GOAL_DISTANCES.map((d) => (
                <option key={d} value={d}>
                  {DISTANCE_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="mt-6 w-full rounded-full bg-brand px-6 py-2.5 font-medium text-brand-foreground hover:opacity-90 sm:w-auto sm:px-10"
        >
          Calculate
        </button>
      </form>

      {result && (
        <div className="mt-8 space-y-8">
          {/* VDOT */}
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-brand px-3 py-1 text-sm font-semibold text-brand-foreground">
              VDOT {result.vdot.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">
              {basis === "goal"
                ? "Fitness you'll need for that goal."
                : "Your current fitness score."}
            </span>
          </div>

          {/* Predicted times */}
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {basis === "goal" ? "Goal-equivalent times" : "Equivalent race times"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              What that fitness is worth at every distance (Riegel prediction).
            </p>
            <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-5">
              {result.predictions.map((p) => (
                <div key={p.race} className="bg-background p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {RACE_LABELS[p.race]}
                  </div>
                  <div className="mt-0.5 text-base font-semibold">
                    {formatTime(p.timeSec)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Training paces */}
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Your training paces
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use these for the workouts in any AnyStride plan.
            </p>
            <div className="mt-3 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Zone</th>
                    <th className="px-4 py-2 font-medium">/ mile</th>
                    <th className="px-4 py-2 font-medium">/ km</th>
                    <th className="hidden px-4 py-2 font-medium sm:table-cell">
                      What it&apos;s for
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.zones.map((z) => (
                    <tr key={z.zone} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-semibold">
                        {ZONE_LABELS[z.zone]}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatPace(z.secPerMile)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatPace(z.secPerKm)}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {ZONE_BLURB[z.zone]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recommendations */}
          {recs && (
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Plans that fit you
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                For a {DISTANCE_LABELS[goal]} goal at ~{Math.round(Number(mileage))}{" "}
                miles/week.
              </p>
              {recs.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No {DISTANCE_LABELS[goal]} plans yet — more coming soon.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {recs.map((r) => (
                    <Link
                      key={r.plan.slug}
                      href={`/plans/${r.plan.slug}`}
                      className="flex flex-col gap-1 rounded-xl border border-border p-4 transition hover:border-brand"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{r.plan.name}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${FIT_STYLES[r.fit]}`}
                        >
                          {FIT_LABEL[r.fit]}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {r.reason}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Estimates from public formulas (Riegel race prediction; Daniels–Gilbert
            VDOT for paces). Treat them as starting points and adjust to feel,
            terrain, heat, and how training is going.
          </p>
        </div>
      )}
    </div>
  );
}
