import type { Metadata } from "next";
import Link from "next/link";
import { COACHES } from "@/data/coaches";
import { CoachPortrait } from "@/components/CoachPortrait";

export const metadata: Metadata = {
  title: "Jack Anstey — Coaching profile preview",
  description: "A draft of Jack’s coaching storefront on Anystride, for review.",
  robots: { index: false, follow: false },
};

export default function JackAnsteyPreview() {
  const coach = COACHES.find((entry) => entry.slug === "jack-anstey")!;
  return <div className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
    <aside aria-label="Preview notice" className="mt-8 rounded-xl border border-border bg-muted px-6 py-4 text-sm leading-relaxed">
      <strong>Profile preview for Jack.</strong> Biography adapted from your existing coach-provided profile. Service presentation is a draft for your review; pricing and terms are not confirmed. No purchases can be made here.
    </aside>
    <header className="grid items-center gap-8 py-12 md:grid-cols-[1.5fr_1fr] md:gap-16 sm:py-16">
      <div>
        <p className="eyebrow text-brand">Online running coach · Athletes worldwide</p>
        <h1 className="text-hero-gradient mt-6 text-5xl font-semibold tracking-tighter sm:text-7xl lg:text-8xl">{coach.name}</h1>
        <p className="mt-6 max-w-xl text-2xl font-medium tracking-tight sm:text-3xl">Your goals. A plan built around you.</p>
        <p className="mt-6 max-w-lg leading-relaxed text-muted-foreground">{coach.blurb}</p>
        <div className="mt-8 flex flex-wrap gap-4 text-sm text-muted-foreground">{["800m to marathon", "Personalized training", "Online coaching"].map((label) => <span key={label} className="inline-flex items-center gap-2"><span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />{label}</span>)}</div>
        <a href="#services" className="action-primary mt-8">Explore coaching <span aria-hidden="true">↗</span></a>
      </div>
      <figure className="mx-auto w-full max-w-sm">
        <CoachPortrait name={coach.name} />
        <figcaption className="mt-3 text-center text-xs text-muted-foreground">Portrait placeholder · Jack’s photo to be added</figcaption>
      </figure>
    </header>
    <nav aria-label="Profile sections" className="flex flex-wrap gap-8 border-y border-border py-4 text-sm font-semibold">
      <a href="#services" className="hover:text-brand">Coaching</a><a href="#approach" className="hover:text-brand">My approach</a><a href="#experience" className="hover:text-brand">Experience</a>
    </nav>
    <section id="services" aria-labelledby="services-heading" className="scroll-mt-24 py-12 sm:py-16">
      <p className="eyebrow text-brand">Work with Jack · Proposed service</p>
      <h2 id="services-heading" className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Personal coaching. A clear direction.</h2>
      <article className="mt-8 grid gap-8 rounded-2xl bg-muted p-6 sm:p-8 lg:grid-cols-[1fr_18rem]">
        <div>
          <h3 className="text-2xl font-semibold">Individualized online coaching</h3>
          <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">Training shaped around your ability, goals and life. From your first 5K to a competitive breakthrough, build consistency with ongoing feedback and a clear purpose behind every session.</p>
          <ul className="mt-6 grid gap-4 text-sm sm:grid-cols-2">{["Personalized training", "Regular communication", "Training adjustments", "Race planning", "Ongoing feedback"].map((item) => <li key={item} className="flex gap-3"><span aria-hidden="true" className="text-brand">↗</span>{item}</li>)}</ul>
        </div>
        <div className="flex flex-col items-start gap-4">
          <p className="text-2xl font-semibold">Pricing to be confirmed</p>
          <p className="text-sm leading-relaxed text-muted-foreground">Jack will confirm the price, duration, communication schedule and cancellation terms before this service is available.</p>
          <button type="button" disabled className="mt-auto w-full cursor-not-allowed rounded-full border border-border px-6 py-3 text-sm font-semibold text-muted-foreground">Preview only · Booking unavailable</button>
        </div>
      </article>
    </section>
    <section id="approach" aria-labelledby="approach-heading" className="grid scroll-mt-24 gap-8 border-t border-border py-12 md:grid-cols-[1fr_1.5fr] md:gap-16 sm:py-16">
      <div><p className="eyebrow">The person in your corner</p><h2 id="approach-heading" className="mt-4 text-3xl font-semibold tracking-tight">A little about<br />how I coach.</h2></div>
      <div className="space-y-6 text-lg leading-relaxed">{coach.bio.slice(1).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
    </section>
    <section id="experience" aria-labelledby="experience-heading" className="grid scroll-mt-24 gap-8 border-t border-border py-12 md:grid-cols-[1fr_1.5fr] md:gap-16">
      <h2 id="experience-heading" className="text-3xl font-semibold tracking-tight">Experience & background</h2>
      <div><p className="text-lg leading-relaxed">{coach.bio[0]}</p><p className="mt-6 text-sm text-muted-foreground">From Jack’s existing coach-provided profile. Please review for any updates before publishing.</p></div>
    </section>
    <aside className="rounded-2xl bg-muted p-6 sm:p-8">
      <h2 className="text-2xl font-semibold">Make this page yours.</h2>
      <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">For review: your preferred photo, headline, service price and duration, how athletes can contact you, and your cancellation terms. This preview does not publish a service or connect payments.</p>
      <Link href="/coaching/jack-anstey" className="action-link mt-6">View existing directory profile →</Link>
    </aside>
  </div>;
}
