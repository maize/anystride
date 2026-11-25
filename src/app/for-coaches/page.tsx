/* eslint-disable @next/next/no-html-link-for-pages -- Account entry uses full document navigation to keep public analytics out of private account pages. */
import { CoachingWorkspacePreview } from "@/components/CoachingWorkspacePreview";
import { JsonLd } from "@/components/JsonLd";
import type { Metadata } from "next";
import Link from "next/link";
import { coachingCompetitors } from "@/lib/coaching-comparisons";
import { storefrontFeeDescription, workspacePricingDescription } from "@/lib/public-product";
import { Reveal } from "@/components/Reveal";

const title = "Running Coach Software for Independent Coaches | Anystride";
const description = "Invite athletes, build 1 to 24 week plans, assign workouts and sell coaching. No Garmin or COROS sync or watch delivery. Free account, approval required, 10% commission including payment processing.";
export const metadata: Metadata = {
  title: { absolute: title }, description,
  alternates: { canonical: "/for-coaches" },
  openGraph: { title, description, url: "/for-coaches", type: "website" },
};
const action = "inline-flex items-center justify-center rounded-full bg-brand px-6 py-4 text-base font-semibold text-brand-foreground transition-opacity duration-300 ease-stride hover:opacity-90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand";

type Part = string | { href: string; label: string };

function plain(parts: Part[]): string {
  return parts.map((part) => (typeof part === "string" ? part : part.label)).join("");
}

function Answer({ parts }: { parts: Part[] }) {
  return parts.map((part, index) =>
    typeof part === "string" ? (
      <span key={index}>{part}</span>
    ) : (
      <Link key={index} href={part.href} className="font-medium text-brand underline underline-offset-2">
        {part.label}
      </Link>
    ),
  );
}

const faqs: { question: string; answer: Part[] }[] = [
  {
    question: "What does Anystride’s running coach software include?",
    answer: ["After coach approval, invite athletes by email and share the invitation link. Athletes accept before you can access their training calendars. Athletes can revoke access from their account. Build plans from 1 to 24 weeks, assign workouts and review recorded results. Coach view contains your athletes, plans, profile, services and sales. Switch to runner view for your own calendar, coaches and purchases. After approval, set up your storefront and services. Services need review, and Stripe payouts must be set up before selling. Direct Garmin and COROS syncing and sending workouts to watches are not available."],
  },
  {
    question: "Does Anystride sync with Garmin or COROS?",
    answer: ["Direct Garmin and COROS syncing and sending workouts to watches are not available. Strava syncing is a limited beta with capacity for ten connected athletes across Anystride. Athletes control sharing separately for each coach; Only You activities are not shared with coaches. Manual workout recording and Strava CSV import are also available."],
  },
  {
    question: "How much does Anystride cost for coaches?",
    answer: [
      `Creating an account is free. ${workspacePricingDescription} ${storefrontFeeDescription} `,
      { href: "/pricing", label: "Read the pricing details" },
      ".",
    ],
  },
  {
    question: "How do runners find my coaching?",
    answer: [
      "Anystride reviews coach applications before approved profiles appear in the ",
      { href: "/coaches", label: "running coach directory" },
      ". Services also require approval. There is no guaranteed approval time. Once your storefront is published, you can share its public link from your website, social profile or running community. A listing or storefront does not guarantee visits, enquiries or sales.",
    ],
  },
  {
    question: "How does Anystride compare with Final Surge or V.O2?",
    answer: [
      `${coachingCompetitors["final-surge"].strength} ${coachingCompetitors["vdot-coach"].strength} ${coachingCompetitors["final-surge"].consideration} No direct Garmin/COROS sync or watch workout delivery. Compare `,
      { href: "/alternatives/final-surge", label: "Final Surge and Anystride" },
      ", ",
      { href: "/alternatives/vdot-coach", label: "V.O2 and Anystride" },
      ", or the ",
      { href: "/alternatives", label: "comparison of all three" },
      ".",
    ],
  },
];

