/* eslint-disable @next/next/no-html-link-for-pages -- Account entry uses full document navigation to keep public analytics out of private account pages. */
import type { Metadata } from "next";
import Link from "next/link";
import { storefrontFeeDescription, workspacePricingDescription } from "@/lib/public-product";
import { Reveal } from "@/components/Reveal";

const title = "Running Coach Tools, Training Plans & Services | Anystride";
const description = "Invite athletes, assign running workouts and multiweek plans, and sell coaching services. See Anystride’s approval process, fees and integration limits.";
export const metadata: Metadata = {
  title: { absolute: title }, description,
  alternates: { canonical: "/for-coaches" },
  openGraph: { title, description, url: "/for-coaches", type: "website" },
};
const action = "inline-flex items-center justify-center rounded-full bg-brand px-6 py-4 text-base font-semibold text-brand-foreground transition-opacity duration-300 ease-stride hover:opacity-90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand";
const faqs = [
  ["Who is Anystride for?", "Independent running coaches who want a public profile and a place to present their coaching services. Your application asks about your approach, experience and qualifications."],
  ["What does it cost?", `Creating an account is free. ${storefrontFeeDescription} ${workspacePricingDescription}`],
  ["Is my profile published as soon as I apply?", "No. Anystride reviews coach applications before approved profiles appear in the directory. Services also require approval. There is no guaranteed approval time."],
  ["What do I need before selling?", "An approved coach account, an approved service and completed Stripe payout setup. Availability depends on the payment requirements shown during setup."],
  ["Can I share my coaching page?", "Yes. Once your storefront is published, you can share its public link from your website, social profile or running community."],
  ["Does joining guarantee clients?", "No. A listing or storefront does not guarantee visits, enquiries or sales. Use your page to explain your offer clearly and share it with runners who may be a good fit."],
];

