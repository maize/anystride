import Link from "next/link";
import type { Storefront } from "@/lib/storefront-store";
import { CoachPortrait } from "./CoachPortrait";
import { Reveal } from "./Reveal";

export function servicePrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: amount % 100 ? 2 : 0 }).format(amount / 100);
}

export function CoachStorefront({ storefront, preview = false }: { storefront: Storefront; preview?: boolean }) {
  const { profile, offers } = storefront;
  const firstName = profile.name.split(" ")[0];
  return <div className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
    {preview && <div role="status" className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-muted px-6 py-4 text-sm"><p><strong>Your profile preview.</strong> Only approved services appear on the published page.</p><Link href="/account/storefront" className="font-semibold underline">Back to editing</Link></div>}
    <header className="pb-12 pt-8 sm:pb-16 sm:pt-12">
      <Link href="/coaching" className="action-link text-muted-foreground"><span aria-hidden="true">←</span> Find your coach</Link>
      <div className="mt-8 grid items-center gap-8 md:grid-cols-[1.5fr_1fr] md:gap-16">
        <div>
          <p className="eyebrow text-brand">Independent coach · {profile.location}</p>
          <h1 className="text-hero-gradient mt-6 break-words text-5xl font-semibold tracking-tighter sm:text-7xl lg:text-8xl">{profile.name}</h1>
          <p className="mt-6 max-w-xl text-2xl font-medium tracking-tight sm:text-3xl">{profile.headline}</p>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">{profile.bio}</p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">{profile.specialties.map((specialty) => <span key={specialty} className="inline-flex items-center gap-2"><span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />{specialty}</span>)}</div>
          <a href="#services" className="action-primary mt-8">Explore my services <span aria-hidden="true">↗</span></a>
        </div>
        <div className="mx-auto w-full max-w-sm md:mx-0"><CoachPortrait key={profile.photo_url} name={profile.name} src={profile.photo_url} /></div>
      </div>
    </header>
    <nav aria-label="Coach profile" className="sticky top-0 z-20 flex gap-8 overflow-x-auto border-y border-border bg-background/95 py-4 text-sm font-semibold backdrop-blur-xl">
      <a href="#services" className="shrink-0 hover:text-brand">Services <span className="ml-1 text-muted-foreground">{offers.length.toString().padStart(2, "0")}</span></a>
      <a href="#approach" className="shrink-0 hover:text-brand">My approach</a><a href="#getting-started" className="shrink-0 hover:text-brand">Getting started</a>
    </nav>
    <section id="services" aria-labelledby="services-title" className="scroll-mt-24 py-12 sm:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Work with me</p><h2 id="services-title" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Make room for your next goal.</h2></div><p className="max-w-xs text-sm leading-relaxed text-muted-foreground">Choose the support that fits. Clear prices, a personal approach, and a plan for getting started.</p></div>
      {!offers.length ? <div className="rounded-2xl bg-muted p-8"><h3 className="text-xl font-semibold">New services are on the way.</h3><p className="mt-3 text-muted-foreground">{firstName} is preparing their offers. Check back here to see what’s available.</p></div> : <div className="space-y-6">{offers.map((offer, index) => <Reveal key={offer.id}>
        <article className="group grid gap-8 rounded-2xl bg-muted p-6 transition-colors duration-300 ease-stride sm:p-8 lg:grid-cols-[auto_1fr_15rem] lg:gap-8">
          <p aria-hidden="true" className="font-mono text-sm text-muted-foreground">{String(index + 1).padStart(2, "0")}</p>
          <div><p className="eyebrow text-brand">{offer.kind === "consultation" ? "Personal consultation" : `${offer.duration_weeks} weeks of coaching`}</p><h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{offer.title}</h3><p className="mt-4 max-w-xl whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{offer.description}</p>
            <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-2">{offer.inclusions.map((item) => <li key={item} className="flex gap-3"><span aria-hidden="true" className="text-brand">↗</span><span>{item}</span></li>)}</ul>
          </div>
          <div className="flex flex-col items-start border-t border-border pt-6 lg:border-t-0 lg:pt-0"><p className="text-4xl font-semibold tracking-tighter tabular-nums">{servicePrice(offer.amount, offer.currency)}</p><p className="mt-2 text-sm text-muted-foreground">{offer.currency.toUpperCase()} · one payment</p><p className="mt-4 text-sm leading-relaxed text-muted-foreground">{offer.delivery}</p>
            {offer.available ? <a href={preview ? "#getting-started" : `/account/checkout/${offer.id}`} className="action-primary mt-6 w-full lg:mt-auto">{preview ? "Purchase preview" : offer.kind === "consultation" ? "Book consultation" : "Buy package"}<span aria-hidden="true">↗</span></a> : <p className="mt-6 rounded-full border border-border px-6 py-3 text-sm font-medium">Currently unavailable</p>}
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Review the full offer before payment.</p>
          </div>
        </article>
      </Reveal>)}</div>}
    </section>
    <section id="approach" aria-labelledby="approach-title" className="grid scroll-mt-24 gap-8 border-t border-border py-12 sm:py-16 md:grid-cols-[1fr_1.5fr] md:gap-16">
      <div><p className="eyebrow">The person in your corner</p><h2 id="approach-title" className="mt-3 text-3xl font-semibold tracking-tight">A little about<br />how I coach.</h2></div>
      <div><div className="space-y-5 text-lg leading-relaxed">{profile.approach.split(/\n\s*\n/).map((paragraph, index) => <p key={index} className="whitespace-pre-wrap">{paragraph}</p>)}</div><div className="mt-8 rounded-xl bg-muted p-6"><h3 className="text-sm font-semibold">Experience & qualifications</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{profile.credentials}</p></div></div>
    </section>
    <section id="getting-started" aria-labelledby="start-title" className="scroll-mt-24 border-t border-border py-12 sm:py-16">
      <p className="eyebrow">From here to your first session</p><h2 id="start-title" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A simple start.</h2>
      <ol className="mt-8 grid gap-8 sm:grid-cols-3">{[
        ["Choose your support", "Compare what’s included and review delivery and cancellation details before you buy."],
        ["Make it official", "Sign in and pay securely. Your purchase and its original details stay in your account."],
        ["Meet your coach", "After payment, open your purchase for your coach’s contact details and personal getting-started instructions."],
      ].map(([title, detail], index) => <li key={title}><span className="font-mono text-sm text-brand">0{index + 1}</span><h3 className="mt-4 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{detail}</p></li>)}</ol>
    </section>
    <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-muted px-8 py-8"><div><p className="text-xl font-semibold tracking-tight">Your goal deserves a conversation.</p><p className="mt-2 text-sm text-muted-foreground">Find the right level of support from {firstName}.</p></div><a href="#services" className="action-link">Back to services <span aria-hidden="true">↑</span></a></div>
  </div>;
}
