import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllRaces,
  getRaceBySlug,
  getRacerBySlug,
  getAllRacers,
  isUpcoming,
} from "@/lib/races";
import { COUNTRY_FLAGS } from "@/data/racers";
import type { FieldEntry } from "@/data/races";
import { Avatar } from "@/components/Avatar";
import { RacerCard } from "@/components/RacerCard";
import { JsonLd } from "@/components/JsonLd";

export function generateStaticParams() {
  return getAllRaces().map((race) => ({ slug: race.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/races/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const race = getRaceBySlug(slug);
  if (!race) return { title: "Race not found" };
  return {
    title: race.name,
    description: race.why,
    alternates: { canonical: `/races/${race.slug}` },
  };
}

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function FieldList({ entries, title }: { entries: FieldEntry[]; title: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ol className="mt-3 space-y-2">
        {entries.map((entry) => {
          const racer = getRacerBySlug(entry.racer);
          if (!racer) return null;
          return (
            <li key={entry.racer}>
              <Link
                href={`/racers/${racer.slug}`}
                className="group flex items-center gap-3 rounded-xl border border-border p-3 transition-all duration-300 ease-stride hover:-translate-y-0.5 hover:border-brand"
              >
                {entry.place != null && (
                  <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">
                    {entry.place}
                  </span>
                )}
                <Avatar name={racer.name} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium group-hover:text-brand">
                    {racer.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {COUNTRY_FLAGS[racer.country] ?? ""} {racer.country}
                  </span>
                </span>
                {entry.time && (
                  <span className="shrink-0 font-mono text-sm tabular-nums">
                    {entry.time}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default async function RacePage({ params }: PageProps<"/races/[slug]">) {
  const { slug } = await params;
  const race = getRaceBySlug(slug);
  if (!race) notFound();

  const upcoming = isUpcoming(race);
  const url = `https://anystride.com/races/${race.slug}`;

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: race.name,
          sport: "Running",
          startDate: race.date,
          eventStatus: "https://schema.org/EventScheduled",
          location: {
            "@type": "Place",
            name: `${race.city}, ${race.country}`,
          },
          url,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Races", item: "https://anystride.com/races" },
            { "@type": "ListItem", position: 2, name: race.name, item: url },
          ],
        }}
      />

      <Link
        href="/races"
        className="text-sm font-medium text-muted-foreground hover:text-brand"
      >
        ← All races
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {race.distance}
        </span>
        {race.series && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {race.series}
          </span>
        )}
        <span
          className={
            upcoming
              ? "rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand"
              : "rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
          }
        >
          {upcoming ? "Upcoming" : "Result"}
        </span>
      </div>

      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        {race.name}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {fmtDate(race.date)} · {race.city}, {race.country}
      </p>

      <p className="mt-6 text-lg leading-relaxed">{race.why}</p>

      {race.watchUrl && (
        <a
          href={race.watchUrl}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="mt-6 inline-flex rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          {upcoming ? "How to watch →" : "Race info →"}
        </a>
      )}

      {/* Field / results */}
      <div className="mt-10">
        {race.fieldConfirmed ? (
          <>
            <h2 className="text-xl font-semibold tracking-tight">
              {upcoming ? "The field" : "Results"}
            </h2>
            <div className="mt-4 grid gap-8 sm:grid-cols-2">
              {race.men && race.men.length > 0 && (
                <FieldList entries={race.men} title="Men" />
              )}
              {race.women && race.women.length > 0 && (
                <FieldList entries={race.women} title="Women" />
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold tracking-tight">Ones to watch</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The elite field is announced closer to race day. Here are the stars
              lighting up the 2026 season — any of whom could line up.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {getAllRacers().map((racer) => (
                <RacerCard key={racer.slug} racer={racer} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
