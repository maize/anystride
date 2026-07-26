import Link from "next/link";
import { getAllPlans, availableDistances } from "@/lib/plans";
import { getAllGuides } from "@/lib/guides";
import { PlanCard } from "@/components/PlanCard";
import { Reveal } from "@/components/Reveal";
import { DISTANCE_LABELS, DISTANCE_ORDER } from "@/data/types";

export default function Home() {
  const plans = getAllPlans();
  const available = new Set(availableDistances());
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
            anystride turns the running community&apos;s most trusted training
            methodologies into clear weekly plans. Pick your goal and your
            level — and just run.
          </p>
        </Reveal>
        <Reveal delay={300}>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/plans"
              className="rounded-full bg-brand px-6 py-2 text-base font-semibold text-brand-foreground transition-all duration-300 ease-stride hover:bg-brand/90 active:scale-[0.98]"
            >
              Browse all plans
            </Link>
            <Link
              href="/calculator"
              className="rounded-full border border-border px-6 py-2 text-base font-semibold transition-all duration-300 ease-stride hover:border-brand active:scale-[0.98]"
            >
              Find my paces →
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Distance chooser */}
      <section id="distances" className="border-t border-border py-12">
        <Reveal>
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground">
            Choose your distance
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {DISTANCE_ORDER.map((d) => {
              const has = available.has(d);
              return has ? (
                <Link
                  key={d}
                  href={`/training-plans/${d}`}
                  className="rounded-lg border border-border px-4 py-3 font-medium transition-all duration-300 ease-stride hover:-translate-y-0.5 hover:border-brand hover:text-brand active:scale-[0.98]"
                >
                  {DISTANCE_LABELS[d]}
                </Link>
              ) : (
                <span
                  key={d}
                  className="cursor-not-allowed rounded-lg border border-dashed border-border px-4 py-3 font-medium text-muted-foreground"
                  title="Plans coming soon"
                >
                  {DISTANCE_LABELS[d]}
                  <span className="ml-2 text-xs">soon</span>
                </span>
              );
            })}
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
          {plans.map((plan, i) => (
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

      {/* Coaching teaser */}
      <section className="border-t border-border py-12">
        <Reveal>
          <div className="flex flex-col items-start gap-4 rounded-2xl bg-muted p-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-brand">New</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                Want a real coach, not just a plan?
              </h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Browse running coaches across US cities by focus and format,
                then connect with them directly.
              </p>
            </div>
            <Link
              href="/coaching"
              className="shrink-0 rounded-full bg-brand px-6 py-2 text-base font-semibold text-brand-foreground transition-all duration-300 ease-stride hover:bg-brand/90 active:scale-[0.98]"
            >
              Find a coach
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
