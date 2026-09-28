import Link from "next/link";
import type { Metadata } from "next";
import { EnquiryForm } from "@/components/EnquiryForm";
import { PilotQuestions } from "@/components/PilotQuestions";

const description = "Explore an Anystride race preparation hub for your event: free training resources and organiser-approved race information in one place. Enquire about a manual pilot.";
export const metadata: Metadata = {
  title: "Race preparation hubs for organisers",
  description,
  alternates: { canonical: "/partners/race-hubs" },
  openGraph: { title: "Race preparation hubs | Anystride", description, url: "/partners/race-hubs" },
};

const questions = [
  { question: "What would the first pilot include?", answer: "A proposed starting scope is one branded page on Anystride for one event, links to relevant free plans and guides, and race information approved by your team. The exact scope would be agreed before work begins." },
  { question: "Is this a registration platform?", answer: "No. Registration and payments would stay with your existing provider. The hub would help entrants prepare, not replace your event operations or promise new registrations." },
  { question: "Who pays, and how much?", answer: "The organiser would pay for the agreed setup and maintenance work. Runners would access the hub and existing training resources free. Pricing is not published yet; an enquiry is not an order." },
  { question: "What would you need from us?", answer: "An event contact, your official event URL, date and distance, approved race information and permission to use your branding. We would agree who approves updates and when support ends." },
  { question: "Are emails, custom domains or dashboards included?", answer: "Not in this initial proposal. We would start with a manually maintained page on Anystride. Automated reminders, participant imports, custom domains and organiser dashboards would need separate scoping." },
  { question: "Would buying a hub affect editorial coverage?", answer: "No. A commissioned hub would be labelled as an organiser partnership. It would not buy a race ranking, athlete endorsement or favourable editorial coverage. Existing free plans remain free." },
] as const;

export default function RaceHubsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <Link href="/partners" className="text-sm text-muted-foreground hover:text-brand">← Partnerships</Link>
      <p className="mt-8 text-sm font-medium text-brand">For race organisers · Pilot enquiries</p>
      <h1 className="mt-3 text-hero-gradient text-3xl font-bold tracking-tight text-balance sm:text-4xl">Help your runners arrive prepared.</h1>
      <p className="mt-4 text-lg text-muted-foreground text-pretty">Give entrants one place to find a training plan, prepare for the distance and check your race information. We are exploring a small, manually maintained race hub pilot.</p>
      <a href="#race-hub-enquiry" className="mt-6 inline-block rounded-full bg-brand px-3 py-2 text-base font-semibold text-brand-foreground transition-colors duration-300 ease-stride hover:bg-brand/90 active:translate-y-px">Discuss a race hub</a>
      <p className="mt-3 text-sm text-muted-foreground">No commitment or payment. Scope, timing and price agreed separately.</p>

      <section className="mt-12" aria-labelledby="hub-contents">
        <h2 id="hub-contents" className="text-xl font-semibold">One page for the weeks before your race</h2>
        <p className="mt-3 text-muted-foreground">The proposed hub brings three things together. These are existing resources and a service outline, not a live partner event.</p>
        <div className="mt-6 space-y-4 rounded-xl border border-border bg-muted p-6">
          <section>
            <h3 className="font-semibold">A plan for the distance</h3>
            <p className="mt-2 text-sm text-muted-foreground">Links to suitable free plans, with their original attribution and tools intact.</p>
            <Link href="/plans" className="mt-2 inline-block text-sm text-brand hover:underline">Browse the existing plans →</Link>
          </section>
          <section>
            <h3 className="font-semibold">Preparation in plain language</h3>
            <p className="mt-2 text-sm text-muted-foreground">Selected guides to help runners make sense of training and race preparation.</p>
            <Link href="/guides" className="mt-2 inline-block text-sm text-brand hover:underline">Read the existing guides →</Link>
          </section>
          <section>
            <h3 className="font-semibold">Information from your team</h3>
            <p className="mt-2 text-sm text-muted-foreground">Your approved date, course notes, event FAQs and official registration link, with a visible review date.</p>
          </section>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="hub-process">
        <h2 id="hub-process" className="text-xl font-semibold">Start with one event</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-6 text-sm">
          <li>Tell us about your race and the questions entrants ask most.</li>
          <li>Agree the page content, approval process, maintenance period and fee.</li>
          <li>Review the page before publication, then share its link with your entrants.</li>
        </ol>
        <p className="mt-4 text-sm text-muted-foreground">You would pay for setup and maintenance, not for access to somebody else’s training plan. We do not guarantee traffic or registrations.</p>
      </section>

      <PilotQuestions questions={questions} />
      <section id="race-hub-enquiry" className="mt-12 scroll-mt-8" aria-labelledby="race-hub-enquiry-heading">
        <h2 id="race-hub-enquiry-heading" className="text-xl font-semibold">Discuss a race hub</h2>
        <p className="mb-6 mt-3 text-sm text-muted-foreground">Start with your event and what you would like to improve. Please do not upload or paste participant lists.</p>
        <EnquiryForm kind="partnership" pilot="race_hub" />
      </section>
    </div>
  );
}
