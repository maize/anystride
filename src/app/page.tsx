import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { homeFaqs } from "@/lib/home-content";
import Link from "next/link";
import { getAllPlans } from "@/lib/plans";
import { getAllGuides } from "@/lib/guides";
import { PlanCard } from "@/components/PlanCard";
import { PlanFinder } from "@/components/PlanFinder";
import { Reveal } from "@/components/Reveal";
import { toPlanFinderCandidate } from "@/lib/plan-finder";

export const metadata: Metadata = {
  title: { absolute: "Running training plans, coaches & coaching tools | Anystride" },
  description: "Find free running training plans or a coach for your next race. Coaches can build workouts, assign plans and manage athletes with Anystride.",
  alternates: { canonical: "/" },
  openGraph: { title: "Anystride · Training plans and coaching for runners", description: "Find a free training plan or a coach for your next race. Coaches can build plans and manage their athletes here, too.", url: "https://anystride.com", type: "website" },
  twitter: { card: "summary_large_image", title: "Anystride · Training plans and coaching for runners", description: "Find a free training plan or a coach for your next race. Coaches can build plans and manage their athletes here, too." },
};

export default function Home() {
  const plans = getAllPlans();
  const featuredPlans = plans.filter((plan) => plan.kind === "full");
  const finderCandidates = plans.map(toPlanFinderCandidate);
  const guides = getAllGuides().slice(0, 4);

  return (
    <div className="mx-auto max-w-5xl px-5">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", "@id": "https://anystride.com/#questions", url: "https://anystride.com/", mainEntity: homeFaqs.map(faq => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) }} />
      <section className="py-12 sm:py-20" aria-labelledby="home-heading">
        <Reveal><p className="text-sm font-semibold text-brand">For runners and running coaches</p>
          <h1 id="home-heading" className="text-hero-gradient mt-4 max-w-2xl pb-2 text-5xl font-semibold tracking-tighter sm:text-7xl">Training plans and<br className="hidden sm:block" /> coaching for runners.</h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">Find a free training plan or a coach for your next race. Coaches can build plans and manage their athletes here, too.</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4"><Link href="#plan-finder" className="action-primary px-3 py-2">Find a training plan</Link><Link href="/coaching" className="action-link">Find a coach →</Link></div>
          <p className="mt-5 text-sm"><Link href="#coaching-workspace" className="text-brand underline underline-offset-4">Tools for coaches →</Link></p>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground">Free plans need no account. Coaching tools are in early access; coach applications are reviewed.</p>
        </Reveal>
      </section>

      {/* Plan finder */}
      <section
        id="plan-finder"
        className="scroll-mt-24 border-t border-border py-12 sm:py-16"
      >
        <Reveal>
          <PlanFinder candidates={finderCandidates} />
        </Reveal>
      </section>

      {/* Free running training plans */}
      <section className="border-t border-border py-12">
        <Reveal>
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">
              Free running training plans
            </h2>
            <Link
              href="/plans"
              className="text-sm font-medium text-brand hover:underline"
            >
              View all →
            </Link>
          </div>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredPlans.map((plan, i) => (
            <Reveal key={plan.slug} delay={(i % 3) * 80}>
              <PlanCard plan={plan} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Coaching launch */}
      <section className="border-t border-border py-12 sm:py-16">
        <Reveal>
          <div className="overflow-hidden rounded-2xl bg-muted lg:grid lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-8 sm:p-12">
              <p className="eyebrow text-brand">For runners looking for a coach</p>
              <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-tighter">
                Find a running coach
              </h2>
              <p className="mt-4 max-w-xl text-base text-muted-foreground">
                Browse independent coaches by training focus, location and online availability.
                Read their profiles and services, or tell us what you need and ask
                for help finding a coach.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
                <Link href="/coaching" className="action-primary">
                  Browse running coaches
                </Link>
                <Link href="/coaching/match" className="action-link">
                  Ask for a match →
                </Link>
              </div>
              <p className="mt-6 max-w-xl text-sm text-muted-foreground">
                Browsing is free. Coaches set their own prices for consultations and coaching packages.
              </p>
            </div>

            <div className="border-t border-border bg-background p-8 lg:border-l lg:border-t-0 sm:p-12">
              <p className="eyebrow">How to find a coach</p>
              <ol className="mt-6">
                <li className="grid grid-cols-[40px_1fr] gap-4 border-t border-border py-5">
                  <span className="font-mono text-sm text-muted-foreground tabular-nums">
                    01
                  </span>
                  <div>
                    <h3 className="font-semibold">Search the directory</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Filter coaches by focus, city and online availability.
                    </p>
                  </div>
                </li>
                <li className="grid grid-cols-[40px_1fr] gap-4 border-t border-border py-5">
                  <span className="font-mono text-sm text-muted-foreground tabular-nums">
                    02
                  </span>
                  <div>
                    <h3 className="font-semibold">Ask us for a recommendation</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Tell us your goals and the support you want. Anystride reviews
                      each request before making an introduction.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </Reveal>
      </section>

      <section id="coaching-workspace" aria-labelledby="workspace-heading" className="scroll-mt-24 py-12 sm:py-16">
        <Reveal><div className="grid gap-8 sm:grid-cols-[1fr_2fr]"><div><p className="text-sm font-semibold text-brand">For coaches and their athletes</p><h2 id="workspace-heading" className="mt-4 text-3xl font-semibold tracking-tight">Build plans and manage your athletes</h2></div><div className="space-y-8">
          {[["Build and assign training plans", "Create plans from 1 to 24 weeks with warmups, intervals, recovery and effort targets. Save workouts to your library and give each athlete a copy of the plan you can adjust."], ["Review completed workouts", "Runners record their time, distance and effort alongside the planned workout. Coaches can review those results when deciding what to schedule next."], ["Choose who can see your training", "Runners accept a coach’s invitation before sharing their calendar. They can end the coaching relationship and remove that access from their account."], ["Keep track of your athletes", "Open an athlete’s calendar from your roster, review their week and assign workouts. Each runner has their own calendar and training history."]].map(([title,body],i)=><article key={title} className="grid gap-3 sm:grid-cols-[32px_1fr]"><span className="text-sm tabular-nums text-brand">0{i+1}</span><div><h3 className="text-xl font-semibold">{title}</h3><p className="mt-3 max-w-xl text-muted-foreground">{body}</p></div></article>)}
        </div></div></Reveal>
        <Reveal delay={160}><figure className="mt-12 overflow-hidden rounded-2xl border border-border bg-muted p-4 sm:p-8">
          <figcaption className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-brand">Example athlete calendar</p><p className="mt-2 text-xl font-semibold">Planned workouts and completed runs</p></div><span className="text-xs text-muted-foreground">Illustrative training week · sample data</span></figcaption>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_2fr]">
            <div className="rounded-lg bg-background p-6"><p className="text-xs text-muted-foreground">Training plan</p><h3 className="mt-3 text-2xl font-semibold">12-week half marathon plan</h3><p className="mt-3 text-sm text-muted-foreground">Week 4 of 12</p><ol className="mt-6 space-y-4 text-sm"><li><span className="text-brand">01</span> Coach assigns the plan</li><li><span className="text-brand">02</span> Runner records each workout</li><li><span className="text-brand">03</span> Coach reviews the results</li></ol><p className="mt-8 text-xs text-muted-foreground">The coach can adjust upcoming workouts for this runner.</p></div>
            <div className="space-y-4"><div className="rounded-lg bg-background p-6"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-semibold">Tuesday · Easy run</p><span className="text-xs text-brand">Completed</span></div><div className="mt-4 grid grid-cols-2 gap-4"><div><p className="text-xs text-muted-foreground">Planned workout</p><p className="mt-2 text-2xl font-semibold tabular-nums">40 min</p><p className="mt-2 text-xs text-muted-foreground">Comfortable, conversational effort</p></div><div><p className="text-xs text-muted-foreground">Recorded by runner</p><p className="mt-2 text-2xl font-semibold tabular-nums">41.6 min</p><p className="mt-2 text-xs text-muted-foreground">6.3 km completed</p></div></div></div>
              <div className="rounded-lg bg-background p-6"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-semibold">Thursday · Controlled intervals</p><span className="text-xs text-muted-foreground">Planned</span></div><div className="mt-4 flex items-end gap-2" aria-hidden="true">{[8,16,8,16,8,16,8,16,8].map((height,i)=><span key={i} className={`flex-1 rounded-sm ${i%2?'bg-brand h-16':'bg-foreground/15 h-8'}`} />)}</div><p className="mt-3 text-sm text-muted-foreground">4 × 3 minutes work · 1 minute recovery</p></div>
            </div>
          </div><p className="mt-6 text-xs text-muted-foreground">Runners accept a coaching invitation before sharing their calendar. They can end that access at any time.</p>
        </figure></Reveal>
      </section>
      {/* Coach storefront product */}
      <section id="for-coaches" aria-labelledby="coach-product-heading" className="scroll-mt-24 border-t border-border py-12 sm:py-16">
        <Reveal>
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
            <div>
              <p className="eyebrow text-brand">For independent coaches</p>
              <h2 id="coach-product-heading" className="mt-4 text-4xl font-semibold tracking-tighter sm:text-5xl">Sell coaching packages and consultations</h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">Create a public profile with your experience, services and prices. Runners can read what each service includes and buy from your page.</p>
              <dl className="mt-8 space-y-6">
                <div><dt className="font-semibold">Describe your coaching</dt><dd className="mt-2 text-sm text-muted-foreground">Tell runners who you coach, how you work and what experience you bring.</dd></div>
                <div><dt className="font-semibold">List your services and prices</dt><dd className="mt-2 text-sm text-muted-foreground">Set a price, explain what is included and take payment through Stripe.</dd></div>
                <div><dt className="font-semibold">Manage orders and payouts</dt><dd className="mt-2 text-sm text-muted-foreground">View orders in your account, tell clients how to get started and manage payouts through Stripe.</dd></div>
              </dl>
              <div className="mt-8 flex flex-wrap items-center gap-6"><Link href="/account/sign-up" className="action-primary">Start my coach application ↗</Link><Link href="/account/sign-in?next=%2Faccount%2Fservices" className="action-link">Already a coach? Sign in →</Link></div>
              <p className="mt-6 max-w-xl text-sm text-muted-foreground">Free to create an account. 10% commission per sale, including payment processing. Coach and service approval required; set up payouts before selling.</p>
            </div>
            <div className="rounded-2xl bg-brand p-6 text-brand-foreground sm:p-8" aria-label="Illustration of a coach storefront and example sale">
              <div className="mb-6 flex items-center justify-between gap-4 text-sm"><p className="font-semibold">Example coach profile</p><span className="rounded-full border border-current px-3 py-1 text-xs">Illustration</span></div>
              <div className="rounded-xl bg-background p-6 text-foreground sm:p-8">
                <p className="break-all text-xs text-muted-foreground">anystride.com/coaching/with/your-name</p>
                <div className="mt-6 flex items-center gap-4"><span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-semibold" aria-hidden="true">YOU</span><div><p className="text-2xl font-semibold tracking-tight">Your coaching profile</p><p className="mt-2 text-sm text-muted-foreground">Personal coaching · Online</p></div></div>
                <div className="mt-8 border-t border-border pt-6"><p className="text-xs font-semibold uppercase tracking-widest text-brand">Example service</p><h3 className="mt-2 text-xl font-semibold">Four weeks of running coaching</h3><p className="mt-2 text-sm text-muted-foreground">Example package: a personal training plan and a weekly check-in with the coach.</p><div className="mt-6 flex items-end justify-between gap-4"><p className="text-3xl font-semibold tabular-nums">$200<span className="ml-2 text-sm font-normal text-muted-foreground">USD</span></p><span className="text-sm text-muted-foreground">One payment</span></div></div>
                <div className="mt-6 rounded-lg bg-muted p-4"><p className="text-sm font-semibold">Example fee breakdown</p><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Anystride · 10%</dt><dd className="tabular-nums">$20</dd></div><div className="flex justify-between gap-4 font-semibold"><dt>Your share</dt><dd className="tabular-nums">$180</dd></div></dl><p className="mt-4 text-xs text-muted-foreground">Illustrative amounts before refunds or disputes. Payout timing is shown in Stripe.</p></div>
              </div>
              <p className="mt-6 text-sm">Share your profile on your website or social accounts.</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Guides */}
      <section className="border-t border-border py-12">
        <Reveal>
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">
              Running guides
            </h2>
            <Link
              href="/guides"
              className="text-sm font-medium text-brand hover:underline"
            >
              All guides →
            </Link>
          </div>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2">
          {guides.map((guide, i) => (
            <Reveal key={guide.slug} delay={(i % 2) * 80}>
              <Link
                href={`/guides/${guide.slug}`}
                className="group block h-full rounded-xl bg-muted p-5 transition-all duration-300 ease-stride hover:-translate-y-0.5"
              >
                <h3 className="font-semibold transition-colors duration-300 ease-stride group-hover:text-brand">
                  {guide.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {guide.description}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="questions" aria-labelledby="questions-heading" className="py-12 sm:py-16">
        <Reveal><p className="text-sm font-semibold text-brand">Plans, coaching and accounts</p><h2 id="questions-heading" className="mt-4 text-4xl font-semibold tracking-tight">Common questions</h2></Reveal>
        <div className="mt-8 grid gap-x-12 gap-y-8 sm:grid-cols-2">{homeFaqs.map(faq=><article key={faq.question}><h3 className="text-lg font-semibold">{faq.question}</h3><p className="mt-3 text-sm text-muted-foreground">{faq.answer}</p></article>)}</div>
        <p className="mt-8 text-sm"><Link href="/privacy" className="text-brand underline">Read how training data is handled</Link> · <Link href="/terms" className="text-brand underline">Terms of use</Link></p>
      </section>
      <section aria-label="Get started with Anystride" className="grid gap-8 rounded-2xl bg-muted p-8 sm:grid-cols-2 sm:p-12">
        <div><h2 className="text-2xl font-semibold tracking-tight">Looking for a plan or a coach?</h2><p className="mt-4 text-muted-foreground">Read the free plans or browse running coaches before you decide.</p><div className="mt-6 flex flex-wrap gap-x-6 gap-y-3"><Link href="/plans" className="action-link">Browse training plans →</Link><Link href="/coaching" className="action-link">Find a coach →</Link></div></div>
        <div><h2 className="text-2xl font-semibold tracking-tight">Coaching runners?</h2><p className="mt-4 text-muted-foreground">Apply for a coach account to manage athletes, assign training and offer your services. Applications are reviewed.</p><Link href="/coaching/apply" className="action-primary mt-6 px-3 py-2">Apply as a coach ↗</Link></div>
      </section>
    </div>
  );
}
