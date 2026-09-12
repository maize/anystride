import Link from "next/link";
import type { Metadata } from "next";
import {
  formatRaceDate,
  getRaceStatus,
  isRaceDataStale,
  pastRaces,
  raceTimingLabel,
  upcomingRaces,
} from "@/lib/races";
import type { Race } from "@/data/races";

// Date-relative labels and live states should never remain frozen at deploy time.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Races to watch",
  description:
    "Source-backed schedules, confirmed fields, and official results for the pro running races worth watching.",
  alternates: { canonical: "/races" },
};

function RaceRow({ race, now }: { race: Race; now: Date }) {
  const stale = isRaceDataStale(race, now);
  const status = getRaceStatus(race, now);
  return (
    <Link
      href={`/races/${race.slug}`}
      className="group flex flex-col gap-1 rounded-xl border border-border p-5 transition-all duration-300 ease-stride hover:-translate-y-0.5 hover:border-brand sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h3 className="font-semibold transition-colors duration-300 ease-stride group-hover:text-brand">{race.name}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {formatRaceDate(race)} · {race.city}, {race.country} · {race.distance}
        </p>
      </div>
      <span
        className={
          status === "live" && !stale
            ? "shrink-0 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-brand-foreground"
            : "shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
        }
      >
        {stale ? "Needs review" : raceTimingLabel(race, now)}
      </span>
    </Link>
  );
}

export default function RacesPage() {
  const now = new Date();
  const upcoming = upcomingRaces(now);
  const past = pastRaces(now);
  const results = past.filter((race) => race.coverage === "results");
  const resultsPending = past.filter((race) => race.coverage !== "results");
  const next = upcoming[0];

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="text-hero-gradient text-3xl font-bold tracking-tight sm:text-4xl">
        Races to watch
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        The pro running races worth your time — who&apos;s in the field, why each
        one matters, and where to watch. Every schedule, field, and result links
        back to its official source.
      </p>

      {/* Next race highlight */}
      {next && (
        <Link
          href={`/races/${next.slug}`}
          className="mt-8 block rounded-2xl border border-border bg-muted p-6 transition-all duration-300 ease-stride hover:-translate-y-0.5 hover:border-brand"
        >
          <p className="text-sm font-medium text-brand">
            {isRaceDataStale(next, now)
              ? "Schedule needs review"
              : raceTimingLabel(next, now)}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            {next.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatRaceDate(next)} · {next.city}, {next.country}
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
              <RaceRow key={race.slug} race={race} now={now} />
            ))}
          </div>
        </section>
      )}

      {/* Recent results */}
      {results.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent results
          </h2>
          <div className="mt-3 space-y-3">
            {results.map((race) => (
              <RaceRow key={race.slug} race={race} now={now} />
            ))}
          </div>
        </section>
      )}

      {resultsPending.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recently finished
          </h2>
          <div className="mt-3 space-y-3">
            {resultsPending.map((race) => (
              <RaceRow key={race.slug} race={race} now={now} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-10 text-xs text-muted-foreground">
        Dates and athlete claims show when they were last checked against an
        official source. Spot something out of date?{" "}
        <a
          href="mailto:hello@anystride.com?subject=Race%20correction"
          className="text-brand hover:underline"
        >
          Let us know
        </a>
        .
      </p>
    </div>
  );
}
