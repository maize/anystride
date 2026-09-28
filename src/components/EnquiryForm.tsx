"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { COACH_FORMATS, COACH_GOALS, PARTNER_TYPES, type EnquiryKind, type PartnerInterest } from "@/lib/enquiries";
import { trackProductEvent } from "@/lib/analytics";
import { enquiryProductEvent } from "@/lib/product-events";

const field = "mt-2 block w-full rounded-lg border border-border bg-background px-3 py-2 text-base";
const subscribe = () => () => {};
const hydrated = () => true;
const server = () => false;

export function EnquiryForm({ kind, pilot }: { kind: EnquiryKind; pilot?: "race_hub" }) {
  const ready = useSyncExternalStore(subscribe, hydrated, server);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [format, setFormat] = useState("online");
  const [interest, setInterest] = useState<PartnerInterest | "">(pilot === "race_hub" ? "race_hub" : "");
  const feedback = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const attempt = useRef<{ payload: string; id: string } | null>(null);
  const runner = kind === "coach_match";
  const raceHub = !runner && interest === "race_hub";

  useEffect(() => {
    if (status === "error" || status === "done") feedback.current?.focus();
  }, [status]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const payload = JSON.stringify({ ...values, kind, consent: values.consent === "on" });
    if (attempt.current?.payload !== payload) attempt.current = { payload, id: crypto.randomUUID() };
    inFlight.current = true;
    setStatus("submitting");
    setError("");
    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...JSON.parse(payload), id: attempt.current.id }),
        signal: AbortSignal.timeout(15_000),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error(result.error ?? "We could not save your enquiry.");
      if (result.created) trackProductEvent(enquiryProductEvent(kind, values.interest));
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error && err.name !== "TimeoutError" ? err.message : "The connection timed out. Retry the same request or email us.");
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }

  if (status === "done") return (
    <div ref={feedback} tabIndex={-1} role="status" className="rounded-xl border border-border bg-muted p-6">
      <h2 className="text-xl font-semibold">Your enquiry is saved.</h2>
      <p className="mt-3 text-muted-foreground">
        {runner
          ? "It is with Anystride for review. We have not shared your details with a coach. A match is not guaranteed, and this is not a booking."
          : raceHub
              ? "Your race hub request is with Anystride for review. No hub has been commissioned. Scope, timing and price would be agreed separately before work begins."
              : "It is with Anystride for review. No payment, placement or campaign has been booked. Any scope and price will be agreed separately."}
      </p>
      <Link href={runner ? "/coaching" : "/"} className="mt-5 inline-block text-sm font-medium text-brand hover:underline">
        {runner ? "Browse coaches while you wait →" : "Back to Anystride →"}
      </Link>
    </div>
  );

  return (
    <form onSubmit={submit} action="/api/enquiries" method="post" className="rounded-xl border border-border p-6" aria-busy={status === "submitting"}>
      <noscript><p className="mb-4">This form needs JavaScript. Email <a href="mailto:hello@anystride.com" className="underline">hello@anystride.com</a> instead.</p></noscript>
      <fieldset disabled={status === "submitting"} className="grid gap-5 sm:grid-cols-2">
        <legend className="sr-only">{runner ? "Coach matching enquiry" : raceHub ? "Race hub enquiry" : "Partnership enquiry"}</legend>
        <label className="text-sm font-medium">Name
          <input name="name" required maxLength={120} autoComplete="name" className={field} />
        </label>
        <label className="text-sm font-medium">Email
          <input name="email" type="email" required maxLength={254} autoComplete="email" className={field} />
        </label>
        {runner ? <>
          <label className="text-sm font-medium">What would you like help with?
            <select name="goal" required defaultValue="" className={field}>
              <option value="" disabled>Choose a goal</option>
              {Object.entries(COACH_GOALS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Coaching format
            <select name="format" value={format} onChange={(event) => setFormat(event.target.value)} className={field}>
              {Object.entries(COACH_FORMATS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium sm:col-span-2">City {format === "local" ? "(required for in-person coaching)" : "(optional)"}
            <input name="location" required={format === "local"} maxLength={120} autoComplete="address-level2" className={field} />
          </label>
        </> : <>
          {pilot === "race_hub" ? <input type="hidden" name="interest" value="race_hub" /> : <label className="text-sm font-medium sm:col-span-2">Partnership interest
            <select name="interest" required value={interest} onChange={(event) => setInterest(event.target.value as PartnerInterest)} className={field}>
              <option value="" disabled>Choose an option</option>
              {Object.entries(PARTNER_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>}
          <label className="text-sm font-medium sm:col-span-2">{raceHub ? "Race or organisation name" : "Organisation or coaching business"}
            <input name="organisation" required maxLength={160} autoComplete="organization" className={field} />
          </label>
          <label className="text-sm font-medium sm:col-span-2">{raceHub ? "Tell us about your race and what runners need" : "What would you like to discuss?"}
            <textarea name="message" required maxLength={1000} rows={4} className={field} aria-describedby="enquiry-message-help" />
            <span id="enquiry-message-help" className="mt-2 block text-xs font-normal text-muted-foreground">{raceHub ? "Include your event website, distance and planned date if known. " : "Include your event or business website if useful. "}No sensitive personal information, please. Up to 1,000 characters.</span>
          </label>
        </>}
        <div hidden aria-hidden="true">
          <label>Leave this empty<input name="companyFax" tabIndex={-1} autoComplete="off" /></label>
        </div>
        <label className="flex items-start gap-3 text-sm leading-relaxed sm:col-span-2">
          <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 shrink-0 accent-brand" />
          <span>Anystride may store these details and email me about this enquiry. This is not a newsletter signup{runner ? "; my details will not be sent to coaches without asking me first" : ""}.</span>
        </label>
      </fieldset>
      <p className="mt-4 text-xs text-muted-foreground">Read our <Link href="/privacy" className="underline underline-offset-4">privacy policy</Link>. You can request removal by emailing hello@anystride.com.</p>
      {status === "error" && <div ref={feedback} role="alert" tabIndex={-1} className="mt-5 rounded-lg border border-border bg-muted p-4 text-sm">{error} <a href="mailto:hello@anystride.com" className="underline">Email Anystride</a></div>}
      <button disabled={!ready || status === "submitting"} type="submit" className="mt-6 rounded-full bg-brand px-6 py-2 text-base font-semibold text-brand-foreground transition-colors duration-300 ease-stride hover:bg-brand/90 disabled:cursor-wait disabled:opacity-60">
        {status === "submitting" ? "Sending…" : runner ? "Request a conversation" : raceHub ? "Discuss a race hub" : "Send partnership enquiry"}
      </button>
      <p className="mt-3 text-xs text-muted-foreground">Prefer email? <a href="mailto:hello@anystride.com" className="underline underline-offset-4">hello@anystride.com</a></p>
    </form>
  );
}
