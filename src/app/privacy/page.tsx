import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How anystride handles your data: what we collect, what we don't, and the analytics services we use.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <h1 className="text-hero-gradient text-3xl font-bold tracking-tight sm:text-4xl">
        Privacy policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated September 12, 2026
      </p>

      <div className="mt-8 max-w-2xl space-y-8 text-base leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold tracking-tight">The short version</h2>
          <p className="mt-2 text-muted-foreground">
            anystride has no accounts, no login, and no paywall. You can browse
            every plan, guide, and tool on this site without giving us any
            your name or email. Coach applications and enquiries involve
            information you submit; the analytics services described below also
            receive usage data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">
            Data we collect automatically
          </h2>
          <p className="mt-2 text-muted-foreground">
            We use Google Analytics 4, Vercel Analytics, and Vercel Speed
            Insights to understand which pages are useful and how fast they
            load. These services collect standard usage data such as pages
            visited, approximate location derived from IP address, device type,
            and browser. We do not use this data to identify individual
            visitors, and we do not sell it or share it for advertising.
          </p>
          <p className="mt-3 text-muted-foreground">
            We also measure actions such as finding or starting a plan, opening
            the current week, marking a workout complete, requesting an export,
            and following race-source or related-plan links. These product events
            include public content identifiers, not your start date, workout notes,
            mileage, race times or answers to the plan finder. These additional
            events are disabled when your browser sends Do Not Track or Global
            Privacy Control; this does not describe the behaviour of every
            third-party analytics service above.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">Training progress on this device</h2>
          <p className="mt-2 text-muted-foreground">
            Your plan start date, distance units and completed workouts are saved
            in this browser’s local storage. They are not synced to an account or
            uploaded as a training record. Clearing site data removes this saved
            progress; private browsing or blocked storage may prevent it from
            surviving your visit.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">
            Data you give us
          </h2>
          <p className="mt-2 text-muted-foreground">
            If you apply to be listed as a coach, we store the details you
            submit — name, email, location, website, and coaching background —
            in our database. We use them to review your application, contact
            you about it, and, if approved, publish the listing details you
            provided. Your email address is never published. To have your
            application or listing removed, email us and we will delete it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">Cookies</h2>
          <p className="mt-2 text-muted-foreground">
            Google Analytics sets cookies to distinguish repeat visits. We set
            no other cookies. You can block cookies in your browser settings
            without losing any functionality on this site.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">Contact</h2>
          <p className="mt-2 text-muted-foreground">
            Questions about this policy or your data? Email{" "}
            <a
              href="mailto:hello@anystride.com"
              className="text-brand hover:underline"
            >
              hello@anystride.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
