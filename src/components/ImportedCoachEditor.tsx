"use client";

import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { COACH_FOCUS_LABELS, FOCUS_ORDER, COACH_FORMAT_LABELS } from "@/data/coaches";
import type { ImportedCoachReview } from "@/lib/imported-coach-store";
import { accountInput } from "./AccountUI";

const subscribe = () => () => {};
export function ImportedCoachEditor({ entry }: { entry: ImportedCoachReview }) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [confirmHide, setConfirmHide] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  const inFlight = useRef(false);
  const excluded = ["duplicate", "invalid-profile"].includes(entry.importStatus);
  const profile = entry.profile;

  async function save(status: "draft" | "published" | "hidden") {
    if (inFlight.current || !form.current) return;
    const data = new FormData(form.current);
    const details = {
      name: data.get("name"), city: data.get("city"), location: data.get("location"), link: data.get("link"),
      format: data.get("format"), focus: data.getAll("focus"), blurb: data.get("blurb"), experience: data.get("experience"),
      specialties: String(data.get("specialties") ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
      bio: String(data.get("bio") ?? "").split(/\n\s*\n/).map((s) => s.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean),
    };
    inFlight.current = true; setPending(true); setError(false); setMessage("");
    try {
      const response = await fetch("/api/marketplace/imported-coaches", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ key: entry.key, version: entry.version, sourceRevision: entry.sourceRevision, status,
          ...(status !== "hidden" ? { profile: details } : {}), notes: data.get("notes"), confirmSource: data.get("confirmSource") === "on" }),
      });
      const result = await response.json();
      if (!response.ok || result.saved !== true) throw new Error(result.error || "This review could not be saved.");
      setMessage(status === "published" ? "Profile approved and published. It is still unclaimed." : status === "hidden" ? "Profile hidden from the directory." : "Draft saved. This profile is not public.");
      router.refresh();
    } catch (cause) {
      setError(true); setMessage(cause instanceof Error && cause.name !== "TimeoutError" ? cause.message : "Saving timed out. Retry this form; duplicate saves are checked.");
    } finally { inFlight.current = false; setPending(false); feedback.current?.focus(); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    void save(submitter?.value === "published" ? "published" : "draft");
  }
  return <form ref={form} onSubmit={submit} className="max-w-3xl space-y-8">
    <fieldset disabled={pending || !hydrated} className="space-y-6">
      <legend className="mb-4 text-2xl font-semibold">Directory details</legend>
      <p className="text-sm text-muted-foreground">Use factual descriptions from the coach’s own website. Do not infer expertise from isolated keywords. Complete the required fields to save a draft or publish.</p>
      <label className="block text-sm font-medium">Coach or business name<input name="name" defaultValue={profile?.name ?? entry.name} required minLength={2} maxLength={160} className={accountInput} /></label>
      <div className="grid gap-6 sm:grid-cols-2"><label className="block text-sm font-medium">City for directory filters<input name="city" defaultValue={profile?.city ?? ""} required maxLength={120} className={accountInput} /><span className="mt-2 block text-xs text-muted-foreground">Use the real city, including for coaches who also coach online.</span></label><label className="block text-sm font-medium">Display location<input name="location" defaultValue={profile?.location ?? entry.location} required maxLength={200} className={accountInput} /></label></div>
      <label className="block text-sm font-medium">Coach website / source<input name="link" type="url" defaultValue={profile?.link ?? ""} required maxLength={2048} className={accountInput} /><span className="mt-2 block text-xs text-muted-foreground">An independent coaching website. This is also the public contact link. No tracking parameters.</span></label>
      <label className="block text-sm font-medium">Coaching format<select name="format" defaultValue={profile?.format ?? ""} required className={accountInput}><option value="" disabled>Choose a format</option>{Object.entries(COACH_FORMAT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <fieldset><legend className="text-sm font-medium">Training focus — select at least one supported by the source</legend><div className="mt-4 grid gap-4 sm:grid-cols-2">{FOCUS_ORDER.map((focus) => <label key={focus} className="flex items-center gap-2 text-sm"><input type="checkbox" name="focus" value={focus} defaultChecked={profile?.focus.includes(focus)} className="accent-brand" />{COACH_FOCUS_LABELS[focus]}</label>)}</div></fieldset>
      <label className="block text-sm font-medium">Specialties — one per line<textarea name="specialties" defaultValue={profile?.specialties.join("\n") ?? ""} required maxLength={1450} rows={4} className={accountInput} /></label>
      <label className="block text-sm font-medium">Experience (optional)<input name="experience" defaultValue={profile?.experience ?? ""} maxLength={120} className={accountInput} /></label>
      <label className="block text-sm font-medium">Short directory summary<textarea name="blurb" defaultValue={profile?.blurb ?? ""} required minLength={20} maxLength={320} rows={3} className={accountInput} /></label>
      <label className="block text-sm font-medium">Profile description<textarea name="bio" defaultValue={profile?.bio.join("\n\n") ?? ""} required maxLength={7200} rows={6} className={accountInput} /><span className="mt-2 block text-xs text-muted-foreground">Up to six paragraphs, separated by a blank line.</span></label>
      <label className="block text-sm font-medium">Private review note<input name="notes" defaultValue={entry.notes} maxLength={1000} className={accountInput} /><span className="mt-2 block text-xs text-muted-foreground">Visible only to administrators; never shown on the public profile.</span></label>
      {excluded ? <p className="text-sm text-muted-foreground">This record was excluded by the importer. You can keep a note or hide it, but cannot publish it.</p> : <label className="flex items-start gap-4 text-sm"><input type="checkbox" name="confirmSource" className="mt-1 accent-brand" /><span>I checked the website, identity, location, format, and specialties. Publishing does not verify ownership or imply a partnership with Anystride.</span></label>}
      <div className="flex flex-wrap gap-4">{!excluded && <button type="submit" value="published" className="action-primary">{pending ? "Saving…" : "Approve and publish"}</button>}<button type="submit" value="draft" className="rounded-lg border border-border px-3 py-2 text-base font-semibold hover:text-brand focus-visible:outline-2 focus-visible:outline-brand">Save draft (not public)</button></div>
      {entry.visible && <p className="text-sm text-muted-foreground">Saving a draft removes the current listing from public view until it is approved again.</p>}
      {entry.status !== "hidden" && <div className="border-t border-border pt-6">{!confirmHide ? <button type="button" onClick={() => setConfirmHide(true)} className="text-sm font-semibold underline hover:text-brand">Hide this listing</button> : <div className="space-y-4"><p className="text-sm">Hide this profile from the directory, direct profile page, and sitemap? Saved details are kept so you can publish it again later.</p><div className="flex flex-wrap gap-4"><button type="button" onClick={() => void save("hidden")} className="rounded-lg bg-foreground px-3 py-2 text-base font-semibold text-background hover:bg-brand">Confirm hide</button><button type="button" onClick={() => setConfirmHide(false)} className="text-sm underline">Keep listing</button></div></div>}</div>}
    </fieldset>
    <p ref={feedback} role={error ? "alert" : "status"} tabIndex={-1} className={`text-sm ${error ? "text-red-700 dark:text-red-400" : "text-muted-foreground"}`}>{message}</p>
    <noscript>Enable JavaScript to review imported coaches.</noscript>
  </form>;
}
