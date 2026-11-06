"use client";

import Link from "next/link";
import { useId, useState } from "react";

type View = "runner" | "coach";
const workouts = [
  { day: "Mon", title: "Rest day", duration: "Rest", note: "A day away from running. Let the previous week settle.", result: null },
  { day: "Tue", title: "Easy run", duration: "40 min", note: "Keep the effort conversational. The aim is to finish feeling like you could keep going.", result: "41 min · 6.3 km · Effort 3/10" },
  { day: "Wed", title: "Rest day", duration: "Rest", note: "No running scheduled today.", result: null },
  { day: "Thu", title: "Controlled intervals", duration: "36 min", note: "10 min easy warmup, then 4 × (3 min controlled effort + 1 min easy recovery). Finish with 10 min easy.", result: null },
  { day: "Fri", title: "Rest day", duration: "Rest", note: "No running scheduled today.", result: null },
  { day: "Sat", title: "Easy run", duration: "30 min", note: "Relaxed running at a comfortable effort. Save your energy for Sunday.", result: null },
  { day: "Sun", title: "Long easy run", duration: "65 min", note: "Keep a steady, conversational effort throughout. Focus on time on your feet.", result: null },
];
const athletes = [
  { name: "Alex Morgan", goal: "First half marathon", plan: "Half marathon · Week 4 of 12" },
  { name: "Sam Rivera", goal: "A stronger 10K", plan: "10K · Week 2 of 8" },
  { name: "Jamie Lee", goal: "Build consistency", plan: "Base building · Week 1 of 6" },
];