export default function ForCoachesPage() {
  return <div className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
    <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: plain(faq.answer) } })) }} />
    <section aria-labelledby="coach-page-title" className="grid items-center gap-12 lg:grid-cols-2">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-text">Your coaching. One place to start.</p>
        <h1 id="coach-page-title" className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Running coach software for independent coaches</h1>
        <p className="mt-6 max-w-xl text-lg text-pretty text-muted-foreground">Anystride’s running coach software lets approved coaches invite athletes, build 1 to 24 week plans, assign workouts and review results. You can sell coaching services through a storefront. Anystride takes a commission, and coach approval is required. Apply for review, then manage training and prepare a public profile for your coaching services.</p>
        <a href="/coaching/apply" className={`${action} mt-8`}>Start my coach application <span aria-hidden="true" className="ml-2">→</span></a>
        <p className="mt-4"><Link href="/#account-preview" className="action-link">Preview the runner & coach workspace →</Link></p>
        <p className="mt-4 max-w-md text-sm text-muted-foreground">Free to create an account. Coach and service approval required. A commission applies to storefront sales.</p>
        <a href="/account/coach" className="mt-6 inline-block text-sm font-semibold underline underline-offset-4 hover:text-brand-text focus-visible:outline-2 focus-visible:outline-brand">Already a coach? Sign in</a>
      </div>
      <figure className="rounded-2xl border border-border bg-muted p-6 sm:p-8">
        <figcaption className="flex items-center justify-between gap-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><span>A storefront, explained</span><span>Illustration</span></figcaption>
        <div className="mt-8 flex items-center gap-4"><span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-2xl font-semibold text-brand-foreground">↗</span><p className="text-2xl font-semibold tracking-tight">Your name.<br />Your approach.</p></div>
        <p className="mt-6 text-sm text-muted-foreground">Tell runners who you coach, how you work and what support they can expect.</p>
        <div className="mt-8 rounded-xl border border-border bg-background p-6"><p className="text-xs font-semibold uppercase tracking-wide text-brand-text">Your coaching offer</p><p className="mt-4 text-xl font-semibold">Make the support specific.</p><ul className="mt-4 space-y-3 text-sm text-muted-foreground"><li>What the service includes</li><li>How and when you deliver it</li><li>Your price and next steps</li></ul></div>
        <p className="mt-6 text-xs text-muted-foreground">Example layout only. This is not a real coach, service or testimonial.</p>
      </figure>
    </section>

    <section aria-labelledby="training-tools" className="mt-16 max-w-3xl">
      <h2 id="training-tools" className="text-3xl font-semibold tracking-tight">How do I manage athletes and their training?</h2>
      <p className="mt-6 text-muted-foreground">After coach approval, invite athletes by email and share the invitation link. Athletes accept before you can access their training calendars. Build plans from 1 to 24 weeks, assign workouts and review recorded results. Athletes can revoke access from their account.</p>
      <h3 className="mt-8 text-xl font-semibold">One account, separate views</h3>
      <p className="mt-4 text-muted-foreground">Coach view contains your athletes, plans, profile, services and sales. Switch to runner view for your own calendar, coaches and purchases. Your choice is remembered, so you do not need separate accounts.</p>
      <h3 className="mt-8 text-xl font-semibold">Strava and watch integrations</h3>
      <p className="mt-4 text-muted-foreground">Strava syncing is a limited beta with capacity for ten connected athletes across Anystride. Athletes control sharing separately for each coach; Only You activities are not shared with coaches. Manual workout recording and Strava CSV import are also available. Direct Garmin and COROS syncing and sending workouts to watches are not available.</p>
      <p className="mt-6 text-muted-foreground">{workspacePricingDescription} <Link href="/pricing" className="underline underline-offset-4">Read the pricing details</Link>.</p>
    </section>

    <CoachingWorkspacePreview initialView="coach" />
    <section className="my-10 border-y border-border py-8" aria-labelledby="first-week-heading"><h2 id="first-week-heading" className="text-2xl font-semibold">Your first coaching week</h2><ol className="mt-5 grid gap-6 sm:grid-cols-3"><li><strong>1. Apply for review</strong><p className="mt-2 text-sm text-muted-foreground">Introduce your experience and approach. Athlete tools open after approval.</p></li><li><strong>2. Invite one athlete</strong><p className="mt-2 text-sm text-muted-foreground">Send your invitation message and wait for their consent to share a calendar.</p></li><li><strong>3. Assign and review training</strong><p className="mt-2 text-sm text-muted-foreground">Schedule a week, then review the results your athlete records.</p></li></ol><div className="mt-5 flex flex-wrap gap-6"><Link href="/for-coaches/switching" className="action-link">Follow the switching checklist →</Link><Link href="/alternatives" className="action-link">Anystride vs Final Surge vs V.O2 →</Link></div></section>

    <section aria-labelledby="coach-benefits" className="mt-16">
      <h2 id="coach-benefits" className="text-3xl font-semibold tracking-tight">What do runners see on the storefront?</h2>
      <div className="mt-8 grid gap-8 sm:grid-cols-3">{[
        ["01", "Put your approach first", "Describe your experience and the runners you work with. Help people judge whether your coaching fits their goals."],
        ["02", "Explain the support", "Give each service its own description, inclusions and price. Set expectations before a runner decides to buy."],
        ["03", "Share one destination", "Publish your storefront when it is ready, then use its link wherever runners discover your work."],
      ].map(([number, heading, body]) => <article key={number}><p className="text-sm font-semibold text-brand-text">{number}</p><h3 className="mt-4 text-xl font-semibold">{heading}</h3><p className="mt-4 text-pretty text-muted-foreground">{body}</p></article>)}</div>
    </section>

    <Reveal className="my-16 rounded-2xl bg-foreground p-8 text-background sm:p-12"><p className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Athletes accept before you see their calendar.<br /><span className="opacity-70">A published storefront is the link you share.</span></p></Reveal>

    <section aria-labelledby="coach-steps" className="grid gap-8 lg:grid-cols-2">
      <div><p className="text-sm font-semibold text-brand-text">From application to storefront</p><h2 id="coach-steps" className="mt-4 text-3xl font-semibold tracking-tight">What happens after I apply?</h2><p className="mt-6 text-muted-foreground">An account is the start of an application. It is not automatic approval or a promise of customers.</p></div>
      <ol className="space-y-8">{[
        ["Request your account link", "Enter your email at coach sign up. Use the emailed link to access your account."],
        ["Introduce your coaching", "Complete your name, coaching approach, experience and qualifications for review."],
        ["Prepare your services", "After approval, set up your storefront and services. Services need review, and Stripe payouts must be set up before selling."],
      ].map(([heading,body], i) => <li key={heading} className="flex gap-4"><span aria-hidden="true" className="text-lg font-semibold text-brand-text">0{i+1}</span><div><h3 className="text-xl font-semibold">{heading}</h3><p className="mt-2 text-muted-foreground">{body}</p></div></li>)}</ol>
    </section>

    <section aria-labelledby="coach-cost" className="mt-16 rounded-2xl border border-border p-8 sm:p-12"><div className="grid gap-8 sm:grid-cols-2"><div><h2 id="coach-cost" className="text-3xl font-semibold tracking-tight">What does an account cost?</h2><p className="mt-6 text-muted-foreground">Free to create an account. Anystride takes a commission when you make a storefront sale. {workspacePricingDescription}</p></div><div><p className="text-6xl font-semibold tracking-tight">Free</p><p className="mt-4 text-lg">to create an account</p><p className="mt-4 text-sm text-muted-foreground">{storefrontFeeDescription} <Link href="/pricing" className="underline underline-offset-4 hover:text-brand-text">See pricing and conditions</Link>. Coach and service approval and payout setup are required. Read the <Link href="/terms" className="underline underline-offset-4 hover:text-brand-text">terms</Link>.</p></div></div></section>

    <section aria-labelledby="coach-faq" className="mt-16 max-w-3xl">
      <h2 id="coach-faq" className="text-3xl font-semibold tracking-tight">Frequently asked questions</h2>
      <div className="mt-4 divide-y divide-border border-y border-border">
        {faqs.map((faq) => (
          <div key={faq.question} className="py-4">
            <h3 className="text-base font-semibold">{faq.question}</h3>
            <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground"><Answer parts={faq.answer} /></p>
          </div>
        ))}
      </div>
    </section>

    <section className="mt-16 max-w-2xl"><h2 className="text-3xl font-semibold tracking-tight">Bring your coaching to Anystride.</h2><p className="mt-4 text-lg text-muted-foreground">Start with your email, then tell us about your coaching.</p><a href="/coaching/apply" className={`${action} mt-8`}>Start my coach application <span aria-hidden="true" className="ml-2">→</span></a><p className="mt-4 text-sm text-muted-foreground">Free account. Approval required. A commission applies to storefront sales.</p></section>
  </div>;
}
