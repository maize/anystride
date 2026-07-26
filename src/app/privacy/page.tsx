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
        Last updated July 26, 2026
      </p>

      <div className="mt-8 max-w-2xl space-y-8 text-base leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold tracking-tight">The short version</h2>
          <p className="mt-2 text-muted-foreground">
            anystride has no accounts, no login, and no paywall. You can browse
            every plan, guide, and tool on this site without giving us any
            personal information. The only personal data we ever receive is what
            you type into the coach application form, and we use it only to
            review and publish coach listings.
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
