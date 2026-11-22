import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { RacerCard } from "@/components/RacerCard";
import { RACERS_AS_OF, type Racer } from "@/data/racers";
import { getAllRacers } from "@/lib/races";

const TITLE = "Pro runners: PBs, events and race results";
const DESCRIPTION = `Anystride lists the pro runners it tracks, with personal bests, events and the races they ran. Each name links to that runner's page. Data as of ${RACERS_AS_OF}.`;
const PAGE_URL = "https://anystride.com/racers";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/racers" },
};

/** Primary event is the first event stored on the racer. */
const PRIMARY_GROUPS: { id: string; title: string; events: string[] }[] = [
  { id: "marathon", title: "Marathon", events: ["Marathon"] },
  { id: "half-marathon", title: "Half marathon", events: ["Half Marathon"] },
  { id: "10000m-5000m", title: "10,000m and 5000m", events: ["10,000m", "5000m"] },
  { id: "1500m-mile", title: "1500m and mile", events: ["1500m", "Mile"] },
];

const TRAIN_LINKS = [
  { href: "/training-plans/marathon", label: "Marathon training plans" },
  { href: "/training-plans/half-marathon", label: "Half marathon training plans" },
  { href: "/training-plans/10k", label: "10K training plans" },
  { href: "/training-plans/5k", label: "5K training plans" },
  { href: "/#plan-finder", label: "Plan finder" },
] as const;

function byName(a: Racer, b: Racer): number {
  return a.name.localeCompare(b.name);
}

function groupsFor(racers: Racer[]): { id: string; title: string; racers: Racer[] }[] {
  const buckets = new Map<string, Racer[]>(PRIMARY_GROUPS.map((group) => [group.id, []]));
  const other: Racer[] = [];

  for (const racer of racers) {
    const primary = racer.events[0];
    const match = PRIMARY_GROUPS.find((group) => group.events.some((event) => event === primary));
    const bucket = match ? buckets.get(match.id) : undefined;
    if (bucket) bucket.push(racer);
    else other.push(racer);
  }

  const groups = PRIMARY_GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    racers: (buckets.get(group.id) ?? []).sort(byName),
  })).filter((group) => group.racers.length > 0);

  if (other.length > 0) {
    groups.push({ id: "other", title: "Other", racers: other.sort(byName) });
  }
  return groups;
}

export default function RacersPage() {
  const groups = groupsFor(getAllRacers());
  const listed = groups.flatMap((group) => group.racers);

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Races",
              item: "https://anystride.com/races",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Pro runners",
              item: PAGE_URL,
            },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          numberOfItems: listed.length,
          itemListElement: listed.map((racer, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: racer.name,
            url: `${PAGE_URL}/${racer.slug}`,
          })),
        }}
      />

      <Link
        href="/races"
        className="text-sm font-medium text-muted-foreground hover:text-brand"
      >
        ← Races
      </Link>

      <h1 className="mt-4 text-hero-gradient text-3xl font-bold tracking-tight sm:text-4xl">
        Pro runners we track
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        This page lists the pro runners Anystride tracks, with personal bests, events and the races
        they ran. The dataset date is {RACERS_AS_OF}. See schedules and results on{" "}
        <Link href="/races" className="font-medium text-brand hover:underline">
          Races to watch
        </Link>
        .
      </p>

      {groups.map((group) => (
        <section key={group.id} className="mt-10" aria-labelledby={group.id}>
          <h2 id={group.id} className="text-xl font-semibold tracking-tight">
            {group.title}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {group.racers.map((racer) => (
              <RacerCard key={racer.slug} racer={racer} />
            ))}
          </div>
        </section>
      ))}

      <section className="mt-12" aria-labelledby="train-for-these-distances">
        <h2 id="train-for-these-distances" className="text-xl font-semibold tracking-tight">
          How can I train for these distances?
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Free plans cover the marathon, half marathon, 10K and 5K. Open a distance below, or start
          from the plan finder.
        </p>
        <div className="mt-3 space-y-2">
          {TRAIN_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-xl border border-border px-4 py-3 text-sm font-medium transition-all duration-300 ease-stride hover:-translate-y-0.5 hover:border-brand"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Anystride is not affiliated with these athletes.
        </p>
      </section>
    </div>
  );
}
