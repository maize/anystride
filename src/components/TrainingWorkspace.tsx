"use client";

import { useRef, useState, type FormEvent } from "react";
import { WorkoutStructureEditor, WorkoutStructureSummary } from "./WorkoutStructure";
import { StravaCalendarProvider, StravaCalendarDay } from "./StravaCalendar";
import { TrainingImport } from "./TrainingImport";
import { accountInput } from "./AccountUI";
import { EMPTY_TRAINING, TRAINING_LIMITS, TRAINING_SPORTS, isTrainingDate, shiftTrainingDate, trainingCsv, trainingInputEntry, trainingTotals, trainingWeek, type TrainingEntry, type TrainingSnapshot } from "@/lib/training";

const button = "rounded-lg border border-border px-3 py-2 text-sm font-semibold transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40";
const primary = `${button} bg-brand text-brand-foreground hover:text-brand-foreground`;
const dateLabel = (date: string) => new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
const numberLabel = (n: number) => new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(n);
const sportLabel = (sport: string) => sport[0].toUpperCase() + sport.slice(1);

export function TrainingWorkspace({ initial, initialWeek, relationshipId }: { initial: TrainingSnapshot; initialWeek: string; relationshipId?: string }) {
  const athleteQuery = relationshipId ? `&athlete=${relationshipId}` : "";
  const [snapshot, setSnapshot] = useState(initial);
  const [week, setWeek] = useState(initialWeek);
  const [draft, setDraft] = useState<TrainingEntry | null>(null);
  const [importing, setImporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const lock = useRef(false);
  const editor = useRef<HTMLElement>(null);
  const days = Array.from({ length: 7 }, (_, i) => shiftTrainingDate(week, i));
  const entries = snapshot.entries.filter((entry) => entry.date && entry.date >= week && entry.date <= days[6]);
  const totals = trainingTotals(entries);
  const locked = busy || importing || draft !== null;

  async function loadWeek(next: string) {
    if (lock.current || draft) return;
    if (!isTrainingDate(next) || !isTrainingDate(shiftTrainingDate(next, 6))) { setError("Choose a complete week between 2000 and 2100."); return; }
    lock.current = true; setBusy(true); setError(""); setMessage(""); setDeleteId(null);
    try {
      const response = await fetch(`/api/marketplace/training?from=${next}&to=${shiftTrainingDate(next, 6)}${athleteQuery}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load this week.");
      setSnapshot(result); setWeek(next);
      window.history.replaceState(null, "", `/account/training?date=${next}${athleteQuery}`);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not load this week."); }
    finally { lock.current = false; setBusy(false); }
  }
  function open(entry?: TrainingEntry, date = week, kind: TrainingEntry["kind"] = "workout") {
    setError(""); setMessage(""); setDeleteId(null);
    setDraft(entry ?? { ...EMPTY_TRAINING, id: crypto.randomUUID(), version: 0, kind, date: kind === "workout" ? date : null });
    requestAnimationFrame(() => { editor.current?.scrollIntoView({ behavior: "smooth", block: "start" }); editor.current?.focus(); });
  }
  function reuse(source: TrainingEntry, kind: TrainingEntry["kind"]) {
    open({ ...source, id: crypto.randomUUID(), version: 0, kind, date: kind === "workout" ? week : null, status: "planned", actualMinutes: null, actualKm: null, effort: null });
  }
  async function mutate(action: { action: "save"; entry: TrainingEntry } | { action: "delete"; id: string; version: number }, removed?: TrainingEntry) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/marketplace/training${relationshipId && (action.action === "save" ? action.entry.kind : removed?.kind) === "workout" ? `?athlete=${relationshipId}` : ""}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save your workout.");
      const saved: TrainingEntry | null = result.entry;
      const target = saved ?? removed!;
      setSnapshot((current) => {
        const key = target.kind === "template" ? "templates" : "entries";
        const exists = current[key].some((entry) => entry.id === target.id);
        const list = current[key].filter((entry) => entry.id !== target.id);
        if (saved) list.push(saved);
        const countKey = target.kind === "template" ? "templates" : "workouts";
        return { ...current, [key]: list, usage: { ...current.usage, [countKey]: current.usage[countKey] + (saved ? exists ? 0 : 1 : -1) } };
      });
      setDraft(null); setDeleteId(null);
      setMessage(saved ? saved.kind === "template" ? "Workout saved to your library." : `Workout saved for ${dateLabel(saved.date!)}.` : "Workout deleted.");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save. Please try again."); }
    finally { lock.current = false; setBusy(false); }
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const data = new FormData(event.currentTarget);
    const metric = (name: string) => data.get(name) === "" || data.get(name) === null ? null : Number(data.get(name));
    const status = draft.kind === "template" || relationshipId ? "planned" : String(data.get("status")) as TrainingEntry["status"];
    const entry: TrainingEntry = { ...trainingInputEntry(draft), title: String(data.get("title")), sport: String(data.get("sport")) as TrainingEntry["sport"], notes: String(data.get("notes")), date: draft.kind === "template" ? null : String(data.get("date")), status,
      plannedMinutes: metric("plannedMinutes"), plannedKm: metric("plannedKm"), actualMinutes: status === "completed" ? metric("actualMinutes") : null, actualKm: status === "completed" ? metric("actualKm") : null, effort: status === "completed" ? metric("effort") : null };
    void mutate({ action: "save", entry });
  }
  function download() {
    const url = URL.createObjectURL(new Blob(["\uFEFF", trainingCsv(entries)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `anystride-${week}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function actions(entry: TrainingEntry) {
    const canEdit = !relationshipId || entry.kind === "template" || entry.coachCanEdit;
    return <div className="mt-3 flex flex-wrap items-center gap-2">
      {canEdit && <button className={button} disabled={locked} onClick={() => open(entry)}>Edit</button>}
      <button className={button} disabled={locked} onClick={() => reuse(entry, "workout")}>{entry.kind === "template" ? "Schedule" : "Duplicate"}</button>
      {entry.kind === "workout" && <button className={button} disabled={locked} onClick={() => reuse(entry, "template")}>Save to library</button>}
      {canEdit && (deleteId === entry.id ? <><span className="text-sm">Delete this workout?</span><button className={button} disabled={locked} onClick={() => void mutate({ action: "delete", id: entry.id, version: entry.version }, entry)}>Confirm delete</button><button className={button} onClick={() => setDeleteId(null)}>Keep</button></> : <button className={button} disabled={locked} onClick={() => setDeleteId(entry.id)}>Delete</button>)}
    </div>;
  }
  return <div>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{relationshipId ? `${snapshot.athleteName}’s training` : "Your training"}</h1><p className="mt-3 max-w-xl text-muted-foreground">Make a plan. Record what happened. Build your next week from what works.</p></div>
      <button className={primary} disabled={locked} onClick={() => open()}>Add workout</button>
    </div>
    <p className="mt-3 text-sm text-muted-foreground">{relationshipId ? "Assign workouts and review progress. You can edit your planned assignments; the athlete records their results." : "You control your training. Accepted coaches can view your calendar and assign workouts."} <a href="/account/athletes" className="text-brand underline">Manage athletes & coaches</a></p>
    {!relationshipId && <p className="mt-2 text-sm"><a href="/account/connections" className="text-brand underline">Connect Strava & view your synced activities</a></p>}
    <div role="status" aria-live="polite" className="mt-4 text-sm text-brand">{busy ? "Saving or loading…" : message}</div>
    {error && <p role="alert" className="my-4 rounded-lg border border-red-300 p-4 text-sm text-red-700">{error} {draft && "Your edits are still in the form. Copy anything you want to keep before closing and reloading."}</p>}

    {draft && <section ref={editor} tabIndex={-1} aria-labelledby="workout-editor" className="my-6 scroll-mt-6 rounded-xl border border-brand/30 bg-muted/40 p-5 sm:p-7">
      <h2 id="workout-editor" className="text-xl font-semibold">{draft.version ? "Edit" : "New"} {draft.kind === "template" ? "library workout" : "workout"}</h2>
      <form key={draft.id} onSubmit={save} className="mt-5">
        <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-medium sm:col-span-2">Workout title<input name="title" required maxLength={120} defaultValue={draft.title} placeholder="Easy run, hill repeats, strength…" className={accountInput} /></label>
          {draft.kind === "workout" && <label className="text-sm font-medium">Date<input name="date" type="date" required min="2000-01-01" max="2100-12-31" defaultValue={draft.date!} className={accountInput} /></label>}
          <label className="text-sm font-medium">Sport<select name="sport" defaultValue={draft.sport} className={accountInput}>{TRAINING_SPORTS.map((sport) => <option key={sport} value={sport}>{sportLabel(sport)}</option>)}</select></label>
          <label className="text-sm font-medium">Planned duration (minutes)<input name="plannedMinutes" type="number" min="0" max="10080" step="0.01" defaultValue={draft.plannedMinutes ?? ""} className={accountInput} /></label>
          <label className="text-sm font-medium">Planned distance (km)<input name="plannedKm" type="number" min="0" max="2000" step="0.01" defaultValue={draft.plannedKm ?? ""} className={accountInput} /></label>
          {draft.kind === "workout" && !relationshipId && <>
            <label className="text-sm font-medium sm:col-span-2">Status<select name="status" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as TrainingEntry["status"] })} className={accountInput}><option value="planned">Planned</option><option value="completed">Completed</option><option value="skipped">Skipped</option></select></label>
            {draft.status === "completed" && <>
              <label className="text-sm font-medium">Actual duration (minutes)<input name="actualMinutes" type="number" min="0" max="10080" step="0.01" defaultValue={draft.actualMinutes ?? ""} className={accountInput} /></label>
              <label className="text-sm font-medium">Actual distance (km)<input name="actualKm" type="number" min="0" max="2000" step="0.01" defaultValue={draft.actualKm ?? ""} className={accountInput} /></label>
              <label className="text-sm font-medium">Perceived effort (1–10)<input name="effort" type="number" min="1" max="10" step="1" defaultValue={draft.effort ?? ""} className={accountInput} /><span className="mt-1 block text-xs text-muted-foreground">1 is very easy; 10 is maximal effort. Optional.</span></label>
            </>}
          </>}
          <div className="sm:col-span-2"><WorkoutStructureEditor value={draft.structure ?? []} onChange={(structure) => setDraft({ ...draft, structure })} disabled={busy} /></div>
          <label className="text-sm font-medium sm:col-span-2">Notes<textarea name="notes" maxLength={1000} rows={3} defaultValue={draft.notes} className={accountInput} /></label>
          <div className="flex flex-wrap gap-3 sm:col-span-2"><button type="submit" className={primary}>Save workout</button><button type="button" className={button} onClick={() => { setDraft(null); setError(""); }}>Close without saving</button></div>
        </fieldset>
      </form>
    </section>}

    <StravaCalendarProvider week={week} relationship={relationshipId} entries={entries} disabled={locked}>
    <section aria-label="Training calendar" aria-busy={busy} className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-border py-4">
        <div><h2 className="text-lg font-semibold">{dateLabel(week)} – {dateLabel(days[6])}</h2><p className="mt-1 text-xs text-muted-foreground">{week.slice(0, 4)} · Monday–Sunday · Distances in km</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={button} disabled={locked} onClick={() => void loadWeek(shiftTrainingDate(week, -7))} aria-label="Previous week">←</button>
          <button className={button} disabled={locked} onClick={() => { const now = new Date(); void loadWeek(trainingWeek(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`)); }}>This week</button>
          <button className={button} disabled={locked} onClick={() => void loadWeek(shiftTrainingDate(week, 7))} aria-label="Next week">→</button>
          <label className="text-sm">Go to date<input aria-label="Go to date" type="date" min="2000-01-03" max="2100-12-26" value={week} disabled={locked} onChange={(event) => { if (isTrainingDate(event.target.value)) void loadWeek(trainingWeek(event.target.value)); }} className="ml-2 rounded border border-border bg-background p-2" /></label>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-5 py-6 sm:grid-cols-4">
        {[["Sessions completed", `${totals.completed} / ${totals.sessions}`], ["Minutes · actual / planned", `${numberLabel(totals.actualMinutes)} / ${numberLabel(totals.plannedMinutes)}`], ["Kilometres · actual / planned", `${numberLabel(totals.actualKm)} / ${numberLabel(totals.plannedKm)}`], ["Skipped sessions", String(totals.skipped)]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{value}</dd></div>)}
      </dl>
      <p className="mb-5 text-xs text-muted-foreground">Totals combine all sports. Actual totals include only recorded results; missing results are never filled with planned values.</p>
      <div className="divide-y divide-border border-y border-border">
        {days.map((date) => <section key={date} aria-label={dateLabel(date)} className="grid gap-4 py-5 sm:grid-cols-[130px_1fr]">
          <div><h3 className="font-semibold">{dateLabel(date)}</h3><button className="mt-2 text-sm text-brand underline underline-offset-4 disabled:opacity-40" disabled={locked} onClick={() => open(undefined, date)}>Add workout</button></div>
          <div className="space-y-5">{entries.filter((entry) => entry.date === date).length === 0 && <p className="py-2 text-sm text-muted-foreground">Nothing scheduled.</p>}{entries.filter((entry) => entry.date === date).map((entry) => <article key={entry.id} className="min-w-0 border-l-2 border-brand/40 pl-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h4 className="break-words font-semibold">{entry.title}</h4><span className="text-xs capitalize text-muted-foreground">{entry.sport} · {entry.status}</span></div>
            <p className="mt-2 text-sm text-muted-foreground">Planned: {entry.plannedMinutes === null ? "duration not set" : `${numberLabel(entry.plannedMinutes)} min`}{entry.plannedKm === null ? "" : ` · ${numberLabel(entry.plannedKm)} km`}</p>
            {entry.status === "completed" && <p className="mt-1 text-sm">Actual: {entry.actualMinutes === null ? "duration not recorded" : `${numberLabel(entry.actualMinutes)} min`}{entry.actualKm === null ? "" : ` · ${numberLabel(entry.actualKm)} km`}{entry.effort === null ? "" : ` · effort ${entry.effort}/10`}</p>}
            {(entry.assignedBy || entry.sourceId) && <p className="mt-2 text-xs text-brand">{entry.assignedBy ? "Coach assignment" : ""}{entry.assignedBy && entry.sourceId ? " · " : ""}{entry.sourceId ? "Imported from Strava export" : ""}</p>}
            {entry.planTitle && <p className="mt-2 text-xs text-brand">Plan: {entry.planTitle}</p>}<WorkoutStructureSummary blocks={entry.structure ?? []} />
            {entry.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{entry.notes}</p>}{actions(entry)}
          </article>)}<StravaCalendarDay date={date} /></div>
        </section>)}
      </div>
      <button className={`${button} mt-4`} disabled={busy || !entries.length} onClick={download}>Export this week (CSV)</button>
    </section>

    </StravaCalendarProvider>
    <section aria-labelledby="workout-library" className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="workout-library" className="text-2xl font-semibold tracking-tight">Workout library</h2><button className={button} disabled={locked} onClick={() => open(undefined, week, "template")}>Create library workout</button></div>
      <p className="mt-3 text-sm text-muted-foreground">Keep your go-to sessions here. Scheduling a copy leaves the original intact.</p>
      {!snapshot.templates.length && <p className="mt-5 rounded-lg bg-muted p-5 text-sm">Save a workout from your calendar or create your first library workout.</p>}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{snapshot.templates.map((entry) => <article key={entry.id} className="min-w-0 rounded-lg border border-border p-4"><h3 className="break-words font-semibold">{entry.title}</h3><p className="mt-2 text-sm text-muted-foreground">{sportLabel(entry.sport)}{entry.plannedMinutes === null ? "" : ` · ${numberLabel(entry.plannedMinutes)} min`}{entry.plannedKm === null ? "" : ` · ${numberLabel(entry.plannedKm)} km`}</p><WorkoutStructureSummary blocks={entry.structure ?? []} />{actions(entry)}</article>)}</div>
    </section>
    {!relationshipId && <TrainingImport entries={entries} disabled={locked} onBusy={setImporting} onImported={(imported) => setSnapshot((current) => {
      const ids = new Set(imported.map((entry) => entry.id));
      const added = imported.filter((entry) => !current.entries.some((old) => old.id === entry.id)).length;
      return { ...current, entries: [...current.entries.filter((entry) => !ids.has(entry.id)), ...imported], usage: { ...current.usage, workouts: current.usage.workouts + added } };
    })} />}
    <details className="mt-10 border-t border-border pt-5 text-sm text-muted-foreground"><summary className="cursor-pointer font-medium">Storage & fair use</summary><p className="mt-3">{snapshot.usage.workouts.toLocaleString()} / {TRAINING_LIMITS.workouts.toLocaleString()} calendar workouts · {snapshot.usage.templates} / {TRAINING_LIMITS.templates} library workouts.</p><p className="mt-2">Includes {TRAINING_LIMITS.readsPerMonth.toLocaleString()} calendar views and {(relationshipId ? TRAINING_LIMITS.coachWritesPerMonth : TRAINING_LIMITS.writesPerMonth).toLocaleString()} saves per month (20,000 for approved coaches), resetting on the first (UTC). Up to {TRAINING_LIMITS.perDay} workouts per day. Contact Anystride if you need more. No automatic overage charges.</p></details>
  </div>;
}
