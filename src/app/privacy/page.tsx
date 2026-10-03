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
        Last updated October 3, 2026
      </p>

      <div className="mt-8 max-w-2xl space-y-8 text-base leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold tracking-tight">The short version</h2>
          <p className="mt-2 text-muted-foreground">
            Anystride’s training plans have no login requirement or paywall. You can browse
            every plan, guide, and tool on this site without giving us
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
            load. When configured, we also use PostHog for public pageviews
            and product events. These services collect standard usage data such as pages
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
            events and PostHog pageviews are disabled when your browser sends
            Do Not Track or Global
            Privacy Control; this does not describe the behaviour of every
            third-party analytics service above.
            PostHog receives public page paths and the product events listed here,
            without query strings, form entries, training progress or session recordings.
            It does not store analytics cookies or browser data.
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
            provided. Your email address is never published unless you explicitly
            provide it as your public booking contact. To have your application or
            listing removed, email us and we will delete it.
          </p>
          <p className="mt-3 text-muted-foreground">
            Coach-matching and partnership enquiries are stored separately with
            your name, email, the preferences or business details you submit,
            the submission time and the version of the contact permission you
            accepted. We use these details to review and respond to the enquiry,
            not to enrol you in marketing. We do not send a matching request to
            coaches without asking you first. Do not include medical information.
            Email hello@anystride.com to request removal.
          </p>
          <p className="mt-3 text-muted-foreground">
            Analytics records counts of submitted enquiries, coach-matching link
            clicks and clicks on coaches’ contact or booking links. It does not
            receive the contents of these enquiry forms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">
            Unclaimed public coach listings
          </h2>
          <p className="mt-2 text-muted-foreground">
            We create some unclaimed listings from information coaches publish
            on their business websites. This can include the coach&apos;s name,
            broad business location, advertised services and specialties, and
            website. The profile describes those services directly; it does not
            show which directory or platform led us to the website.
          </p>
          <p className="mt-3 text-muted-foreground">
            We do not import profile photos, testimonials or reviews, personal
            email addresses, phone numbers, or other personal contact details
            for these listings. A coach can claim a profile or ask us to
            correct or remove it by emailing hello@anystride.com.
          </p>
          <p className="mt-3 text-muted-foreground">
            When an approved Reddit integration is enabled, we do not publish
            or retain Reddit usernames, post text, comments, links to posts,
            profile data, or inferred identities. We privately retain Reddit&apos;s
            internal post identifier and the business website address supplied
            in that post, together with confirmation times, so we can check each
            day that the coach still explicitly links to the same first-party
            website.
            If we cannot confirm that association for 36 hours, the listing is
            hidden. If the post is removed or no longer qualifies, its record
            and any listing that depends on it are deleted. Public profiles do
            not identify Reddit as their discovery source.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">Optional coaching accounts</h2>
          <p className="mt-2 text-muted-foreground">
            The coaching account pilot is in preparation. When enabled, Supabase
            manages sign in and email verification. Anystride stores your account
            identifier alongside coach applications, service proposals, coaching
            requests and review records. We do not store your password.
          </p>
          <p className="mt-3 text-muted-foreground">
            A request you choose to send is visible to that coach and Anystride,
            along with the service details shown when you sent it. We record the
            time and version of this sharing permission. Other runners cannot
            see your request. Approved service descriptions and coaching names
            are visible to signed in participants. Account pages do not load our
            analytics trackers. Do not include medical history or identity documents.
            Contact hello@anystride.com about correcting or removing account data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">Cookies</h2>
          <p className="mt-2 text-muted-foreground">
            Google Analytics sets cookies to distinguish repeat visits. We set
            authentication cookies only when the optional coaching account pilot
            is enabled. Blocking those cookies prevents account sign in, but does
            not restrict access to public training plans, guides or tools.
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
