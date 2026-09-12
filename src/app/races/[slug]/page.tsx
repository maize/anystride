import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  formatRaceDate,
  formatRaceStartTime,
  getAllRaces,
  getRaceBySlug,
  getRacerBySlug,
  getRaceStatus,
  isRaceDataStale,
} from "@/lib/races";
import { COUNTRY_FLAGS } from "@/data/racers";
import type { FieldEntry } from "@/data/races";
import { Avatar } from "@/components/Avatar";
import { JsonLd } from "@/components/JsonLd";

// Recompute live/date-relative state without requiring a new deployment.
export const revalidate = 300;

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
    openGraph: {
      title: race.name,
      description: race.why,
      type: "website",
      url: `/races/${race.slug}`,
    },
    twitter: {
      card: "summary",
      title: race.name,
      description: race.why,
    },
  };
}

function fmtCheckedDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
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
          const racer = entry.racer ? getRacerBySlug(entry.racer) : undefined;
          const name = racer?.name ?? entry.name;
          const country = racer?.country ?? entry.country;
          if (!name) return null;
          const row = (
            <>
              {entry.place != null && (
                <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">
                  {entry.place}
                </span>
              )}
              <Avatar name={name} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium group-hover:text-brand">
                  {name}
                </span>
                {country && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {COUNTRY_FLAGS[country] ?? ""} {country}
                  </span>
                )}
              </span>
              {entry.time && (
                <span className="shrink-0 font-mono text-sm tabular-nums">
                  {entry.time}
                </span>
              )}
            </>
          );
          return (
            <li key={entry.racer ?? `${name}-${entry.place ?? "field"}`}>
              {racer ? (
                <Link
                  href={`/racers/${racer.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-border p-3 transition-all duration-300 ease-stride hover:-translate-y-0.5 hover:border-brand"
                >
                  {row}
                </Link>
              ) : (
                <div className="group flex items-center gap-3 rounded-xl border border-border p-3">
                  {row}
                </div>
              )}
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

  const now = new Date();
  const status = getRaceStatus(race, now);
  const stale = isRaceDataStale(race, now);
  const startTime = formatRaceStartTime(race);
  const url = `https://anystride.com/races/${race.slug}`;
  const statusLabel =
    status === "live"
      ? "Live"
      : status === "upcoming"
        ? "Upcoming"
        : race.coverage === "results"
          ? "Results"
          : "Finished";

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: race.name,
          description: race.why,
          sport: "Running",
          startDate: race.startsAt,
          endDate: race.endsAt,
          ...(status !== "completed"
            ? { eventStatus: "https://schema.org/EventScheduled" }
            : {}),
          eventAttendanceMode:
            "https://schema.org/OfflineEventAttendanceMode",
          location: {
            "@type": "Place",
            name: `${race.city}, ${race.country}`,
            address: {
              "@type": "PostalAddress",
              addressLocality: race.city,
              addressCountry: race.country,
            },
          },
          url,
          sameAs: race.verification.sourceUrl,
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
            status === "live"
              ? "rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-brand-foreground"
              : "rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
          }
        >
          {statusLabel}
        </span>
        {stale && (
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Needs review
          </span>
        )}
      </div>

      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        {race.name}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {formatRaceDate(race, "long")} · {race.city}, {race.country}
        {startTime ? ` · starts ${startTime}` : ""}
      </p>

      <p className="mt-6 text-lg leading-relaxed">{race.why}</p>

      {race.watchUrl && (
        <a
          href={race.watchUrl}
          data-race-slug={race.slug}
          data-link-kind="event_site"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          Official event site ↗
        </a>
      )}

      <aside className="mt-6 rounded-xl border border-border bg-muted/50 p-4 text-sm">
        <p className="font-medium">
          {stale
            ? "This listing needs another source check"
            : "Checked against an official source"}
        </p>
        <p className="mt-1 text-muted-foreground">
          Last checked{" "}
          <time dateTime={race.verification.checkedAt}>
            {fmtCheckedDate(race.verification.checkedAt)}
          </time>
          {" · "}
          <a
            href={race.verification.sourceUrl}
            data-race-slug={race.slug}
            data-link-kind="verification"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline decoration-border underline-offset-4 hover:text-brand"
          >
            {race.verification.sourceName} ↗
          </a>
        </p>
      </aside>

      {/* Field / results */}
      <div className="mt-10">
        {race.coverage === "results" ? (
          <>
            <h2 className="text-xl font-semibold tracking-tight">Selected results</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A focused selection of distance results. The official source has
              the complete programme and classifications.
            </p>
            {(race.men?.length || race.women?.length) && (
              <div className="mt-4 grid gap-8 sm:grid-cols-2">
                {race.men && race.men.length > 0 && (
                  <FieldList entries={race.men} title="Men" />
                )}
                {race.women && race.women.length > 0 && (
                  <FieldList entries={race.women} title="Women" />
                )}
              </div>
            )}
            {race.resultsUrl && (
              <a
                href={race.resultsUrl}
                data-race-slug={race.slug}
                data-link-kind="results"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex text-sm font-semibold text-brand hover:underline"
              >
                View complete official results ↗
              </a>
            )}
          </>
        ) : race.coverage === "field" ? (
          <>
            <h2 className="text-xl font-semibold tracking-tight">
              {status === "completed"
                ? "Results not yet reviewed"
                : stale
                  ? "Previously confirmed athletes"
                  : "Featured confirmed athletes"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {status === "completed"
                ? "This event has finished, but Anystride has not reviewed and published its results yet. The athletes below are from the pre-race field."
                : `This is a selected field, not a complete entry list.${
                    stale
                      ? " Check the official source for withdrawals and late changes."
                      : " Entries can still change before race day."
                  }`}
            </p>
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
            <h2 className="text-xl font-semibold tracking-tight">
              {status === "completed"
                ? "Results not yet reviewed"
                : "Field not yet verified"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {status === "completed"
                ? "This event has finished, but Anystride has not reviewed and published its results yet."
                : "Anystride has not verified an elite field for this event. We do not fill gaps with speculative entrants."}{" "}
              Use the official source above for the latest information.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