export function CoachingWorkspacePreview() {
  const id = useId();
  const [view, setView] = useState<View>("runner");
  const [screen, setScreen] = useState("calendar");
  const [day, setDay] = useState(1);
  const [athlete, setAthlete] = useState(0);
  const workout = workouts[day];
  const coach = view === "coach";
  const tabs = coach ? [["athletes", "Athletes"], ["calendar", "Athlete calendar"]] : [["calendar", "Training calendar"], ["coaches", "My coaches"]];

  function changeView(next: View) {
    setView(next);
    setScreen(next === "coach" ? "athletes" : "calendar");
    setAthlete(0);
    setDay(1);
  }

  return <section id="account-preview" aria-labelledby={`${id}-heading`} className="coaching-workspace-preview scroll-mt-24 border-t border-border py-12 sm:py-16">
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-xl">
        <p className="eyebrow text-brand">Take a look inside · No account needed</p>
        <h2 id={`${id}-heading`} className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Your week, with coaching.</h2>
        <p className="mt-4 text-muted-foreground">See how runners follow their training and how coaches manage it. Switch sides to explore both account views.</p>
      </div>
      <div role="group" aria-label="Choose an account preview" className="flex rounded-full border border-border p-1">
        {([["runner", "I’m a runner"], ["coach", "I’m a coach"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={view === value} aria-controls={`${id}-workspace`} onClick={() => changeView(value)} className={`min-h-12 rounded-full px-5 text-sm font-semibold transition-colors ${view === value ? "bg-foreground text-background" : "hover:bg-muted"}`}>{label}</button>)}
      </div>
    </div>

    <div id={`${id}-workspace`} className="mt-8 overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted px-5 py-4 sm:px-8">
        <p className="font-semibold tracking-tight">anystride <span className="ml-2 text-sm font-normal text-muted-foreground">/ {coach ? "Coach account" : "Runner account"}</span></p>
        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium">Interactive preview · Sample data</span>
      </div>
      <div className="p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-semibold text-brand">{coach ? "Approved coach view" : "Runner view · Alex Morgan"}</p><h3 className="mt-2 text-2xl font-semibold tracking-tight">{coach ? "Your coaching workspace" : "Your running"}</h3><p className="mt-2 text-sm text-muted-foreground">{coach ? "Open an athlete’s calendar to review their training." : "Your assigned workouts and the runs you’ve recorded, together."}</p></div>
          <span className="font-mono text-xs text-muted-foreground">DEMO / {coach ? "02" : "01"}</span>
        </div>
        <div role="group" aria-label="Preview screens" className="mt-6 flex flex-wrap gap-2 border-b border-border pb-4">
          {tabs.map(([value, label]) => <button key={value} type="button" aria-pressed={screen === value} onClick={() => setScreen(value)} className={`min-h-12 rounded-lg px-4 py-2 text-sm font-semibold ${screen === value ? "bg-foreground text-background" : "bg-muted hover:text-brand"}`}>{label}</button>)}
        </div>

        {screen === "athletes" ? <div className="pt-6">
          <h4 className="text-lg font-semibold">Your athletes <span className="ml-2 text-sm font-normal text-muted-foreground">3 example athletes</span></h4>
          <ul className="mt-4 divide-y divide-border">
            {athletes.map((person, index) => <li key={person.name} className="flex flex-wrap items-center justify-between gap-4 py-5">
              <div><p className="font-semibold">{person.name}</p><p className="mt-1 text-sm text-muted-foreground">{person.goal}</p></div>
              <button type="button" className="action-link" onClick={() => { setAthlete(index); setScreen("calendar"); }}>View calendar <span className="sr-only">for {person.name}</span> →</button>
            </li>)}
          </ul>
          <p className="mt-4 rounded-lg bg-muted p-4 text-sm text-muted-foreground">Invite your athletes once your coach account is approved. They accept your invitation before you can access their calendars.</p>
        </div> : screen === "coaches" ? <div className="mt-6 rounded-xl bg-muted p-6">
          <p className="eyebrow">Example coaching relationship</p><h4 className="mt-3 text-xl font-semibold">Taylor · Running coach</h4>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">Your coach can assign a plan, adjust upcoming workouts and review the results you record in your calendar.</p>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground">You choose whether to accept an invitation and can end calendar access from your account. Sharing Strava activities is a separate choice.</p>
          <Link href="/coaches" className="action-link mt-4">Find your coach →</Link>
        </div> : <div className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">{coach ? `${athletes[athlete].name}’s training` : "Your training calendar"}</h4><p className="text-sm text-muted-foreground">{athletes[coach ? athlete : 0].plan}</p></div>
          <p className="mt-2 text-xs text-muted-foreground">Illustrative week · Select a day to see the workout.</p>
          <div role="group" aria-label="Sample training week" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {workouts.map((entry, index) => <button key={entry.day} type="button" aria-pressed={day === index} aria-controls={`${id}-workout`} onClick={() => setDay(index)} className={`min-h-32 rounded-lg border p-3 text-left transition-colors ${day === index ? "border-brand bg-brand/5 ring-1 ring-brand" : "border-border bg-muted hover:border-brand/50"}`}>
              <span className="block text-xs text-muted-foreground">{entry.day}</span><span className="mt-3 block text-sm font-semibold">{entry.title}</span><span className="mt-2 block text-xs text-muted-foreground">{entry.result ? "Completed" : entry.duration}</span>
            </button>)}
          </div>
          <div id={`${id}-workout`} aria-live="polite" aria-atomic="true" className="mt-5 grid gap-6 rounded-xl bg-muted p-5 sm:grid-cols-[1.4fr_1fr] sm:p-6">
            <div><p className="text-xs font-semibold text-brand">{workout.day} · {workout.result ? "Completed" : "Planned"}</p><h4 className="mt-2 text-xl font-semibold">{workout.title}</h4><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{workout.note}</p></div>
            <dl className="space-y-4 border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0"><div><dt className="text-xs text-muted-foreground">Planned</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{workout.duration}</dd></div><div><dt className="text-xs text-muted-foreground">Recorded by runner</dt><dd className="mt-1 text-sm">{workout.result ?? "No result recorded"}</dd></div></dl>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{coach ? "In your account, you can assign multiweek plans and edit upcoming workouts for each athlete." : "After your run, record your time, distance and effort so your coach can review how it went."}</p>
        </div>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-5 border-t border-border bg-muted px-5 py-6 sm:px-8">
        <div className="max-w-lg"><p className="font-semibold">{coach ? "Bring your athletes to Anystride." : "Make room for your next goal."}</p><p className="mt-2 text-sm text-muted-foreground">{coach ? "Apply for a coach account. Athlete tools become available after approval." : "Create a runner account, then find a coach or accept your coach’s invitation. Coaching is arranged separately."}</p></div>
        <Link href={coach ? "/account/sign-up?as=coach&next=%2Faccount%2Fservices" : "/account/sign-up?as=runner&next=%2Faccount%2Frunner"} prefetch={false} className="action-primary">{coach ? "Apply as a coach" : "Create my runner account"} →</Link>
      </div>
    </div>
    <p className="mt-4 text-xs text-muted-foreground">A guided preview of account features, using fictional people and sample training. Nothing here is saved. Coaching tools are in early access; services and prices depend on the coach.</p>
  </section>;
}
