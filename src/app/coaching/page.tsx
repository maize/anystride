import Link from "next/link";
import type { Metadata } from "next";
import { filterCoaches, availableFocuses, availableCities } from "@/lib/coaches";
import { citySlug } from "@/lib/slug";
import { CoachCard } from "@/components/CoachCard";
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

  return (
    <div className="mx-auto max-w-5xl px-5 pb-16">
      <section className="py-12">
        <h1 className="text-hero-gradient text-3xl font-bold tracking-tight sm:text-4xl">Find a running coach</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">Browse running coaches by city, focus, and format, then connect with them directly.</p>
        <Link href="/coaching/apply" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">Are you a coach? Claim or add your profile →</Link>
      </section>

      <div className="grid items-start gap-8 border-t border-border pt-8 lg:grid-cols-4 lg:gap-12">
        <aside aria-label="Filter coaches" className="lg:sticky lg:top-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold tracking-tight">Find your coach</h2>
            {hasFilters && <Link href="/coaching#coaches" className="text-xs font-medium text-brand hover:underline">Clear all</Link>}
          </div>
          <form key={`${city}-${focus}-${format}`} action="/coaching#coaches" method="get" className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <label className="text-sm font-medium">City
              <select name="city" defaultValue={city ?? ""} className="filter-select">
                <option value="">All locations</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Training focus
              <select name="focus" defaultValue={focus ?? ""} className="filter-select">
                <option value="">Every goal</option>
                {focuses.map((f) => <option key={f} value={f}>{COACH_FOCUS_LABELS[f]}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Coaching format
              <select name="format" defaultValue={format ?? ""} className="filter-select">
                <option value="">All formats</option>
                {FORMATS.map((f) => <option key={f} value={f}>{COACH_FORMAT_LABELS[f]}</option>)}
              </select>
            </label>
            <button type="submit" className="action-primary sm:col-span-3 lg:col-span-1">Find coaches <span aria-hidden="true">→</span></button>
          </form>
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">Public listings, not yet verified by anystride. Each profile links to the coach&apos;s own website.</p>
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
