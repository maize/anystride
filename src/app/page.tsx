import Link from "next/link";
import { getAllPlans, availableDistances } from "@/lib/plans";
import { getAllGuides } from "@/lib/guides";
import { PlanCard } from "@/components/PlanCard";
import { DISTANCE_LABELS, DISTANCE_ORDER } from "@/data/types";

export default function Home() {
  const plans = getAllPlans();
  const available = new Set(availableDistances());
  const guides = getAllGuides().slice(0, 4);

  return (
    <div className="mx-auto max-w-5xl px-5">
      {/* Hero */}
      <section className="py-16 sm:py-24">
        <p className="mb-3 text-sm font-medium text-brand">
          Free · No login · Community-sourced
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Training plans for any distance, any runner.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          anystride turns the running community&apos;s most-trusted training
          methodologies into clear, week-by-week plans. Pick your goal and your
          level — and just run.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/plans"
            className="rounded-full bg-brand px-6 py-2.5 font-medium text-brand-foreground hover:opacity-90"
          >
            Browse all plans
          </Link>
          <Link
            href="/calculator"
            className="rounded-full border border-border px-6 py-2.5 font-medium hover:border-brand"
          >
            Find my paces →
          </Link>
        </div>
      </section>

      {/* Distance chooser */}
      <section id="distances" className="border-t border-border py-12">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Choose your distance
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {DISTANCE_ORDER.map((d) => {
            const has = available.has(d);
            return has ? (
              <Link
                key={d}
                href={`/plans?distance=${d}`}
                className="rounded-lg border border-border px-5 py-3 font-medium hover:border-brand hover:text-brand"
              >
                {DISTANCE_LABELS[d]}
              </Link>
            ) : (
              <span
                key={d}
                className="cursor-not-allowed rounded-lg border border-dashed border-border px-5 py-3 font-medium text-muted-foreground"
                title="Plans coming soon"
              >
                {DISTANCE_LABELS[d]}
                <span className="ml-2 text-xs">soon</span>
              </span>
            );
          })}
        </div>
      </section>

      {/* Featured plans */}
      <section className="border-t border-border py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Featured plans</h2>
          <Link href="/plans" className="text-sm font-medium text-brand hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.slug} plan={plan} />
          ))}
        </div>
      </section>

      {/* Why */}
      <section className="border-t border-border py-12">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="font-semibold">Community-trusted</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Plans grounded in the methodologies r/running, r/AdvancedRunning and
              r/C25K actually recommend — each one cites its source.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Genuinely free</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No account, no paywall, no upsell to view or follow a plan. Open the
              page and start training.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Personalized to you</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter a recent time or goal and get your training paces, predicted
              race times, and the plans that fit your current mileage.{" "}
              <Link href="/calculator" className="text-brand hover:underline">
                Try it →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Guides */}
      <section className="border-t border-border py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Running guides</h2>
          <Link href="/guides" className="text-sm font-medium text-brand hover:underline">
            All guides →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="group rounded-xl border border-border p-5 transition hover:border-brand"
            >
              <h3 className="font-semibold group-hover:text-brand">{guide.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {guide.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Coaching teaser */}
      <section className="border-t border-border py-12">
        <div className="flex flex-col items-start gap-4 rounded-2xl bg-muted p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand">New</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              Want a real coach, not just a plan?
            </h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Browse running coaches across US cities by focus and format, then
              connect with them directly.
            </p>
          </div>
          <Link
            href="/coaching"
            className="shrink-0 rounded-full bg-brand px-6 py-2.5 font-medium text-brand-foreground hover:opacity-90"
          >
            Find a coach
          </Link>
        </div>
      </section>
    </div>
  );
}
