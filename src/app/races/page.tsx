import Link from "next/link";
import type { Metadata } from "next";
import { upcomingRaces, pastRaces } from "@/lib/races";
import type { Race } from "@/data/races";

export const metadata: Metadata = {
  title: "Races to watch",
  description:
    "The pro running races worth watching — upcoming marathon majors and the stars in the field, plus recent results. Updated weekly.",
  alternates: { canonical: "/races" },
};

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function daysUntil(date: string): number {
  const ms = new Date(date).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

function RaceRow({ race, past }: { race: Race; past?: boolean }) {
  return (
    <Link
      href={`/races/${race.slug}`}
      className="group flex flex-col gap-1 rounded-xl border border-border p-5 transition-all duration-300 ease-stride hover:-translate-y-0.5 hover:border-brand sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h3 className="font-semibold transition-colors duration-300 ease-stride group-hover:text-brand">{race.name}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {fmtDate(race.date)} · {race.city}, {race.country} · {race.distance}
        </p>
      </div>
      {!past && (
        <span className="shrink-0 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
          in {daysUntil(race.date)} days
        </span>
      )}
    </Link>
  );
}

export default function RacesPage() {
  const upcoming = upcomingRaces();
  const past = pastRaces();
  const next = upcoming[0];

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="text-hero-gradient text-3xl font-bold tracking-tight sm:text-4xl">
        Races to watch
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        The pro running races worth your time — who&apos;s in the field, why each
        one matters, and where to watch. Because following the sport is half the
        fun of running it.
      </p>

      {/* Next race highlight */}
      {next && (
        <Link
          href={`/races/${next.slug}`}
          className="mt-8 block rounded-2xl border border-border bg-muted p-6 transition-all duration-300 ease-stride hover:-translate-y-0.5 hover:border-brand"
        >
          <p className="text-sm font-medium text-brand">
            Next up · in {daysUntil(next.date)} days
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            {next.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmtDate(next.date)} · {next.city}, {next.country}
          </p>
          <p className="mt-3 max-w-2xl text-sm">{next.why}</p>
        </Link>
      )}

      {/* Upcoming */}
      {upcoming.length > 1 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Upcoming races
          </h2>
          <div className="mt-3 space-y-3">
            {upcoming.slice(1).map((race) => (
              <RaceRow key={race.slug} race={race} />
            ))}
          </div>
        </section>
      )}

      {/* Recent results */}
      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent results
          </h2>
          <div className="mt-3 space-y-3">
            {past.map((race) => (
              <RaceRow key={race.slug} race={race} past />
            ))}
          </div>
        </section>
      )}

      <p className="mt-10 text-xs text-muted-foreground">
        Race calendar and athlete stats are updated weekly. Spot something out of
        date?{" "}
        <Link href="/coaching/apply" className="text-brand hover:underline">
          Let us know
        </Link>
        .
      </p>
    </div>
  );
}
