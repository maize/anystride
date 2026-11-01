"use client";
import { WorkoutStructureEditor } from "./WorkoutStructure";
import type { WorkoutBlock } from "@/lib/workout-structure";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { accountInput } from "./AccountUI";
import { EMPTY_TRAINING, TRAINING_LIMITS, TRAINING_SPORTS, isTrainingDate, shiftTrainingDate, trainingWeek, type TrainingEntry, type TrainingRoster } from "@/lib/training";
const button = "rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:border-brand hover:text-brand disabled:opacity-40";
const primary = `${button} bg-brand text-brand-foreground hover:text-brand-foreground`;

export function TrainingAthletes({ initial, library, view = initial.isCoach ? "coach" : "runner" }: { initial: TrainingRoster; library: TrainingEntry[]; view?: "runner" | "coach" }) {
  const coaching = initial.isCoach && view === "coach";
  const [roster, setRoster] = useState(initial);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [structure, setStructure] = useState<WorkoutBlock[]>([]);
  const [template, setTemplate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState("");
  const lock = useRef(false);
  const inviteId = useRef<string | null>(null);
  const assignmentId = useRef<string | null>(null);
  const chosen = library.find((entry) => entry.id === template);
  const hasConnectedAthletes = roster.athletes.some((athlete) => athlete.status === "active");
  const visible = roster.athletes.filter((a) => `${a.athleteName} ${a.athleteEmail}`.toLowerCase().includes(search.toLowerCase()));
  async function refresh(from = roster.from) {
    const response = await fetch(`/api/marketplace/training/coaching?from=${from}&to=${shiftTrainingDate(from, 6)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load athletes.");
    setRoster(data); setSelected((ids) => ids.filter((id) => data.athletes.some((a: { id: string; status: string }) => a.id === id && a.status === "active")));
  }
  async function loadWeek(from: string) {
    if (lock.current) return;
    if (!isTrainingDate(from) || !isTrainingDate(shiftTrainingDate(from, 6))) { setError("Choose a complete week between 2000 and 2100."); return; }
    lock.current = true; setBusy(true); setError("");
    try { await refresh(from); } catch (e) { setError(e instanceof Error ? e.message : "Could not refresh."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function mutate(action: unknown, success: string, done?: () => void) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/marketplace/training/coaching", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save. Please try again.");
      setMessage(success); setConfirm(""); done?.();
      try { await refresh(); } catch { setError("Your change was saved. Refresh the roster to see the latest progress."); }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); }
    finally { lock.current = false; setBusy(false); }
  }
  function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    inviteId.current ??= crypto.randomUUID();
    void mutate({ action: "invite", id: inviteId.current, name: data.get("name"), email: data.get("email") }, "Invitation is ready. Ask the athlete to sign in with that email and open the coach invitation in their account. No email was sent.", () => { form.reset(); inviteId.current = null; });
  }
  async function copyInvitation(email: string) {
    const url = `${window.location.origin}/account/sign-up?as=athlete&next=%2Faccount%2Fathletes`;
    const invitation = `I’ve invited you to train with me on Anystride. Open ${url} and sign up or sign in with ${email}. After verifying your email, review my invitation and choose Accept & share calendar. No payment or Strava connection is needed.`;
    try {
      await navigator.clipboard.writeText(invitation);
      setMessage("Invitation message copied. Send it to your athlete; Anystride has not emailed them.");
      setError("");
    } catch {
      setError("Could not copy automatically. Copy the invitation link below and ask your athlete to use the email you invited.");
    }
  }
  function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    assignmentId.current ??= crypto.randomUUID();
    const metric = (key: string) => data.get(key) === "" ? null : Number(data.get(key));
    void mutate({ action: "assign", athletes: selected, entry: { ...EMPTY_TRAINING, id: assignmentId.current, kind: "workout", version: 0, date: data.get("date"), title: data.get("title"), sport: data.get("sport"), notes: data.get("notes"), plannedMinutes: metric("minutes"), plannedKm: metric("km"), structure } }, `Workout assigned to ${selected.length} athlete${selected.length === 1 ? "" : "s"}. Each athlete has their own copy.`, () => { assignmentId.current = null; setSelected([]); });
  }
  function endAccess(id: string, version: number) {
    return confirm === id ? <span className="flex flex-wrap items-center gap-2 text-sm">End calendar and Strava access? <button disabled={busy} className={button} onClick={() => void mutate({ action: "revoke", id, version }, "Calendar and Strava access ended. Existing workouts remain in the athlete’s calendar.")}>End access</button><button disabled={busy} className={button} onClick={() => setConfirm("")}>Keep access</button></span> : <button disabled={busy} className={button} onClick={() => setConfirm(id)}>End access</button>;
  }
  return <div>
    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{coaching ? "Your athletes" : "My coaches"}</h1>
    <p className="mt-3 max-w-2xl text-muted-foreground">{coaching ? "Invite athletes, review their calendars and assign their training." : "Review your coach invitations and choose who can access your training calendar."}</p>
    <p role="status" aria-live="polite" className="mt-5 text-sm text-brand">{busy ? "Saving or loading…" : message}</p>
    {error && <p role="alert" className="mt-4 rounded-lg border border-red-300 p-4 text-sm text-red-700">{error}</p>}
    {(view === "runner") && <section className="mt-8 border-y border-border py-6" aria-labelledby="your-coaches">
      <h2 id="your-coaches" className="text-xl font-semibold">Your coaches</h2>
      <p className="mt-3 text-sm"><Link prefetch={false} href="/account/connections#coach-sharing" className="text-brand underline">Manage Strava sharing with your coaches →</Link></p>
      {!roster.coaches.length && <p className="mt-3 text-sm text-muted-foreground">No connections yet. Ask your coach to invite the email you use to sign in here.</p>}
      {roster.coaches.map((coach) => <article key={coach.id} className="mt-5 space-y-3">
        <h3 className="font-semibold">{coach.coachName} <span className="font-normal text-muted-foreground">· {coach.status === "pending" ? "invited you" : "connected"}</span></h3>
        {coach.status === "pending" ? <><p className="max-w-2xl text-sm text-muted-foreground">Accepting shares your entire saved training calendar, including past workouts, results, imported activities and notes. This coach can assign workouts and edit their own planned assignments. You control your results and can end access at any time. Strava sync sharing is a separate choice in Strava connection. Invitations expire after 14 days.</p><div className="flex gap-3"><button disabled={busy} className={primary} onClick={() => void mutate({ action: "accept", id: coach.id, version: coach.version }, "Coach connected. They can now view your calendar and assign workouts.")}>Accept & share calendar</button><button disabled={busy} className={button} onClick={() => void mutate({ action: "decline", id: coach.id, version: coach.version }, "Invitation declined. Your calendar has not been shared.")}>Decline</button></div></> : endAccess(coach.id, coach.version)}
      </article>)}
    </section>}
    {coaching ? <>
      <section className="mt-8" aria-labelledby="invite-athlete"><h2 id="invite-athlete" className="text-xl font-semibold">Invite an athlete</h2><p className="mt-2 text-sm text-muted-foreground">Use the email they will sign in with, even if they don’t have an account yet. After creating the invitation, copy its message below and send it to them. No email is sent automatically.</p>
        <form onSubmit={invite} className="mt-4"><fieldset disabled={busy} className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]"><label className="text-sm font-medium">Athlete name<input name="name" required maxLength={80} className={accountInput} /></label><label className="text-sm font-medium">Sign-in email<input name="email" type="email" required maxLength={254} className={accountInput} /></label><button className={primary}>Create invitation</button></fieldset></form>
      </section>
      <section aria-labelledby="athlete-roster" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 id="athlete-roster" className="text-2xl font-semibold">Athlete roster</h2><p className="mt-2 text-sm text-muted-foreground">Week of {roster.from} · {roster.athletes.filter((a) => a.status === "active").length} connected</p></div><div className="flex items-center gap-2"><label className="text-sm">Progress week<input type="date" aria-label="Progress week" min="2000-01-03" max="2100-12-26" disabled={busy} value={roster.from} onChange={(e) => { if (isTrainingDate(e.target.value)) void loadWeek(trainingWeek(e.target.value)); }} className={accountInput} /></label><button className={button} disabled={busy} onClick={() => void loadWeek(roster.from)}>Refresh</button></div></div>
        <label className="mt-5 block max-w-sm text-sm font-medium">Find an athlete<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} className={accountInput} placeholder="Name or email" /></label>
        <p className="mt-4 text-sm text-muted-foreground">Select up to {TRAINING_LIMITS.batch} connected athletes to assign a workout together. Progress includes all sports.</p>
        <div className="mt-4 divide-y divide-border border-y border-border">{!visible.length && <p className="py-6 text-sm text-muted-foreground">{search ? "No athletes match your search." : "Your roster starts with an invitation."}</p>}{visible.map((athlete) => <article key={athlete.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex min-w-0 items-start gap-3">{athlete.status === "active" && <input type="checkbox" aria-label={`Select ${athlete.athleteName}`} className="mt-1 size-4 accent-brand" checked={selected.includes(athlete.id)} disabled={busy || (!selected.includes(athlete.id) && selected.length >= TRAINING_LIMITS.batch)} onChange={(e) => setSelected((ids) => e.target.checked ? [...ids, athlete.id] : ids.filter((id) => id !== athlete.id))} />}<div className="min-w-0"><h3 className="break-words font-semibold">{athlete.athleteName}</h3><p className="break-all text-xs text-muted-foreground">{athlete.athleteEmail}</p><p className="mt-2 text-sm">{athlete.status === "active" ? `${athlete.completed} completed · ${athlete.planned} planned · ${athlete.skipped} skipped · ${Math.round(athlete.actualMinutes)} min recorded` : athlete.expired && athlete.status === "pending" ? "Invitation expired — invite again above" : athlete.status === "pending" ? "Waiting for athlete to accept" : `${athlete.status === "declined" ? "Invitation declined" : "Access ended"} — invite again above`}</p></div></div>
          <div className="flex flex-wrap items-center gap-3">{athlete.status === "active" && <Link prefetch={false} href={`/account/training?athlete=${athlete.id}&date=${roster.from}`} className={button}>Open calendar</Link>}{athlete.status === "active" && <Link prefetch={false} href={`/account/athletes/${athlete.id}/activities`} className={button}>Strava activities</Link>}{athlete.status === "pending" && !athlete.expired && <button disabled={busy} className={button} onClick={() => void copyInvitation(athlete.athleteEmail)}>Copy invitation message</button>}{["active", "pending"].includes(athlete.status) && endAccess(athlete.id, athlete.version)}</div>
        </article>)}</div>
      </section>
      {roster.athletes.some((athlete) => athlete.status === "pending" && !athlete.expired) && <p className="mt-4 break-words text-sm text-muted-foreground">Athlete signup link: <Link href="/account/sign-up?as=athlete&next=%2Faccount%2Fathletes" prefetch={false} className="text-brand underline">/account/sign-up?as=athlete&amp;next=%2Faccount%2Fathletes</Link>. Ask them to use their invited email.</p>}
      <p className="mt-6 text-sm"><Link prefetch={false} href="/account/plans" className="text-brand underline">Build and assign a multiweek training plan →</Link></p>
      {hasConnectedAthletes ? <section aria-labelledby="assign-workout" className="mt-10 rounded-xl border border-brand/30 bg-muted/40 p-5 sm:p-7">
        <h2 id="assign-workout" className="text-xl font-semibold">Assign a workout</h2><p className="mt-2 text-sm text-muted-foreground">{selected.length ? `For ${roster.athletes.filter((a) => selected.includes(a.id)).map((a) => a.athleteName).join(", ")}.` : "Select athletes in the roster above."} Copies can be adjusted individually in each athlete’s calendar.</p>
        <label className="mt-5 block text-sm font-medium">Start from your library<select disabled={busy} value={template} onChange={(e) => { setTemplate(e.target.value); setStructure(library.find((entry) => entry.id === e.target.value)?.structure ?? []); assignmentId.current = null; }} className={accountInput}><option value="">Create a new workout</option>{library.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label>
        <form key={template} onSubmit={assign} className="mt-5"><fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium sm:col-span-2">Workout title<input name="title" required maxLength={120} defaultValue={chosen?.title ?? ""} className={accountInput} /></label>
          <label className="text-sm font-medium">Date<input name="date" type="date" required min="2000-01-01" max="2100-12-31" defaultValue={roster.from} className={accountInput} /></label><label className="text-sm font-medium">Sport<select name="sport" defaultValue={chosen?.sport ?? "run"} className={accountInput}>{TRAINING_SPORTS.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select></label>
          <label className="text-sm font-medium">Planned minutes<input name="minutes" type="number" min="0" max="10080" step="0.01" defaultValue={chosen?.plannedMinutes ?? ""} className={accountInput} /></label><label className="text-sm font-medium">Planned distance (km)<input name="km" type="number" min="0" max="2000" step="0.01" defaultValue={chosen?.plannedKm ?? ""} className={accountInput} /></label>
          <div className="sm:col-span-2"><WorkoutStructureEditor value={structure} onChange={setStructure} disabled={busy} /></div>
          <label className="text-sm font-medium sm:col-span-2">Instructions<textarea name="notes" rows={3} maxLength={1000} defaultValue={chosen?.notes ?? ""} className={accountInput} /></label><div className="sm:col-span-2"><button className={primary} disabled={!selected.length}>Assign to {selected.length} athlete{selected.length === 1 ? "" : "s"}</button></div>
        </fieldset></form>
      </section> : <p className="mt-6 rounded-xl bg-muted p-6 text-sm text-muted-foreground">Once an athlete accepts, select them in your roster to assign their first workout. You can build a training plan while you wait.</p>}<p className="mt-6 text-sm text-muted-foreground">Up to 100 connected athletes and pending invitations. Group assignments save up to 20 copies at once and count once per athlete toward the coach allowance of 20,000 monthly saves. No automatic overage charges.</p>
    </> : view === "coach" ? <p className="mt-8 text-sm text-muted-foreground">Athlete management becomes available after your coach application is approved.</p> : null}
  </div>;
}
