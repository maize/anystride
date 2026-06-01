import type { Metadata } from "next";
import { CoachInterestForm } from "@/components/CoachInterestForm";

export const metadata: Metadata = {
  title: "Personalized coaching — coming soon",
  description:
    "AnyStride is building a way to connect runners with vetted human coaches — and finally know how good a coach really is. Register your interest.",
};

export default function CoachingPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
        {/* Pitch */}
        <div>
          <p className="mb-3 text-sm font-medium text-brand">Coming soon</p>
          <h1 className="text-4xl font-bold tracking-tight">
            Want a coach who actually fits you?
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Free plans get most runners a long way. But sometimes you want a real
            person — someone to adapt the plan to your life, keep you accountable,
            and help you through the messy bits.
          </p>
          <p className="mt-4 text-muted-foreground">
            The hard part has always been knowing <em>which</em> coach, and whether
            they&apos;re any good. We&apos;re building a better way to find vetted
            running coaches — with transparent specialties, honest reviews, and a
            low-risk way to try before you commit.
          </p>

          <ul className="mt-6 space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="text-brand">✓</span>
              <span>
                <strong>Vetted coaches</strong> — verified experience and
                credentials, not just a self-serve listing.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-brand">✓</span>
              <span>
                <strong>Honest, outcome-based reviews</strong> — from runners with
                goals like yours.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-brand">✓</span>
              <span>
                <strong>Clear specialties &amp; pricing up front</strong> — no
                finding out after you&apos;ve paid.
              </span>
            </li>
          </ul>

          <p className="mt-8 text-sm text-muted-foreground">
            We&apos;re gauging interest before we build. Tell us you want it — that
            genuinely decides whether we make it.
          </p>
        </div>

        {/* Form */}
        <div className="lg:sticky lg:top-8">
          <CoachInterestForm />
        </div>
      </div>
    </div>
  );
}
