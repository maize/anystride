import Link from "next/link";
import type { Metadata } from "next";
import { filterCoaches, availableFocuses } from "@/lib/coaches";
import { CoachCard } from "@/components/CoachCard";
import {
  COACH_FOCUS_LABELS,
  COACH_FORMAT_LABELS,
  FOCUS_ORDER,
  type CoachFocus,
  type CoachFormat,
} from "@/data/coaches";

export const metadata: Metadata = {
  title: "Find a running coach in NYC",
  description:
    "Browse running coaches in New York City — marathon, first-timers, 5K–10K, and more. Filter by focus and format, then connect directly with the coach.",
  alternates: { canonical: "/coaching" },
};

const FORMATS: CoachFormat[] = ["online", "in-person", "hybrid"];

function isFocus(v: string | undefined): v is CoachFocus {
  return !!v && (FOCUS_ORDER as string[]).includes(v);
}
function isFormat(v: string | undefined): v is CoachFormat {
  return !!v && FORMATS.includes(v as CoachFormat);
}
function buildHref(next: { focus?: string; format?: string }): string {
  const p = new URLSearchParams();
  if (next.focus) p.set("focus", next.focus);
  if (next.format) p.set("format", next.format);
  const qs = p.toString();
  return qs ? `/coaching?${qs}` : "/coaching";
}

function Chip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-brand-foreground"
          : "rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:border-brand"
      }
    >
      {label}
    </Link>
  );
}

export default async function CoachingPage({
  searchParams,
}: PageProps<"/coaching">) {
  const sp = await searchParams;
  const rawFocus = Array.isArray(sp.focus) ? sp.focus[0] : sp.focus;
  const rawFormat = Array.isArray(sp.format) ? sp.format[0] : sp.format;
  const focus = isFocus(rawFocus) ? rawFocus : undefined;
  const format = isFormat(rawFormat) ? rawFormat : undefined;

  const coaches = filterCoaches({ focus, format });
  const focuses = availableFocuses();

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <p className="mb-2 text-sm font-medium text-brand">New York City · Beta</p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Find a running coach in NYC
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Sometimes a plan isn&apos;t enough and you want a real person. Browse NYC
        running coaches by focus and format, then connect with them directly.
      </p>

      {/* Honest listing disclosure */}
      <div className="mt-6 rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
        These are public listings we compiled to get the directory started — they
        link to each coach&apos;s own site and aren&apos;t yet AnyStride-verified.{" "}
        <Link href="/coaching/apply" className="font-medium text-brand hover:underline">
          Are you a coach? Claim or add your profile →
        </Link>
      </div>

      {/* Filters */}
      <div className="mt-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Focus
          </span>
          <Chip label="All" href={buildHref({ format })} active={!focus} />
          {focuses.map((f) => (
            <Chip
              key={f}
              label={COACH_FOCUS_LABELS[f]}
              href={buildHref({ focus: f, format })}
              active={focus === f}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Format
          </span>
          <Chip label="All" href={buildHref({ focus })} active={!format} />
          {FORMATS.map((f) => (
            <Chip
              key={f}
              label={COACH_FORMAT_LABELS[f]}
              href={buildHref({ focus, format: f })}
              active={format === f}
            />
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="mt-10">
        {coaches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            <p className="font-medium">No coaches match those filters yet.</p>
            <Link href="/coaching" className="mt-1 inline-block text-sm text-brand hover:underline">
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coaches.map((coach) => (
              <CoachCard key={coach.slug} coach={coach} />
            ))}
          </div>
        )}
      </div>

      {/* Coach CTA */}
      <section className="mt-12 flex flex-col gap-3 rounded-2xl bg-muted p-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Are you a running coach?
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            List your coaching on AnyStride and reach runners who&apos;ve outgrown a
            plan. Free while we build out the directory.
          </p>
        </div>
        <Link
          href="/coaching/apply"
          className="shrink-0 rounded-full bg-brand px-6 py-2.5 font-medium text-brand-foreground hover:opacity-90"
        >
          Apply to be listed
        </Link>
      </section>
    </div>
  );
}
