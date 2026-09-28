import Link from "next/link";
import type { Metadata } from "next";
import { EnquiryForm } from "@/components/EnquiryForm";

export const metadata: Metadata = {
  title: "Ask about finding a running coach",
  description: "Tell Anystride your running goal and preferred coaching format. Register interest in our small, manual coach-matching pilot.",
  alternates: { canonical: "/coaching/match" },
};

export default function CoachMatchPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <Link href="/coaching" className="text-sm text-muted-foreground hover:text-brand">← Browse the coach directory</Link>
      <h1 className="text-hero-gradient mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Not sure which coach to choose?</h1>
      <p className="mt-4 text-lg text-muted-foreground">Tell us what you are looking for. We are testing a small, manually reviewed coach-matching service.</p>
      <div className="my-8 space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>The request is free. Coaching, if you choose it, is arranged and paid for directly with the coach. There is no guaranteed match or response time during this pilot.</p>
        <p>Your request goes to Anystride—not to every coach in the directory. We will ask before making an introduction. Please do not send medical history or injury details.</p>
      </div>
      <EnquiryForm kind="coach_match" />
    </div>
  );
}
