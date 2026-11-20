import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllRacers,
  getRacerBySlug,
  ageFromBorn,
  racesForRacer,
} from "@/lib/races";
import {
  COACH_DIRECTORY_HREF,
  PLAN_FINDER_HREF,
  bornHeaderSuffix,
  bornQuickFact,
  racerSearchMetadata,
  trainAffiliationNote,
  trainGroupsForEvents,
} from "@/lib/racer-page";
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
  // Root layout template is "%s · anystride", so the title stays the page text only.
  const meta = racerSearchMetadata(racer);
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/racers/${racer.slug}` },
  };
}

export default async function RacerPage({ params }: PageProps<"/racers/[slug]">) {
  const { slug } = await params;
  const racer = getRacerBySlug(slug);
  if (!racer) notFound();

  const age = ageFromBorn(racer.born);
  const born = bornQuickFact(racer.born, age);
  const races = racesForRacer(racer.slug);
  const trainGroups = trainGroupsForEvents(racer.events);
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
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Races to watch",
              item: "https://anystride.com/races",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: racer.name,
              item: url,
            },
          ],
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
            {bornHeaderSuffix(racer.born, age)}
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
        {born && (
          <div>
            <dt className="text-muted-foreground">{born.label}</dt>
            <dd className="mt-0.5 font-semibold">{born.value}</dd>
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
                className="block rounded-xl border border-border p-4 text-sm transition-all duration-300 ease-stride hover:-translate-y-0.5 hover:border-brand"
              >
                <span className="font-medium">{race.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10" aria-labelledby="train-for-distance">
        <h2
          id="train-for-distance"
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {trainGroups.length === 1
            ? `Train for the ${trainGroups[0].heading}`
            : trainGroups.length === 0
              ? "Train for your own race"
              : "Train for these distances"}
        </h2>
        {trainGroups.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Training for your own race? Use the plan finder to match a free plan to your goal.
          </p>
        )}
        {trainGroups.length > 0 && (
          <div className="mt-3 space-y-6">
            {trainGroups.map((group) => (
              <div key={group.id}>
                {trainGroups.length > 1 && (
                  <h3 className="text-sm font-semibold">Train for the {group.heading}</h3>
                )}
                <p
                  className={
                    trainGroups.length > 1
                      ? "mt-1 text-sm text-muted-foreground"
                      : "text-sm text-muted-foreground"
                  }
                >
                  {group.body}
                </p>
                <div className="mt-3 space-y-2">
                  {group.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block rounded-xl border border-border px-4 py-3 text-sm font-medium transition-all duration-300 ease-stride hover:-translate-y-0.5 hover:border-brand"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 space-y-2">
          <Link
            href={PLAN_FINDER_HREF}
            className="block rounded-xl border border-border px-4 py-3 text-sm font-medium transition-all duration-300 ease-stride hover:-translate-y-0.5 hover:border-brand"
          >
            Plan finder
          </Link>
          <Link
            href={COACH_DIRECTORY_HREF}
            className="block rounded-xl border border-border px-4 py-3 text-sm font-medium transition-all duration-300 ease-stride hover:-translate-y-0.5 hover:border-brand"
          >
            Find a running coach
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{trainAffiliationNote(racer.name)}</p>
      </section>

      <p className="mt-10 text-xs text-muted-foreground">
        Stats as of {RACERS_AS_OF} · updated weekly. anystride is a fan resource,
        not affiliated with the athlete.
      </p>
    </div>
  );
}
