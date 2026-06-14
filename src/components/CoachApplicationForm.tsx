"use client";

import { useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";

type Status = "idle" | "submitting" | "done" | "error";

const field =
  "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand";

export function CoachApplicationForm({ claimSlug = "" }: { claimSlug?: string }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    location: "",
    website: "",
    focus: "",
    experience: "",
    message: "",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/coach-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, claimSlug }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Something went wrong.");
      }
      if (typeof window !== "undefined" && window.dataLayer) {
        sendGAEvent("event", "generate_lead", {
          source: claimSlug ? "coach_claim" : "coach_apply",
        });
      }
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-xl border border-border bg-muted p-6">
        <p className="font-semibold">Thanks — we&apos;ve got your details. 🎉</p>
        <p className="mt-1 text-sm text-muted-foreground">
          We review every coach personally and will be in touch about listing you
          on anystride.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium" htmlFor="name">
            Name *
          </label>
          <input id="name" required value={form.name} onChange={set("name")} className={field} />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="email">
            Email *
          </label>
          <input id="email" type="email" required value={form.email} onChange={set("email")} className={field} placeholder="you@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="location">
            Location
          </label>
          <input id="location" value={form.location} onChange={set("location")} className={field} placeholder="New York, NY" />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="website">
            Website / booking link
          </label>
          <input id="website" value={form.website} onChange={set("website")} className={field} placeholder="https://…" />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="focus">
            What you coach
          </label>
          <input id="focus" value={form.focus} onChange={set("focus")} className={field} placeholder="e.g. first marathon, 5K speed" />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="experience">
            Experience
          </label>
          <input id="experience" value={form.experience} onChange={set("experience")} className={field} placeholder="e.g. 8 years, RRCA certified" />
        </div>
      </div>

      <label className="mt-4 block text-sm font-medium" htmlFor="message">
        Anything else?
      </label>
      <textarea id="message" rows={3} value={form.message} onChange={set("message")} className={field} placeholder="Tell us about your coaching." />

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-5 w-full rounded-full bg-brand px-6 py-2.5 font-medium text-brand-foreground hover:opacity-90 disabled:opacity-60 sm:w-auto sm:px-10"
      >
        {status === "submitting" ? "Submitting…" : claimSlug ? "Claim my profile" : "Apply to be listed"}
      </button>
    </form>
  );
}
