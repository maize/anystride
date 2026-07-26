import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "The terms for using anystride's free training plans, guides, and tools.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <h1 className="text-hero-gradient text-3xl font-bold tracking-tight sm:text-4xl">
        Terms of use
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated July 26, 2026
      </p>

      <div className="mt-8 max-w-2xl space-y-8 text-base leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold tracking-tight">
            What anystride is
          </h2>
          <p className="mt-2 text-muted-foreground">
            anystride publishes free training plans, guides, calculators, and a
            directory of running coaches. Everything on the site is provided
            free of charge, without accounts, for personal use.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">
            Not medical advice
          </h2>
          <p className="mt-2 text-muted-foreground">
            Training plans, pace calculations, and guides are general
            information, not medical or professional advice. Running carries a
            risk of injury. Consult a doctor before starting a new training
            program, and stop and seek medical help if you feel pain, dizziness,
            or anything beyond normal training effort. You follow any plan on
            this site at your own risk.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">
            Coach listings
          </h2>
          <p className="mt-2 text-muted-foreground">
            Coach profiles describe independent coaches, not employees or
            partners of anystride. We review applications before listing, but we
            do not verify certifications, guarantee results, or take part in any
            agreement you make with a coach. Vet any coach yourself before
            paying for their services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">
            Content and attribution
          </h2>
          <p className="mt-2 text-muted-foreground">
            Plans that adapt community methodologies cite their sources on the
            plan page. Site content is provided as-is, and we may change or
            remove it at any time. You may share links to any page; do not
            republish full plans commercially without permission.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">Contact</h2>
          <p className="mt-2 text-muted-foreground">
            Questions about these terms? Email{" "}
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
