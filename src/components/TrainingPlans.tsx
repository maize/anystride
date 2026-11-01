"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { accountInput } from "./AccountUI";
import { WorkoutStructureEditor, WorkoutStructureSummary } from "./WorkoutStructure";
import { EMPTY_TRAINING, TRAINING_SPORTS, isTrainingDate, trainingWeek, type TrainingEntry, type TrainingRelationship } from "@/lib/training";
import { PLAN_LIMITS, planDates, planWeekTotals, type PlanLibrary, type PlanPreview, type PlanSession, type TrainingPlan } from "@/lib/training-plans";
import { structureTotals } from "@/lib/workout-structure";
const button = "rounded-lg border border-border px-3 py-2 text-sm font-semibold transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40";
const primary = `${button} bg-brand text-brand-foreground hover:text-brand-foreground`;
const api = "/api/marketplace/training/plans";
const labelDate = (date: string) => new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
const number = (n: number) => new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(n);
type AssignmentRequest = { action: "assign"; id: string; planId: string; version: number; startDate: string; athletes: string[] };

export function TrainingPlans({ initial, workouts, athletes, today }: { initial: PlanLibrary; workouts: TrainingEntry[]; athletes: TrainingRelationship[]; today: string }) {
  const [library, setLibrary] = useState(initial);
  const [draft, setDraft] = useState<TrainingPlan | null>(null);
  const [dirty, setDirty] = useState(false);
  const [session, setSession] = useState<PlanSession | null>(null);
  const [week, setWeek] = useState(0);
  const [copyWeek, setCopyWeek] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [start, setStart] = useState(trainingWeek(today));
  const [preview, setPreview] = useState<PlanPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState("");
  const [search, setSearch] = useState("");
  const lock = useRef(false);
  const assignment = useRef<AssignmentRequest | null>(null);
  const editor = useRef<HTMLElement>(null);
  const workoutEditor = useRef<HTMLElement>(null);
  const connected = athletes.filter((a) => a.status === "active");
  const canSwitch = !busy && !dirty && !session;
  const maxAthletes = draft?.sessions.length ? Math.min(20, Math.floor(PLAN_LIMITS.assignmentWorkouts / draft.sessions.length)) : 20;
  function clearPreview() { setPreview(null); assignment.current = null; }
  function change(plan: TrainingPlan) { setDraft(plan); setDirty(true); clearPreview(); setMessage(""); }
  function show(plan: TrainingPlan, changed = false) { setDraft(plan); setDirty(changed); setSession(null); setWeek(0); setCopyWeek(plan.weeks > 1 ? 1 : 0); setSelected([]); setConfirm(""); clearPreview(); requestAnimationFrame(() => { editor.current?.scrollIntoView({ behavior: "smooth", block: "start" }); editor.current?.focus(); }); }
  async function response(url: string, body?: unknown) {
    const r = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
    const result = await r.json(); if (!r.ok) throw new Error(result.error || "Could not load or save this plan."); return result;
  }
  async function run(work: () => Promise<void>) {
    if (lock.current) return; lock.current = true; setBusy(true); setError(""); setMessage("");
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : "Could not save. Your edits are still here."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function open(id: string, copy = false) { await run(async () => { const { plan } = await response(`${api}?id=${id}`); show(copy ? { ...plan, id: crypto.randomUUID(), version: 0, title: `${plan.title.slice(0, 110)} (copy)`, sessions: plan.sessions.map((s: PlanSession) => ({ ...s, id: crypto.randomUUID() })) } : plan, copy); }); }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!draft || session) return;
    void run(async () => {
      const result = await response(api, { action: "save", plan: draft }); const saved: TrainingPlan = result.plan;
      setDraft(saved); setDirty(false); clearPreview();
      setLibrary((current) => ({ ...current, plans: [{ id: saved.id, version: saved.version, title: saved.title, description: saved.description, weeks: saved.weeks, sessionCount: saved.sessions.length }, ...current.plans.filter((p) => p.id !== saved.id)] }));
      setMessage("Plan saved. Changes to this template do not change workouts already assigned to athletes.");
    });
  }
  function openSession(day: number, existing?: PlanSession) {
    setSession(existing ?? { id: crypto.randomUUID(), day, workout: { ...EMPTY_TRAINING } }); setError(""); clearPreview();
    requestAnimationFrame(() => { workoutEditor.current?.scrollIntoView({ behavior: "smooth", block: "start" }); workoutEditor.current?.focus(); });
  }
  function saveSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!session || !draft) return;
    const data = new FormData(event.currentTarget);
    const metric = (name: string) => data.get(name) === "" ? null : Number(data.get(name));
    const totals = structureTotals(session.workout.structure ?? []);
    const workout = { ...session.workout, title: String(data.get("title")).trim(), sport: String(data.get("sport")) as TrainingEntry["sport"], notes: String(data.get("notes")), plannedMinutes: totals.allTimed ? totals.minutes : metric("minutes"), plannedKm: totals.allDistance ? totals.km : metric("km") };
    const day = (Number(data.get("week")) - 1) * 7 + Number(data.get("day")) - 1;
    const sessions = [...draft.sessions.filter((s) => s.id !== session.id), { ...session, day, workout }].sort((a, b) => a.day - b.day || a.id.localeCompare(b.id));
    if (sessions.length > PLAN_LIMITS.sessions || sessions.filter((s) => s.day === day).length > 20) { setError("Use up to 168 workouts per plan and 20 per day."); return; }
    change({ ...draft, sessions }); setSession(null); setWeek(Math.floor(day / 7));
  }
  function duplicateWeek() {
    if (!draft || copyWeek === week) { setError("Choose a different destination week."); return; }
    const copies = draft.sessions.filter((s) => Math.floor(s.day / 7) === week).map((s) => ({ ...s, id: crypto.randomUUID(), day: copyWeek * 7 + s.day % 7 }));
    const sessions = [...draft.sessions, ...copies].sort((a, b) => a.day - b.day || a.id.localeCompare(b.id));
    if (sessions.length > PLAN_LIMITS.sessions || copies.some((s) => sessions.filter((other) => other.day === s.day).length > 20)) { setError("That copy would exceed 168 workouts per plan or 20 per day."); return; }
    change({ ...draft, sessions }); setWeek(copyWeek); setMessage("Week copied. Existing sessions in the destination week were kept. Save the plan to keep these edits.");
  }
  async function reviewAssignment() {
    if (!draft || dirty || session) return;
    await run(async () => {
      const body = { planId: draft.id, version: draft.version, startDate: start, athletes: selected };
      const result = await response(api, { action: "preview", ...body });
      assignment.current = { action: "assign", id: crypto.randomUUID(), ...body }; setPreview(result.preview);
    });
  }
  async function assign() {
    if (!assignment.current) return;
    await run(async () => {
      const result = await response(api, assignment.current);
      setMessage(result.replayed ? `This assignment was already saved: ${result.workouts} workouts for ${result.assigned} athletes. No duplicates were created.${result.removed ? " Some assignments have since been removed." : ""}` : `${result.workouts} workouts assigned to ${result.assigned} athlete${result.assigned === 1 ? "" : "s"}.`);
      clearPreview(); setSelected([]);
      try { setLibrary(await response(api)); } catch { setError("Assignment saved. Refresh recent assignments to see it here."); }
    });
  }
  async function removeAssignment(id: string) {
    await run(async () => { const result = await response(api, { action: "remove", id }); setLibrary((current) => ({ ...current, assignments: current.assignments.map((a) => a.id === id ? { ...a, status: "removed" } : a) })); setConfirm(""); setMessage(`${result.removed} planned workouts removed. Completed and skipped sessions were kept.`); });
  }
  const dirtyWarning = dirty || session;
  return <div>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Plan library</h1><p className="mt-3 max-w-2xl text-muted-foreground">Build the weeks once. Adapt them for each athlete. Assign a complete plan with dates and workout instructions intact.</p></div><button className={primary} disabled={!canSwitch} onClick={() => show({ id: crypto.randomUUID(), version: 0, title: "", description: "", weeks: 4, sessions: [] }, true)}>Create plan</button></div>
    <p role="status" aria-live="polite" className="mt-5 text-sm text-brand">{busy ? "Saving or loading…" : message}</p>
    {error && <p role="alert" className="mt-4 rounded-lg border border-red-300 p-4 text-sm text-red-700">{error}</p>}
    {dirtyWarning && <p className="mt-3 text-sm text-muted-foreground">Unsaved edits. Save or close them before opening another plan or assigning it.</p>}
    <label className="mt-6 block max-w-sm text-sm font-medium">Find a plan<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} className={accountInput} placeholder="Search plan titles" /></label>
    <div className="mt-5 divide-y divide-border border-y border-border">{library.plans.filter((p) => p.title.toLowerCase().includes(search.toLowerCase())).map((p) => <article key={p.id} className="flex flex-wrap items-center justify-between gap-4 py-5"><div className="min-w-0"><h2 className="break-words font-semibold">{p.title}</h2><p className="mt-1 text-sm text-muted-foreground">{p.weeks} weeks · {p.sessionCount} workouts · version {p.version}</p></div><div className="flex gap-2"><button className={button} disabled={!canSwitch} onClick={() => void open(p.id)}>Open plan</button><button className={button} disabled={!canSwitch || library.plans.length >= PLAN_LIMITS.plans} onClick={() => void open(p.id, true)}>Duplicate</button></div></article>)}{!library.plans.length && <p className="py-6 text-sm text-muted-foreground">Your first plan starts with a few weeks and the sessions you want athletes to follow.</p>}</div>

    {draft && <section ref={editor} tabIndex={-1} aria-labelledby="plan-editor" className="mt-10 scroll-mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="plan-editor" className="text-2xl font-semibold">{draft.version ? "Edit plan" : "New plan"}</h2><button className={button} disabled={busy} onClick={() => { if (dirtyWarning && confirm !== "close") setConfirm("close"); else { setDraft(null); setSession(null); setDirty(false); setConfirm(""); clearPreview(); } }}>{confirm === "close" ? "Discard edits & close" : "Close plan"}</button></div>
      <form onSubmit={save} className="mt-5"><fieldset disabled={busy || !!session} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_130px]"><label className="text-sm font-medium">Plan title<input required maxLength={120} value={draft.title} onChange={(e) => change({ ...draft, title: e.target.value })} className={accountInput} /></label><label className="text-sm font-medium">Weeks<select value={draft.weeks} onChange={(e) => { const weeks = Number(e.target.value); if (draft.sessions.some((s) => s.day >= weeks * 7)) { setError("Move or remove workouts outside the new length before shortening the plan."); return; } change({ ...draft, weeks }); setWeek(Math.min(week, weeks - 1)); setCopyWeek(Math.min(copyWeek, weeks - 1)); }} className={accountInput}>{Array.from({ length: PLAN_LIMITS.weeks }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label></div>
        <label className="block text-sm font-medium">Plan description (library only)<textarea rows={2} maxLength={1000} value={draft.description} onChange={(e) => change({ ...draft, description: e.target.value })} className={accountInput} /></label>
        <div aria-label="Plan weeks" className="flex flex-wrap gap-2">{Array.from({ length: draft.weeks }, (_, i) => { const totals = planWeekTotals(draft, i); return <button type="button" key={i} aria-pressed={week === i} className={`${button} text-left ${week === i ? "border-brand bg-brand/10" : ""}`} onClick={() => setWeek(i)}><span className="block">Week {i + 1}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{totals.sessions} sessions · {number(totals.minutes)} min</span></button>; })}</div>
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-semibold">Week {week + 1}</h3><div className="flex flex-wrap items-center gap-2"><label className="text-sm">Copy to week<select aria-label="Copy to week" value={copyWeek} onChange={(e) => setCopyWeek(Number(e.target.value))} className="ml-2 rounded border border-border bg-background p-2">{Array.from({ length: draft.weeks }, (_, i) => <option key={i} value={i}>{i + 1}</option>)}</select></label><button type="button" className={button} disabled={copyWeek === week || !planWeekTotals(draft, week).sessions} onClick={duplicateWeek}>Copy week</button></div></div>
        <p className="text-xs text-muted-foreground">Day 1 maps to the start date you choose when assigning. Days without workouts stay empty. Totals use known planned values across all sports.</p>
        <div className="divide-y divide-border border-y border-border">{Array.from({ length: 7 }, (_, day) => { const offset = week * 7 + day; const sessions = draft.sessions.filter((s) => s.day === offset); return <div key={day} className="grid gap-4 py-5 sm:grid-cols-[100px_1fr]"><div><h4 className="font-semibold">Day {day + 1}</h4><button type="button" className="mt-2 text-sm text-brand underline disabled:opacity-40" disabled={draft.sessions.length >= PLAN_LIMITS.sessions || sessions.length >= 20} onClick={() => openSession(offset)}>Add workout</button></div><div className="space-y-4">{!sessions.length && <p className="text-sm text-muted-foreground">Rest / no scheduled workout</p>}{sessions.map((s) => <article key={s.id} className="border-l-2 border-brand/30 pl-4"><h5 className="break-words font-semibold">{s.workout.title}</h5><p className="mt-1 text-sm text-muted-foreground">{s.workout.sport}{s.workout.plannedMinutes !== null ? ` · ${number(s.workout.plannedMinutes)} min` : ""}{s.workout.plannedKm !== null ? ` · ${number(s.workout.plannedKm)} km` : ""}</p><WorkoutStructureSummary blocks={s.workout.structure ?? []} />{s.workout.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{s.workout.notes}</p>}<div className="mt-3 flex gap-2"><button type="button" className={button} onClick={() => openSession(s.day, s)}>Edit / move</button><button type="button" className={button} disabled={draft.sessions.length >= PLAN_LIMITS.sessions || sessions.length >= 20} onClick={() => openSession(s.day, { ...s, id: crypto.randomUUID() })}>Duplicate</button><button type="button" className={button} onClick={() => change({ ...draft, sessions: draft.sessions.filter((other) => other.id !== s.id) })}>Remove</button></div></article>)}</div></div>; })}</div>
        <div className="flex flex-wrap items-center gap-3"><button type="submit" className={primary} disabled={!dirty}>Save plan</button><span className="text-sm text-muted-foreground">{draft.sessions.length} / {PLAN_LIMITS.sessions} workouts</span>{draft.version > 0 && <button type="button" className={button} onClick={() => setConfirm("delete")}>Delete template</button>}</div>
        {confirm === "delete" && <div className="flex flex-wrap items-center gap-3 text-sm"><p>Delete this template? Assigned workouts will remain.</p><button type="button" className={button} onClick={() => void run(async () => { await response(api, { action: "delete", id: draft.id, version: draft.version }); setLibrary((current) => ({ ...current, plans: current.plans.filter((p) => p.id !== draft.id) })); setDraft(null); setDirty(false); setConfirm(""); setMessage("Template deleted. Assigned workouts were kept."); })}>Delete template permanently</button><button type="button" className={button} onClick={() => setConfirm("")}>Keep template</button></div>}
      </fieldset></form>

      {session && <section ref={workoutEditor} tabIndex={-1} aria-labelledby="plan-workout-editor" className="mt-8 scroll-mt-6 rounded-xl border border-brand/30 bg-muted/40 p-5">
        <h3 id="plan-workout-editor" className="text-xl font-semibold">Plan workout</h3>
        <label className="mt-4 block text-sm font-medium">Start from a library workout<select disabled={busy} className={accountInput} value="" onChange={(e) => { const source = workouts.find((w) => w.id === e.target.value); if (source) setSession({ ...session, id: session.id, workout: { title: source.title, sport: source.sport, notes: source.notes, plannedMinutes: source.plannedMinutes, plannedKm: source.plannedKm, actualMinutes: null, actualKm: null, effort: null, status: "planned", structure: source.structure ?? [] } }); }}><option value="">Choose a workout to copy…</option>{workouts.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}</select></label>
        <form onSubmit={saveSession} className="mt-4"><fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium sm:col-span-2">Workout title<input name="title" required maxLength={120} value={session.workout.title} onChange={(e) => setSession({ ...session, workout: { ...session.workout, title: e.target.value } })} className={accountInput} /></label>
          <label className="text-sm font-medium">Week<select name="week" value={Math.floor(session.day / 7) + 1} onChange={(e) => setSession({ ...session, day: (Number(e.target.value) - 1) * 7 + session.day % 7 })} className={accountInput}>{Array.from({ length: draft.weeks }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label><label className="text-sm font-medium">Day<select name="day" value={session.day % 7 + 1} onChange={(e) => setSession({ ...session, day: Math.floor(session.day / 7) * 7 + Number(e.target.value) - 1 })} className={accountInput}>{Array.from({ length: 7 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label>
          <label className="text-sm font-medium">Sport<select name="sport" value={session.workout.sport} onChange={(e) => setSession({ ...session, workout: { ...session.workout, sport: e.target.value as TrainingEntry["sport"] } })} className={accountInput}>{TRAINING_SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          <label className="text-sm font-medium">Overall planned minutes<input name="minutes" type="number" min="0" max="10080" step="0.01" value={session.workout.plannedMinutes ?? ""} onChange={(e) => setSession({ ...session, workout: { ...session.workout, plannedMinutes: e.target.value === "" ? null : Number(e.target.value) } })} className={accountInput} /></label><label className="text-sm font-medium">Overall planned distance (km)<input name="km" type="number" min="0" max="2000" step="0.01" value={session.workout.plannedKm ?? ""} onChange={(e) => setSession({ ...session, workout: { ...session.workout, plannedKm: e.target.value === "" ? null : Number(e.target.value) } })} className={accountInput} /></label>
          <div className="sm:col-span-2"><WorkoutStructureEditor value={session.workout.structure ?? []} onChange={(structure) => setSession({ ...session, workout: { ...session.workout, structure } })} disabled={busy} /></div>
          <label className="text-sm font-medium sm:col-span-2">Instructions<textarea name="notes" maxLength={1000} rows={3} value={session.workout.notes} onChange={(e) => setSession({ ...session, workout: { ...session.workout, notes: e.target.value } })} className={accountInput} /></label>
          <div className="flex gap-3 sm:col-span-2"><button className={primary}>Keep workout in plan</button><button type="button" className={button} onClick={() => setSession(null)}>Cancel workout edits</button></div>
        </fieldset></form>
      </section>}

      <section aria-labelledby="assign-plan" className="mt-10 rounded-xl border border-brand/30 bg-muted/40 p-5 sm:p-7">
        <h3 id="assign-plan" className="text-xl font-semibold">Assign this plan</h3><p className="mt-2 text-sm text-muted-foreground">Save the template, choose athletes and a Day 1 date, then review. This adds separate workouts; existing calendar entries stay in place.</p>
        <fieldset disabled={busy || dirty || !!session || draft.version === 0} className="mt-5 space-y-4">
          <label className="block max-w-xs text-sm font-medium">Day 1 date<input type="date" required min="2000-01-01" max="2100-12-31" value={start} onChange={(e) => { setStart(e.target.value); clearPreview(); }} className={accountInput} /></label>
          <p className="text-sm text-muted-foreground">Select up to {maxAthletes} athletes for this plan. Up to 500 workout copies are saved together.</p>
          <div className="grid max-h-72 gap-3 overflow-y-auto sm:grid-cols-2">{connected.map((a) => <label key={a.id} className="flex min-w-0 items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-4 accent-brand" checked={selected.includes(a.id)} disabled={!selected.includes(a.id) && selected.length >= maxAthletes} onChange={(e) => { setSelected((ids) => e.target.checked ? [...ids, a.id] : ids.filter((id) => id !== a.id)); clearPreview(); }} /><span className="break-words">{a.athleteName}<span className="block break-all text-xs text-muted-foreground">{a.athleteEmail}</span></span></label>)}</div>
          {!connected.length && <p className="text-sm">No connected athletes yet. <Link href="/account/athletes" prefetch={false} className="text-brand underline">Invite athletes and wait for acceptance</Link>.</p>}
          <button type="button" className={button} disabled={!selected.length || !draft.sessions.length || !isTrainingDate(start)} onClick={() => void reviewAssignment()}>Review dates & capacity</button>
        </fieldset>
        {preview && <div className="mt-6 border-t border-border pt-5"><h4 className="font-semibold">{preview.title}: {preview.totalWorkouts} workouts for {preview.athletes.length} athlete{preview.athletes.length === 1 ? "" : "s"}</h4><p className="mt-2 text-sm">{labelDate(preview.startDate)} – {labelDate(preview.endDate)} · {preview.workoutsPerAthlete} workouts each</p><p className="mt-2 text-sm text-muted-foreground">{preview.athletes.map((a) => a.name).join(", ")}. Every athlete gets a separate copy. Template edits will not change their assigned workouts.</p><details className="mt-4 text-sm"><summary className="cursor-pointer font-medium">Review all scheduled dates</summary><ol className="mt-3 max-h-80 space-y-2 overflow-y-auto">{planDates(draft, preview.startDate).map((s) => <li key={s.id}>{labelDate(s.date)} · {s.workout.title}</li>)}</ol></details><button className={`${primary} mt-5`} disabled={busy} onClick={() => void assign()}>Assign {preview.totalWorkouts} workouts</button></div>}
      </section>
    </section>}

    <section aria-labelledby="plan-history" className="mt-12 border-t border-border pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="plan-history" className="text-2xl font-semibold">Recent assignments</h2><button className={button} disabled={busy} onClick={() => void run(async () => { setLibrary(await response(api)); setConfirm(""); })}>Refresh recent</button></div><p className="mt-2 text-sm text-muted-foreground">Removing a plan deletes only its remaining planned workouts. Completed and skipped sessions stay in the athlete’s calendar.</p><div className="mt-4 divide-y divide-border">{library.assignments.map((a) => <article key={a.id} className="flex flex-wrap items-center justify-between gap-4 py-5"><div className="min-w-0"><h3 className="break-words font-semibold">{a.planTitle} · {a.athleteName}</h3><p className="mt-1 text-sm text-muted-foreground">Starts {a.startDate} · {a.weeks} weeks · {a.workoutCount} workouts originally assigned{a.status === "removed" ? " · planned sessions removed" : ""}{!a.canManage ? " · coach access ended" : ""}</p></div><div className="flex flex-wrap gap-2">{a.canManage && <Link href={`/account/training?athlete=${a.relationshipId}&date=${trainingWeek(a.startDate)}`} prefetch={false} className={button}>Open calendar</Link>}{a.canManage && a.status === "active" && (confirm === a.id ? <><button disabled={busy} className={button} onClick={() => void removeAssignment(a.id)}>Confirm removal of planned sessions</button><button disabled={busy} className={button} onClick={() => setConfirm("")}>Keep plan</button></> : <button disabled={busy} className={button} onClick={() => setConfirm(a.id)}>Remove planned sessions</button>)}</div></article>)}{!library.assignments.length && <p className="py-5 text-sm text-muted-foreground">Assigned plans will appear here.</p>}</div>{library.nextCursor && <button className={button} disabled={busy} onClick={() => void run(async () => { setLibrary(await response(`${api}?before=${library.nextCursor}`)); setConfirm(""); })}>Older assignments</button>}</section>
    <details className="mt-8 border-t border-border pt-5 text-sm text-muted-foreground"><summary className="cursor-pointer font-medium">Plan storage & fair use</summary><p className="mt-3">Up to 50 plans, 24 weeks and 168 sessions per plan. Repeated steps stay compact. Each assigned or removed workout counts toward the existing 20,000 monthly coach saves. Up to 2,000 athlete-plan assignment records are retained for duplicate protection. No automatic overage charges.</p></details>
  </div>;
}
