import Link from "next/link";
import type { Metadata } from "next";
import { EnquiryForm } from "@/components/EnquiryForm";

export const metadata: Metadata = {
  title: "Partner with Anystride",
  description: "Discuss coaching enquiries, race promotion or editorial sponsorship with Anystride. Free training plans remain free.",
  alternates: { canonical: "/partners" },
};

export default function PartnersPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-hero-gradient text-3xl font-bold tracking-tight sm:text-4xl">Help runners find their next step.</h1>
      <p className="mt-4 text-lg text-muted-foreground">We are exploring partnerships with running coaches, race organisers and brands. Start a conversation about a small pilot—not an off-the-shelf advertising package.</p>
      <div className="my-8 divide-y divide-border border-y border-border">
        <section className="py-6">
          <h2 className="text-xl font-semibold">For coaches</h2>
          <p className="mt-2 text-muted-foreground">Discuss a pilot for relevant coaching enquiries. Availability, fit and a runner’s permission come before an introduction. Fees would be agreed before any paid pilot.</p>
          <Link href="/coaching/apply" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">Just want a free directory listing? Apply here →</Link>
        </section>
        <section className="py-6">
          <h2 className="text-xl font-semibold">For race organisers</h2>
          <p className="mt-2 text-muted-foreground">Explore a clearly labelled promotion for an upcoming event. We would agree the audience, placement, dates and reporting before you pay. No registration numbers or reach are guaranteed.</p>
          <Link href="/partners/race-hubs" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">Help entrants prepare with a race hub →</Link>
        </section>
        <section className="py-6">
          <h2 className="text-xl font-semibold">For athletes</h2>
          <p className="mt-2 text-muted-foreground">Help shape a small online clinic around what you know best. We want to create paid teaching opportunities without charging athletes for editorial exposure.</p>
          <Link href="/clinics" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">Explore the athlete clinic pilot →</Link>
        </section>
        <section className="py-6">
          <h2 className="text-xl font-semibold">For running brands</h2>
          <p className="mt-2 text-muted-foreground">Discuss support for an original athlete interview or race briefing. Sponsorship would be disclosed and would not buy a favourable review or control our editorial selections.</p>
        </section>
      </div>
      <p className="mb-8 text-sm text-muted-foreground">Core training plans stay free. Payment does not buy a verified-coach badge. No paid placements are being sold through this form. <Link href="/editorial" className="underline underline-offset-4">Our editorial standards</Link>.</p>
      <h2 className="mb-4 text-xl font-semibold">Tell us what you have in mind</h2>
      <EnquiryForm kind="partnership" />
    </div>
  );
}
