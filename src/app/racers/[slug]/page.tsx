import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllRacers,
  getRacerBySlug,
  ageFromBorn,
  racesForRacer,
} from "@/lib/races";
import { COUNTRY_FLAGS, RACERS_AS_OF } from "@/data/racers";
import { Avatar } from "@/components/Avatar";
import { JsonLd } from "@/components/JsonLd";

export function generateStaticParams() {
  return getAllRacers().map((racer) => ({ slug: racer.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/racers/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const racer = getRacerBySlug(slug);
  if (!racer) return { title: "Racer not found" };
  const pr = racer.prs[0];
  return {
    title: `${racer.name} — ${racer.country} runner`,
    description: `${racer.name} (${racer.country})${pr ? `, ${pr.event} PB ${pr.time}` : ""}. Stats, personal bests, honors, and the races they run.`,
    alternates: { canonical: `/racers/${racer.slug}` },
  };
}

export default async function RacerPage({ params }: PageProps<"/racers/[slug]">) {
  const { slug } = await params;
  const racer = getRacerBySlug(slug);
  if (!racer) notFound();

  const age = ageFromBorn(racer.born);
  const races = racesForRacer(racer.slug);
  const url = `https://anystride.com/racers/${racer.slug}`;

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: racer.name,
          nationality: racer.country,
          ...(racer.born ? { birthDate: racer.born } : {}),
          ...(racer.hometown ? { homeLocation: racer.hometown } : {}),
          jobTitle: "Professional runner",
          url,
        }}
      />

      <Link
        href="/races"
        className="text-sm font-medium text-muted-foreground hover:text-brand"
      >
        ← Races to watch
      </Link>

      {/* Header */}
      <div className="mt-4 flex items-center gap-4">
        <Avatar name={racer.name} size={72} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {racer.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {COUNTRY_FLAGS[racer.country] ?? ""} {racer.country}
            {racer.hometown ? ` · ${racer.hometown}` : ""}
            {age != null ? ` · ${age}` : ""}
          </p>
        </div>
      </div>

      {/* Quick facts */}
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-border p-5 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Country</dt>
          <dd className="mt-0.5 font-semibold">
            {COUNTRY_FLAGS[racer.country] ?? ""} {racer.country}
          </dd>
        </div>
        {age != null && (
          <div>
            <dt className="text-muted-foreground">Age</dt>
            <dd className="mt-0.5 font-semibold">{age}</dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground">Events</dt>
          <dd className="mt-0.5 font-semibold">{racer.events.join(", ")}</dd>
        </div>
      </dl>

      {/* Personal bests */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Personal bests
        </h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <tbody>
              {racer.prs.map((pr) => (
                <tr key={pr.event} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">{pr.event}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                    {pr.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Honors */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Career highlights
        </h2>
        <ul className="mt-3 space-y-2">
          {racer.honors.map((h) => (
            <li key={h} className="flex gap-2 text-sm">
              <span className="text-brand">🏅</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Races */}
      {races.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            On anystride
          </h2>
          <div className="mt-3 space-y-2">
            {races.map((race) => (
              <Link
                key={race.slug}
                href={`/races/${race.slug}`}
                className="block rounded-xl border border-border p-4 text-sm transition hover:border-brand"
              >
                <span className="font-medium">{race.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mt-10 text-xs text-muted-foreground">
        Stats as of {RACERS_AS_OF} · updated weekly. anystride is a fan resource,
        not affiliated with the athlete.
      </p>
    </div>
  );
}
