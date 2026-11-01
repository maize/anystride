import Link from "next/link";
import { JackAnsteyServicePreview } from "@/components/JackAnsteyServicePreview";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { publicCoachProfileMerges } from "@/lib/coach-profile-merge-store";
import { getAllCoaches, getCoachBySlugWithDiscovered } from "@/lib/coaches";
import { COACH_FOCUS_LABELS, COACH_FORMAT_LABELS } from "@/data/coaches";
import { CoachApprovalBadge } from "@/components/CoachApprovalBadge";
import { Avatar } from "@/components/Avatar";
import { JsonLd } from "@/components/JsonLd";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getAllCoaches().map((coach) => ({ slug: coach.slug }));
}

export async function generateMetadata({
  params, searchParams,
}: PageProps<"/coaching/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const query = await searchParams;
  if (slug === "jack-anstey" && query.preview === "services") return { title: "Jack Anstey — Service layout preview", description: "Example coaching service layout. Offers and prices are unconfirmed and purchases are disabled.", robots: { index: false, follow: false }, alternates: { canonical: "/coaching/jack-anstey" } };
  const coach = await getCoachBySlugWithDiscovered(slug);
  if (!coach) return { title: "Coach not found" };
  return {
    title:
      coach.location === "Global"
        ? `${coach.name} — global online running coach`
        : `${coach.name} — running coach in ${coach.location}`,
    description: coach.blurb,
    alternates: { canonical: `/coaching/${coach.slug}` },
  };
}

export default async function CoachPage({ params, searchParams }: PageProps<"/coaching/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  if (slug === "jack-anstey" && query.preview === "services") return <JackAnsteyServicePreview />;
  const coach = await getCoachBySlugWithDiscovered(slug);
  if (!coach) notFound();

  const merge = (await publicCoachProfileMerges()).find((entry) => entry.directory_slug === slug);
  if (merge?.status === "suspended") notFound();
  if (merge?.storefront_slug) redirect(`/coaching/with/${merge.storefront_slug}`);

  const url = `https://anystride.com/coaching/${coach.slug}`;
  const email = coach.link.startsWith("mailto:")
    ? coach.link.slice("mailto:".length).split("?")[0]
    : undefined;
  const displayName = coach.name.split(" —")[0];

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: coach.name,
          jobTitle: "Running coach",
          ...(email ? { email } : { url: coach.link }),
          ...(coach.location === "Global"
            ? {}
            : {
                address: {
                  "@type": "PostalAddress",
                  addressLocality: coach.location,
                },
              }),
          mainEntityOfPage: url,
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
              name: "Coaching",
              item: "https://anystride.com/coaching",
            },
            { "@type": "ListItem", position: 2, name: coach.name, item: url },
          ],
        }}
      />

      <Link
        href="/coaching"
        className="text-sm font-medium text-muted-foreground hover:text-brand"
      >
        ← All coaches
      </Link>

      {/* Header */}
      <div className="mt-4 flex items-center gap-4">
        <Avatar name={coach.name} size={72} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {coach.name}
          </h1>
          {merge?.status === "approved" && <div className="mt-2"><CoachApprovalBadge /></div>}
          <p className="mt-1 text-sm text-muted-foreground">
            {coach.location} · {COACH_FORMAT_LABELS[coach.format]}
            {coach.experience ? ` · ${coach.experience}` : ""}
          </p>
        </div>
      </div>

      {/* Focus badges */}
      <div className="mt-5 flex flex-wrap gap-2">
        {coach.focus.map((f) => (
          <span
            key={f}
            className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            {COACH_FOCUS_LABELS[f]}
          </span>
        ))}
      </div>

      {/* Bio */}
      <div className="mt-6 space-y-3 leading-relaxed">
        {coach.bio.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {/* Specialties */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Specialties
        </h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {coach.specialties.map((s) => (
            <li
              key={s}
              className="rounded-lg border border-border px-3 py-1.5 text-sm"
            >
              {s}
            </li>
          ))}
        </ul>
      </div>

      {/* Connect CTA */}
      <div className="mt-8 rounded-xl border border-border p-5">
        <a
          href={coach.link}
          data-coach-slug={coach.slug}
          target={email ? undefined : "_blank"}
          rel={email ? undefined : "nofollow noopener noreferrer"}
          className="inline-flex rounded-full bg-brand px-6 py-2.5 font-medium text-brand-foreground hover:opacity-90"
        >
          {email ? "Book via email →" : `Visit ${displayName}’s site →`}
        </a>
        <p className="mt-3 text-xs text-muted-foreground">
          {email
            ? `You’ll contact ${displayName} directly by email. `
            : "You’ll connect with the coach directly on their own site. "}
          anystride doesn&apos;t take a cut or handle payment.
        </p>
      </div>

      {/* Listing disclosure */}
      {!coach.verified && !merge && (
        <div className="mt-6 rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
          {coach.editoriallyReviewed && <>Reviewed by Anystride for directory publication, not verification of ownership or an endorsement. </>}
          This unclaimed public profile was compiled from{" "}
          <a
            href={coach.source.url}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="font-medium text-brand hover:underline"
          >
            {coach.source.name}
          </a>
          . It has not yet been claimed or verified by the coach.{" "}
          <Link
            href={`/coaching/apply?claim=${encodeURIComponent(coach.slug)}`}
            className="font-medium text-brand hover:underline"
          >
            Is this you? Claim or update this profile →
          </Link>
        </div>
      )}
    </div>
  );
}
