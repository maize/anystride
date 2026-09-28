import Link from "next/link";
import type { Metadata } from "next";
import { filterCoaches, availableFocuses, availableCities } from "@/lib/coaches";
import { citySlug } from "@/lib/slug";
import { CoachCard } from "@/components/CoachCard";
import { marketplacePublicCatalog, type PublicMarketplaceService } from "@/lib/marketplace-store";
import {
  COACH_FOCUS_LABELS,
  COACH_FORMAT_LABELS,
  FOCUS_ORDER,
  type CoachFocus,
  type CoachFormat,
} from "@/data/coaches";

export const metadata: Metadata = {
  title: "Find a running coach",
  description:
    "Browse running coaches across US cities — New York, Boston, Chicago, LA, San Francisco, and online. Filter by city, focus, and format, then connect directly.",
  alternates: { canonical: "/coaching" },
};

const FORMATS: CoachFormat[] = ["online", "in-person", "hybrid"];

function SelectCaret() {
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground">
    <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
  </svg>;
}

function price(amount: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount / 100);
}

function isFocus(v: string | undefined): v is CoachFocus {
  return !!v && (FOCUS_ORDER as string[]).includes(v);
}
function isFormat(v: string | undefined): v is CoachFormat {
  return !!v && FORMATS.includes(v as CoachFormat);
}
export default async function CoachingPage({
  searchParams,
}: PageProps<"/coaching">) {
  const sp = await searchParams;
  const pick = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const cities = availableCities();
  const rawCity = pick(sp.city);
  const city = rawCity && cities.includes(rawCity) ? rawCity : undefined;
  const focus = isFocus(pick(sp.focus)) ? (pick(sp.focus) as CoachFocus) : undefined;
  const format = isFormat(pick(sp.format))
    ? (pick(sp.format) as CoachFormat)
    : undefined;

  const coaches = filterCoaches({ city, focus, format });
  const focuses = availableFocuses();
  const hasFilters = Boolean(city || focus || format);
  let services: PublicMarketplaceService[] = [];
  try { services = await marketplacePublicCatalog(); }
  catch { console.error("Public coaching service catalog could not be loaded."); }

  return (
    <div className="mx-auto max-w-5xl px-5 pb-16">
      <section className="py-12">
        <h1 className="text-hero-gradient text-3xl font-bold tracking-tight sm:text-4xl">Find a running coach</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">Browse running coaches by city, focus, and format, then connect with them directly.</p>
        <Link href="/coaching/apply" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">Are you a coach? Claim or add your profile →</Link>
      </section>

      {services.length > 0 && <section aria-labelledby="services-heading" className="mb-12 border-t border-border pt-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow text-brand">Ready to start</p>
            <h2 id="services-heading" className="mt-3 text-2xl font-semibold tracking-tight">Coaching services</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Reviewed offers from coaches testing the Anystride pilot. Sign in to ask a coach about an offer; no payment is taken.</p>
          </div>
          <Link href="/account" className="action-link shrink-0">Open your coaching account <span aria-hidden="true">→</span></Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {services.map((service) => <article key={service.id} className="group flex h-full flex-col rounded-2xl border border-border bg-background p-6 transition-all duration-300 ease-stride hover:-translate-y-1 hover:border-brand/50">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <span>{service.coachName}</span>
              <span>{service.durationWeeks} {service.durationWeeks === 1 ? "week" : "weeks"}</span>
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight transition-colors duration-300 ease-stride group-hover:text-brand">{service.title}</h3>
            <p className="mt-3 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{service.description}</p>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
              <p><span className="text-xs text-muted-foreground">Proposed total</span><br /><span className="font-semibold tabular-nums">{price(service.amount, service.currency)}</span></p>
              <Link href="/account" className="text-sm font-semibold text-brand hover:underline">Ask this coach →</Link>
            </div>
          </article>)}
        </div>
      </section>}

      <div className="grid items-start gap-8 border-t border-border pt-8 lg:grid-cols-4 lg:gap-12">
        <aside aria-label="Filter coaches" className="lg:sticky lg:top-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold tracking-tight">Find your coach</h2>
            {hasFilters && <Link href="/coaching#coaches" className="text-xs font-medium text-brand hover:underline">Clear all</Link>}
          </div>
          <form key={`${city}-${focus}-${format}`} action="/coaching#coaches" method="get" className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <label className="text-sm font-medium">City
              <span className="relative mt-2 block">
                <select name="city" defaultValue={city ?? ""} className="filter-select">
                  <option value="">All locations</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <SelectCaret />
              </span>
            </label>
            <label className="text-sm font-medium">Training focus
              <span className="relative mt-2 block">
                <select name="focus" defaultValue={focus ?? ""} className="filter-select">
                  <option value="">Every goal</option>
                  {focuses.map((f) => <option key={f} value={f}>{COACH_FOCUS_LABELS[f]}</option>)}
                </select>
                <SelectCaret />
              </span>
            </label>
            <label className="text-sm font-medium">Coaching format
              <span className="relative mt-2 block">
                <select name="format" defaultValue={format ?? ""} className="filter-select">
                  <option value="">All formats</option>
                  {FORMATS.map((f) => <option key={f} value={f}>{COACH_FORMAT_LABELS[f]}</option>)}
                </select>
                <SelectCaret />
              </span>
            </label>
            <button type="submit" className="action-primary sm:col-span-3 lg:col-span-1">Find coaches <span aria-hidden="true">→</span></button>
          </form>
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">Profiles connect to each coach&apos;s website or preferred booking method. Unverified listings are labeled on their profile.</p>
        </aside>

        <section id="coaches" aria-labelledby="coach-results-heading" className="scroll-mt-8 lg:col-span-3">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="coach-results-heading" className="text-xl font-semibold tracking-tight">{city ? `Coaches in ${city}` : "Meet the coaches"}</h2>
            <p className="text-sm text-muted-foreground tabular-nums">{coaches.length} {coaches.length === 1 ? "profile" : "profiles"}{hasFilters ? (coaches.length === 1 ? " matches your filters" : " match your filters") : " to explore"}</p>
          </div>
        {coaches.length === 0 ? (
          <div className="rounded-2xl bg-muted p-8 sm:p-12">
            <p className="eyebrow">Keep looking</p>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight">No match for this combination yet.</h3>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">Try another location or include online coaching to find more options for your goal.</p>
            <Link href="/coaching#coaches" className="action-link mt-4">
              See all coaches <span aria-hidden="true">→</span>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {coaches.map((coach) => (
              <CoachCard key={coach.slug} coach={coach} />
            ))}
          </div>
        )}
        </section>
      </div>

      {/* Optional manual matching pilot */}
      <section className="mt-12 border-t border-border pt-6">
        <h2 className="text-xl font-semibold">Not sure where to start?</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Register interest in our manual coach-matching pilot. The request is free; a match is not guaranteed.</p>
        <Link href="/coaching/match" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">Ask about finding a coach →</Link>
      </section>

      {/* City pages (internal links for SEO) */}
      <div className="mt-12 border-t border-border pt-6">
        <h2 className="text-lg font-semibold tracking-tight">
          Browse coaches by city
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {cities.map((c) => (
            <Link
              key={c}
              href={`/running-coaches/${citySlug(c)}`}
              className="action-link mr-4"
            >
              {c === "Online" ? "Online coaches" : `${c} coaches`}
            </Link>
          ))}
        </div>
      </div>

      {/* Coach CTA */}
      <section className="mt-12 flex flex-col gap-6 rounded-2xl bg-muted p-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Are you a running coach?
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            List your coaching on anystride and reach runners who&apos;ve outgrown a
            plan. Free while we build out the directory.
          </p>
        </div>
        <Link
          href="/coaching/apply"
          className="action-primary shrink-0"
        >
          Apply to be listed
        </Link>
      </section>
    </div>
  );
}
