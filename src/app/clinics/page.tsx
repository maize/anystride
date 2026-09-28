import Link from "next/link";
import type { Metadata } from "next";
import { EnquiryForm } from "@/components/EnquiryForm";
import { PilotQuestions } from "@/components/PilotQuestions";

const description = "Help shape Anystride’s athlete clinic pilot. Register interest in learning from runners or offer to host. No dates, hosts or prices are confirmed.";
export const metadata: Metadata = {
  title: "Athlete clinics — pilot",
  description,
  alternates: { canonical: "/clinics" },
  openGraph: { title: "Athlete clinics | Anystride", description, url: "/clinics" },
};

const questions = [
  { question: "Can I book a clinic now?", answer: "Not yet. We are collecting interest before arranging a first session. This form does not reserve a place, and a session is not guaranteed." },
  { question: "Who will host?", answer: "No athletes have been confirmed. We want to work directly with athletes on topics they can teach from experience. Athletes can use the same form to propose hosting." },
  { question: "What would a session cost?", answer: "Pricing is not set. A future offer would state the host, format, duration, price and cancellation terms before you decide whether to book. Registering interest is free." },
  { question: "Would I need to travel?", answer: "The first format we want to test is a live online conversation with time for questions. Nothing is scheduled yet. You can share your time zone in the optional message." },
  { question: "What happens to my details?", answer: "Your request goes to Anystride for review. We may email you about this clinic pilot. We will ask before sharing your details with an athlete or other participants. This does not subscribe you to a newsletter." },
  { question: "Will the training plans stay free?", answer: "Yes. The proposed paid element is the athlete’s time and teaching. Existing plans, progress tracking, print and calendar exports stay free. A group clinic is not individual coaching or medical advice." },
] as const;

export default function ClinicsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <Link href="/coaching" className="text-sm text-muted-foreground hover:text-brand">← Coaching</Link>
      <p className="mt-8 text-sm font-medium text-brand">Athlete clinics · Exploring a first session</p>
      <h1 className="mt-3 text-hero-gradient text-3xl font-bold tracking-tight text-balance sm:text-4xl">Learn from the athletes you follow.</h1>
      <p className="mt-4 text-lg text-muted-foreground text-pretty">Hear how runners prepare, train and make decisions on race day. We are exploring small online sessions where you can ask an athlete your own questions.</p>
      <a href="#clinic-interest" className="mt-6 inline-block rounded-full bg-brand px-3 py-2 text-base font-semibold text-brand-foreground transition-colors duration-300 ease-stride hover:bg-brand/90 active:translate-y-px">Register clinic interest</a>
      <p className="mt-3 text-sm text-muted-foreground">Free to enquire. No confirmed hosts, dates or prices. No payment or booking.</p>

      <section className="mt-12" aria-labelledby="clinic-topics">
        <h2 id="clinic-topics" className="text-xl font-semibold">What would you like to learn?</h2>
        <p className="mt-3 text-muted-foreground">These are possible topics, not scheduled events. Your interest will help us choose where to start.</p>
        <ul className="mt-6 space-y-4 text-sm">
          <li><span className="font-semibold">Preparing for race day.</span> Learn how an athlete approaches pacing, nerves and decisions when a race does not go to plan.</li>
          <li><span className="font-semibold">Building a training routine.</span> Hear how athletes organise their week and work around everyday commitments.</li>
          <li><span className="font-semibold">Strength for runners.</span> Ask how strength work fits alongside running, with a suitably qualified host.</li>
        </ul>
      </section>

      <section className="mt-12 rounded-xl border border-border bg-muted p-6" aria-labelledby="clinic-process">
        <h2 id="clinic-process" className="text-xl font-semibold">Help shape the first clinic</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-6 text-sm">
          <li>Tell us whether you want to attend or host, and choose a topic.</li>
          <li>We review interest and look for a suitable athlete and format.</li>
          <li>If a session takes shape, we can email you the details. You decide whether to book.</li>
        </ol>
        <p className="mt-4 text-sm text-muted-foreground">For athletes, the aim is paid teaching alongside free editorial exposure. Any fee or revenue share would be agreed before a session is offered. Hosting does not buy editorial coverage.</p>
      </section>

      <PilotQuestions questions={questions} />
      <section id="clinic-interest" className="mt-12 scroll-mt-8" aria-labelledby="clinic-interest-heading">
        <h2 id="clinic-interest-heading" className="text-xl font-semibold">Register clinic interest</h2>
        <p className="mb-6 mt-3 text-sm text-muted-foreground">Choose a topic and leave an email for a conversation about the pilot. Please do not include injury or medical information.</p>
        <EnquiryForm kind="partnership" pilot="clinics" />
      </section>
    </div>
  );
}