export default function ForCoachesPage() {
  return <div className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
    <section aria-labelledby="coach-page-title" className="grid items-center gap-12 lg:grid-cols-2">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-text">For independent running coaches</p>
        <h1 id="coach-page-title" className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Your coaching.<br />One place to start.</h1>
        <p className="mt-6 max-w-xl text-lg text-pretty text-muted-foreground">Anystride gives independent running coaches a workspace to invite athletes, build training plans and assign workouts. Apply for review, then manage training and prepare a public profile for your coaching services.</p>
        <a href="/coaching/apply" className={`${action} mt-8`}>Start my coach application <span aria-hidden="true" className="ml-2">→</span></a>
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
      <h2 id="training-tools" className="text-3xl font-semibold tracking-tight">Manage your athletes and their training</h2>
      <p className="mt-6 text-muted-foreground">After coach approval, invite athletes by email and share the invitation link. Athletes accept before you can access their training calendars. Build plans from 1 to 24 weeks, assign workouts and review recorded results. Athletes can revoke access from their account.</p>
      <h3 className="mt-8 text-xl font-semibold">One account, separate views</h3>
      <p className="mt-4 text-muted-foreground">Coach view contains your athletes, plans, profile, services and sales. Switch to runner view for your own calendar, coaches and purchases. Your choice is remembered, so you do not need separate accounts.</p>
      <h3 className="mt-8 text-xl font-semibold">Strava and watch integrations</h3>
      <p className="mt-4 text-muted-foreground">Strava syncing is a limited beta with capacity for ten connected athletes across Anystride. Athletes control sharing separately for each coach; Only You activities are not shared with coaches. Manual workout recording and Strava CSV import are also available. Direct Garmin and COROS syncing and sending workouts to watches are not available.</p>
      <p className="mt-6 text-muted-foreground">{workspacePricingDescription} <Link href="/pricing" className="underline underline-offset-4">Read the pricing details</Link>.</p>
    </section>

    <section aria-labelledby="coach-benefits" className="mt-16">
      <h2 id="coach-benefits" className="text-3xl font-semibold tracking-tight">Let runners understand the offer.</h2>
      <div className="mt-8 grid gap-8 sm:grid-cols-3">{[
        ["01", "Put your approach first", "Describe your experience and the runners you work with. Help people judge whether your coaching fits their goals."],
        ["02", "Explain the support", "Give each service its own description, inclusions and price. Set expectations before a runner decides to buy."],
        ["03", "Share one destination", "Publish your storefront when it is ready, then use its link wherever runners discover your work."],
      ].map(([number, heading, body]) => <article key={number}><p className="text-sm font-semibold text-brand-text">{number}</p><h3 className="mt-4 text-xl font-semibold">{heading}</h3><p className="mt-4 text-pretty text-muted-foreground">{body}</p></article>)}</div>
    </section>

    <Reveal className="my-16 rounded-2xl bg-foreground p-8 text-background sm:p-12"><p className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Your experience starts the conversation.<br /><span className="opacity-70">Your offer makes the next step clear.</span></p></Reveal>

    <section aria-labelledby="coach-steps" className="grid gap-8 lg:grid-cols-2">
      <div><p className="text-sm font-semibold text-brand-text">From application to storefront</p><h2 id="coach-steps" className="mt-4 text-3xl font-semibold tracking-tight">Know what happens next.</h2><p className="mt-6 text-muted-foreground">An account is the start of an application. It is not automatic approval or a promise of customers.</p></div>
      <ol className="space-y-8">{[
        ["Request your account link", "Enter your email at coach sign up. Use the emailed link to access your account."],
        ["Introduce your coaching", "Complete your name, coaching approach, experience and qualifications for review."],
        ["Prepare your services", "After approval, set up your storefront and services. Services need review, and Stripe payouts must be set up before selling."],
      ].map(([heading,body], i) => <li key={heading} className="flex gap-4"><span aria-hidden="true" className="text-lg font-semibold text-brand-text">0{i+1}</span><div><h3 className="text-xl font-semibold">{heading}</h3><p className="mt-2 text-muted-foreground">{body}</p></div></li>)}</ol>
    </section>

    <section aria-labelledby="coach-cost" className="mt-16 rounded-2xl border border-border p-8 sm:p-12"><div className="grid gap-8 sm:grid-cols-2"><div><h2 id="coach-cost" className="text-3xl font-semibold tracking-tight">Clear costs before you apply.</h2><p className="mt-6 text-muted-foreground">Free to create an account. Anystride takes a commission when you make a storefront sale.</p></div><div><p className="text-6xl font-semibold tracking-tight">Free</p><p className="mt-4 text-lg">to create an account</p><p className="mt-4 text-sm text-muted-foreground">{storefrontFeeDescription} <Link href="/pricing" className="underline underline-offset-4 hover:text-brand-text">See pricing and conditions</Link>. Coach and service approval and payout setup are required. Read the <Link href="/terms" className="underline underline-offset-4 hover:text-brand-text">terms</Link>.</p></div></div></section>

    <section aria-labelledby="coach-questions" className="mt-16 max-w-3xl"><h2 id="coach-questions" className="text-3xl font-semibold tracking-tight">Before you join</h2><div className="mt-8 space-y-4">{faqs.map(([question,answer]) => <details key={question} className="rounded-xl border border-border p-6"><summary className="cursor-pointer text-lg font-semibold focus-visible:outline-2 focus-visible:outline-brand">{question}</summary><p className="mt-4 text-muted-foreground">{answer}</p></details>)}</div></section>

    <section className="mt-16 max-w-2xl"><h2 className="text-3xl font-semibold tracking-tight">Bring your coaching to Anystride.</h2><p className="mt-4 text-lg text-muted-foreground">Start with your email, then tell us about your coaching.</p><a href="/coaching/apply" className={`${action} mt-8`}>Start my coach application <span aria-hidden="true" className="ml-2">→</span></a><p className="mt-4 text-sm text-muted-foreground">Free account. Approval required. A commission applies to storefront sales.</p></section>
  </div>;
}
