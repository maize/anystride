import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  availableCities,
  filterCoaches,
  getCityBySlug,
} from "@/lib/coaches";
import { citySlug } from "@/lib/slug";
import { CoachCard } from "@/components/CoachCard";
import { JsonLd } from "@/components/JsonLd";

export function generateStaticParams() {
  return availableCities().map((city) => ({ city: citySlug(city) }));
}

export async function generateMetadata({
  params,
}: PageProps<"/running-coaches/[city]">): Promise<Metadata> {
  const { city: slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) return { title: "Coaches not found" };
  const where = city === "Online" ? "online" : `in ${city}`;
  return {
    title: `Running coaches ${where}`,
    description: `Find running coaches ${where} — browse profiles by focus and format, then connect with the coach directly. Free, community-built directory.`,
    alternates: { canonical: `/running-coaches/${slug}` },
  };
}

export default async function CityCoachesPage({
  params,
}: PageProps<"/running-coaches/[city]">) {
  const { city: slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) notFound();

  const coaches = filterCoaches({ city });
  const isOnline = city === "Online";
  const where = isOnline ? "online" : `in ${city}`;
  const url = `https://anystride.com/running-coaches/${slug}`;

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Running coaches ${where}`,
          url,
          about: coaches.map((c) => ({
            "@type": "Person",
            name: c.name,
            jobTitle: "Running coach",
            url: c.link,
          })),
        }}
      />

      <Link
        href="/coaching"
        className="text-sm font-medium text-muted-foreground hover:text-brand"
      >
        ← All coaches
      </Link>

      <h1 className="text-hero-gradient mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
        Running coaches {where}
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        {isOnline
          ? "Online running coaches who work with runners anywhere — from your first 5K to a marathon PR. Browse profiles and connect directly."
          : `Looking for a running coach ${where}? Browse coaches below by focus and format, then connect with them directly. Each profile links to the coach's own site.`}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {coaches.map((coach) => (
          <CoachCard key={coach.slug} coach={coach} />
        ))}
      </div>

      {/* Cross-links to other cities */}
      <div className="mt-12 border-t border-border pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Coaches in other cities
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {availableCities()
            .filter((c) => c !== city)
            .map((c) => (
              <Link
                key={c}
                href={`/running-coaches/${citySlug(c)}`}
                className="rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:border-brand hover:text-brand"
              >
                {c}
              </Link>
            ))}
        </div>
      </div>

      {/* Coach CTA */}
      <section className="mt-10 flex flex-col gap-3 rounded-2xl bg-muted p-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Coaching {where}?
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            List your coaching on anystride and reach runners searching for a coach
            {isOnline ? " online" : ` ${where}`}.
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
