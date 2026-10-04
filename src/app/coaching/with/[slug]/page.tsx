import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { publicStorefront } from "@/lib/storefront-store";
import { CoachStorefront } from "@/components/CoachStorefront";
import { JsonLd } from "@/components/JsonLd";

export const dynamic = "force-dynamic";
const readStorefront = cache(publicStorefront);
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const storefront = await readStorefront(slug);
  if (!storefront) return { title: "Coach not found", robots: { index: false } };
  const { profile } = storefront;
  return { title: `${profile.name} — Coaching & services`, description: profile.headline, alternates: { canonical: `/coaching/with/${profile.slug}` }, openGraph: { title: `${profile.name} · Coaching on Anystride`, description: profile.headline, url: `/coaching/with/${profile.slug}` } };
}
export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const storefront = await readStorefront(slug);
  if (!storefront) notFound();
  return <><JsonLd data={{ "@context": "https://schema.org", "@type": "Person", name: storefront.profile.name, description: storefront.profile.headline, url: `https://anystride.com/coaching/with/${slug}`, jobTitle: "Running coach" }} /><CoachStorefront storefront={storefront} /></>;
}
