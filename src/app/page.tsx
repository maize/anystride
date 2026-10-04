import Link from "next/link";
import { getAllPlans } from "@/lib/plans";
import { getAllGuides } from "@/lib/guides";
import { PlanCard } from "@/components/PlanCard";
import { PlanFinder } from "@/components/PlanFinder";
import { Reveal } from "@/components/Reveal";
import { toPlanFinderCandidate } from "@/lib/plan-finder";

export default function Home() {
  const plans = getAllPlans();
  const featuredPlans = plans.filter((plan) => plan.kind === "full");
  const finderCandidates = plans.map(toPlanFinderCandidate);
  const guides = getAllGuides().slice(0, 4);

  return (
    <div className="mx-auto max-w-5xl px-5">
      {/* Hero */}
      <section className="py-16 sm:py-24">
        <Reveal>
          <p className="mb-3 text-sm font-medium text-brand">
            Free · No login · No paywall
          </p>
        </Reveal>
        <Reveal delay={100}>
          <h1 className="text-hero-gradient max-w-2xl pb-1 text-5xl font-bold tracking-tighter sm:text-6xl">
            Training plans for any distance, any runner.
          </h1>
        </Reveal>
        <Reveal delay={200}>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Compare trusted methods, match a plan to your current base and
            schedule, then turn it into a week you can actually follow.
          </p>
        </Reveal>
        <Reveal delay={300}>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#plan-finder"
              className="rounded-full bg-brand px-6 py-2 text-base font-semibold text-brand-foreground transition-all duration-300 ease-stride hover:bg-brand/90 active:scale-[0.98]"
            >
              Find my plan
            </Link>
            <Link
              href="/plans"
              className="px-3 py-2 text-base font-medium text-muted-foreground transition-colors duration-300 ease-stride hover:text-foreground"
            >
              Browse all plans →
            </Link>
            <Link href="#for-coaches" className="px-3 py-2 text-base font-semibold text-brand hover:underline underline-offset-4">For coaches ↗</Link>
          </div>
        </Reveal>
      </section>

      {/* Coach storefront product */}
      <section id="for-coaches" aria-labelledby="coach-product-heading" className="scroll-mt-24 border-t border-border py-12 sm:py-16">
        <Reveal>
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
            <div>
              <p className="eyebrow text-brand">Now for independent coaches</p>
              <h2 id="coach-product-heading" className="mt-4 text-4xl font-semibold tracking-tighter sm:text-5xl">Your coaching.<br />Open for business.</h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">Give your next client one place to meet you, choose their support and buy your coaching. A public storefront you can share anywhere.</p>
              <dl className="mt-8 space-y-6">
                <div><dt className="font-semibold">A profile that feels like you</dt><dd className="mt-2 text-sm text-muted-foreground">Show your approach, experience and specialities on your own shareable page.</dd></div>
                <div><dt className="font-semibold">Clear offers. Simple purchases.</dt><dd className="mt-2 text-sm text-muted-foreground">Sell consultations and coaching packages with prices, inclusions and secure Stripe checkout.</dd></div>
                <div><dt className="font-semibold">Know what happens after the sale</dt><dd className="mt-2 text-sm text-muted-foreground">Keep sales in your account, give clients their next steps and manage payouts through Stripe.</dd></div>
              </dl>
              <div className="mt-8 flex flex-wrap items-center gap-6"><Link href="/account/sign-up" className="action-primary">Start my coach application ↗</Link><Link href="/account/sign-in?next=%2Faccount%2Fservices" className="action-link">Already a coach? Sign in →</Link></div>
              <p className="mt-6 max-w-xl text-sm text-muted-foreground">Free to create an account. 10% commission per sale, including payment processing. Coach and service approval required; connect payouts before selling.</p>
            </div>
            <div className="rounded-2xl bg-brand p-6 text-brand-foreground sm:p-8" aria-label="Illustration of a coach storefront and example sale">
              <div className="mb-6 flex items-center justify-between gap-4 text-sm"><p className="font-semibold">Your storefront, at a glance</p><span className="rounded-full border border-current px-3 py-1 text-xs">Illustration</span></div>
              <div className="rounded-xl bg-background p-6 text-foreground sm:p-8">
                <p className="break-all text-xs text-muted-foreground">anystride.com/coaching/with/your-name</p>
                <div className="mt-6 flex items-center gap-4"><span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-semibold" aria-hidden="true">YOU</span><div><p className="text-2xl font-semibold tracking-tight">Your name. Your approach.</p><p className="mt-2 text-sm text-muted-foreground">Personal coaching · Online</p></div></div>
                <div className="mt-8 border-t border-border pt-6"><p className="text-xs font-semibold uppercase tracking-widest text-brand">Example service</p><h3 className="mt-2 text-xl font-semibold">Four weeks, focused on you</h3><p className="mt-2 text-sm text-muted-foreground">A personal training plan, weekly check-ins and room for real life.</p><div className="mt-6 flex items-end justify-between gap-4"><p className="text-3xl font-semibold tabular-nums">$200<span className="ml-2 text-sm font-normal text-muted-foreground">USD</span></p><span className="text-sm text-muted-foreground">One payment</span></div></div>
                <div className="mt-6 rounded-lg bg-muted p-4"><p className="text-sm font-semibold">A clear split on every sale</p><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Anystride · 10%</dt><dd className="tabular-nums">$20</dd></div><div className="flex justify-between gap-4 font-semibold"><dt>Your share</dt><dd className="tabular-nums">$180</dd></div></dl><p className="mt-4 text-xs text-muted-foreground">Illustrative amounts before refunds or disputes. Payout timing is shown in Stripe.</p></div>
              </div>
              <p className="mt-6 text-sm">One link for your website, social bio and running community.</p>
            </div>
          </div>
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

      {/* Coaching launch */}
      <section className="border-t border-border py-12 sm:py-16">
        <Reveal>
          <div className="overflow-hidden rounded-2xl bg-muted lg:grid lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-8 sm:p-12">
              <p className="eyebrow text-brand">New for runners</p>
              <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-tighter">
                Coaching, when a plan is not enough.
              </h2>
              <p className="mt-4 max-w-xl text-base text-muted-foreground">
                Browse independent running coaches by goal, location and
                format. If you are unsure who fits, tell us what you need and
                we will review your request before making an introduction.
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
                The directory is free to browse. Your training plans stay free,
                with no account or paywall.
              </p>
            </div>

            <div className="border-t border-border bg-background p-8 lg:border-l lg:border-t-0 sm:p-12">
              <p className="eyebrow">Two ways to start</p>
              <ol className="mt-6">
                <li className="grid grid-cols-[40px_1fr] gap-4 border-t border-border py-5">
                  <span className="font-mono text-sm text-muted-foreground tabular-nums">
                    01
                  </span>
                  <div>
                    <h3 className="font-semibold">Browse on your terms</h3>
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
                    <h3 className="font-semibold">Ask a human</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      The matching pilot is reviewed by Anystride before any
                      introduction.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Featured plans */}
      <section className="border-t border-border py-12">
        <Reveal>
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">
              Featured plans
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

      {/* Why */}
      <section className="border-t border-border py-12">
        <Reveal>
          <div className="grid gap-8 sm:grid-cols-[1fr_2fr]">
            <h2 className="text-2xl font-semibold tracking-tight">
              Why runners
              <br className="hidden sm:block" /> use anystride
            </h2>
            <div>
              <div className="border-t border-border py-5 sm:grid sm:grid-cols-[48px_1fr] sm:gap-4">
                <span className="font-mono text-sm text-muted-foreground tabular-nums">
                  01
                </span>
                <div>
                  <h3 className="font-semibold">Community trusted</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Plans grounded in the methodologies r/running,
                    r/AdvancedRunning and r/C25K actually recommend — each one
                    cites its source.
                  </p>
                </div>
              </div>
              <div className="border-t border-border py-5 sm:grid sm:grid-cols-[48px_1fr] sm:gap-4">
                <span className="font-mono text-sm text-muted-foreground tabular-nums">
                  02
                </span>
                <div>
                  <h3 className="font-semibold">Genuinely free</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No account, no paywall, no upsell to view or follow a plan.
                    Open the page and start training.
                  </p>
                </div>
              </div>
              <div className="border-t border-border py-5 sm:grid sm:grid-cols-[48px_1fr] sm:gap-4">
                <span className="font-mono text-sm text-muted-foreground tabular-nums">
                  03
                </span>
                <div>
                  <h3 className="font-semibold">Personalized to you</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter a recent time or goal and get your training paces,
                    predicted race times, and the plans that fit your current
                    mileage.{" "}
                    <Link
                      href="/calculator"
                      className="text-brand hover:underline"
                    >
                      Try it →
                    </Link>
                  </p>
                </div>
              </div>
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
    </div>
  );
}
