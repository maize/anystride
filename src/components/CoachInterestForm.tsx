"use client";

import { useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";

type Status = "idle" | "submitting" | "done" | "error";

/** Fire a GA4 lead event — silently no-ops when GA isn't loaded. */
function trackLead(role: "runner" | "coach") {
  if (typeof window !== "undefined" && window.dataLayer) {
    sendGAEvent("event", "generate_lead", { role, source: "coaching" });
  }
}

export function CoachInterestForm() {
  const [email, setEmail] = useState("");
  const [goal, setGoal] = useState("");
  const [role, setRole] = useState<"runner" | "coach">("runner");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/coach-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, goal, role }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Something went wrong.");
      }
      trackLead(role);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-xl border border-border bg-muted p-6">
        <p className="font-semibold">You&apos;re on the list. 🎉</p>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll email you the moment coach matching goes live. Thanks for
          helping us figure out what to build next.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border p-6">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setRole("runner")}
          className={
            role === "runner"
              ? "rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-brand-foreground"
              : "rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:border-brand"
          }
        >
          I&apos;m a runner
        </button>
        <button
          type="button"
          onClick={() => setRole("coach")}
          className={
            role === "coach"
              ? "rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-brand-foreground"
              : "rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:border-brand"
          }
        >
          I&apos;m a coach
        </button>
      </div>

      <label className="mt-5 block text-sm font-medium" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
      />

      <label className="mt-4 block text-sm font-medium" htmlFor="goal">
        {role === "coach"
          ? "What do you coach? (optional)"
          : "What are you training for? (optional)"}
      </label>
      <input
        id="goal"
        type="text"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder={
          role === "coach"
            ? "e.g. first-marathon runners, 5K speed"
            : "e.g. my first half marathon"
        }
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
      />

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-5 w-full rounded-full bg-brand px-6 py-2.5 font-medium text-brand-foreground hover:opacity-90 disabled:opacity-60"
      >
        {status === "submitting" ? "Submitting…" : "Notify me"}
      </button>
      <p className="mt-3 text-xs text-muted-foreground">
        No spam — just one email when coaching launches.
      </p>
    </form>
  );
}
