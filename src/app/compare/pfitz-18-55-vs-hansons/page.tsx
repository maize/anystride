import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/JsonLd";

const TITLE = "Pfitz 18/55 vs Hansons: which marathon plan fits you?";
const DESCRIPTION =
  "Pfitz 18/55 vs Hansons Marathon Method: long runs of 20 vs 16 miles, peak weeks of 55 vs 57.5-61.5 miles, 5 vs 6 run days. Sourced facts and a fair verdict.";

const PFITZ_BOOK = "https://us.humankinetics.com/products/advanced-marathoning-4th-edition";
const PFITZ_CALENDAR = "https://defy.org/hacks/calendarhack/?p=pfitz_18_55&u=mi";
const HANSONS_BEGINNER = "https://s3.us-central-1.wasabisys.com/hansons/Beginner_Marathon_-_new.pdf";
const HANSONS_ADVANCED = "https://s3.us-central-1.wasabisys.com/hansons/Advanced_Marathon_-_new.pdf";
const HANSONS_BOOK = "https://lukehumphreyrunning.com/wp-content/uploads/2015/11/preview_HMM2.pdf";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/compare/pfitz-18-55-vs-hansons" },
};

type Part = string | { href: string; label: string };

const faqs: { question: string; answer: Part[] }[] = [
  {
    question: "Is Hansons easier than Pfitzinger?",
    answer: [
      "Neither source rates one plan as easier. Hansons caps the long run at 16 miles and schedules six running days. Pfitz 18/55 schedules a 20-mile long run, five running days in peak weeks, and a first week of 33 miles.",
    ],
  },
  {
    question: "Why does Hansons stop the long run at 16 miles?",
    answer: [
      "Both free Hansons plans set the longest run at 16 miles, in weeks 11, 13, and 15. The ",
      { href: HANSONS_BOOK, label: "Hansons Marathon Method book preview" },
      ' names the reason cumulative fatigue. The long run comes on legs already tired from the week. The book describes that run as simulating "the last 16 miles of the marathon, not the first 16 miles."',
    ],
  },
  {
    question: "Can I switch from Hansons to Pfitz mid-cycle?",
    answer: [
      "Neither the free Hansons plans nor Advanced Marathoning describes a mid-cycle switch. Do not switch mid-block without a coach. See ",
      { href: "/coaching/focus/marathon", label: "marathon coaches" },
      " or the ",
      { href: "/coaches", label: "coach directory" },
      " before you change plans.",
    ],
  },
  {
    question: "How many miles a week before starting Pfitz 18/55?",
    answer: [
      "Week 1 of Pfitz 18/55 is 33 miles. These sources do not give a separate mileage rule for the weeks before week 1.",
    ],
  },
  {
    question: "Which plan is better for a Boston qualifier?",
    answer: [
      "Neither source makes a Boston qualifier claim. Compare the structure instead. Pfitz 18/55 has a 20-mile long run, medium-long runs of 11-15 miles, and a 3-week taper. Hansons caps the long run at 16 miles and runs goal marathon pace on Thursday.",
    ],
  },
];

function plain(parts: Part[]): string {
  return parts.map((part) => (typeof part === "string" ? part : part.label)).join("");
}

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Compare plans",
              item: "https://anystride.com/compare",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Pfitz 18/55 vs Hansons Marathon Method",
              item: "https://anystride.com/compare/pfitz-18-55-vs-hansons",
            },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: plain(faq.answer) },
          })),
        }}
      />

      <nav aria-label="Breadcrumb">
        <Link href="/compare" className="action-link">
          Compare plans
        </Link>
      </nav>

      <h1 className="mt-6 text-4xl font-semibold tracking-tight">
        Pfitz 18/55 vs Hansons Marathon Method
      </h1>
      <p className="mt-5 text-lg leading-relaxed">
        Pick Hansons if you would rather run six days a week, cap the long run at 16 miles and practice goal marathon pace every Thursday. Pick Pfitz 18/55 if you can handle 20-mile long runs and midweek medium-long runs on five running days.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Anystride is independent. Anystride is not affiliated with or endorsed by Pete Pfitzinger, Scott Douglas, Human Kinetics, Luke Humphrey, Keith and Kevin Hanson, or Hansons Coaching Services.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Facts checked Nov 22, 2026 against the sources below.
      </p>

      <div className="mt-6 flex flex-wrap gap-6">
        <Link href="/calculator" className="action-primary">
          Get your training paces
        </Link>
        <Link href="/plans/pfitzinger-18-55" className="action-link">
          Pfitz 18/55 plan overview
        </Link>
        <Link href="/plans/hansons-marathon-method" className="action-link">
          Hansons Marathon Method overview
        </Link>
      </div>
      <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
        The calculator can{" "}
        <Link href="/calculator" className="font-medium text-brand underline underline-offset-2">
          set paces from a recent race
        </Link>
        . It is not a Pfitzinger chart or a Hansons chart.
      </p>

      <section className="mt-12" aria-labelledby="at-a-glance">
        <h2 id="at-a-glance" className="text-2xl font-semibold">
          How do Pfitz 18/55 and Hansons compare at a glance?
        </h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
          Pfitz 18/55 is 18 weeks, peaks at 55 miles, and takes the long run to 20 miles on five running days. Hansons is also 18 weeks. The free Beginner plan peaks at 57.5 miles and the Advanced plan at 61.5, with the long run capped at 16 miles.
        </p>
        <div className="mt-6 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <caption className="mb-3 text-left text-muted-foreground">
              Plan structure as of Nov 22, 2026. Source links are in the last column.
            </caption>
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-3 pr-4 font-medium">Plan</th>
                <th className="py-3 pr-4 font-medium">Length</th>
                <th className="py-3 pr-4 font-medium">Running days</th>
                <th className="py-3 pr-4 font-medium">Week 1 mileage</th>
                <th className="py-3 pr-4 font-medium">Peak week</th>
                <th className="py-3 pr-4 font-medium">Longest run</th>
                <th className="py-3 pr-4 font-medium">Signature workout</th>
                <th className="py-3 pr-4 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border align-top">
                <th className="py-4 pr-4 text-left font-semibold">Pfitz 18/55</th>
                <td className="py-4 pr-4">18 weeks</td>
                <td className="py-4 pr-4">5 in peak weeks. Monday is rest or cross-training.</td>
                <td className="py-4 pr-4">33 miles</td>
                <td className="py-4 pr-4">55 miles (week 11)</td>
                <td className="py-4 pr-4">20 miles</td>
                <td className="py-4 pr-4">Medium-long runs of 11-15 miles, usually midweek</td>
                <td className="py-4 pr-4">
                  <Ext href={PFITZ_BOOK}>Advanced Marathoning, 4th ed.</Ext>
                  {" · "}
                  <Ext href={PFITZ_CALENDAR}>Calendar Hack</Ext>
                </td>
              </tr>
              <tr className="border-b border-border align-top">
                <th className="py-4 pr-4 text-left font-semibold">Hansons Beginner</th>
                <td className="py-4 pr-4">18 weeks</td>
                <td className="py-4 pr-4">6 days a week from week 6</td>
                <td className="py-4 pr-4">12 miles</td>
                <td className="py-4 pr-4">57.5 miles (week 15)</td>
                <td className="py-4 pr-4">16 miles (weeks 11, 13, and 15)</td>
                <td className="py-4 pr-4">Thursday tempo at goal marathon pace</td>
                <td className="py-4 pr-4">
                  <Ext href={HANSONS_BEGINNER}>Beginner plan PDF</Ext>
                </td>
              </tr>
              <tr className="border-b border-border align-top">
                <th className="py-4 pr-4 text-left font-semibold">Hansons Advanced</th>
                <td className="py-4 pr-4">18 weeks</td>
                <td className="py-4 pr-4">6 days every week</td>
                <td className="py-4 pr-4">38 miles</td>
                <td className="py-4 pr-4">61.5 miles (week 15)</td>
                <td className="py-4 pr-4">16 miles (weeks 11, 13, and 15)</td>
                <td className="py-4 pr-4">Thursday tempo at goal marathon pace</td>
                <td className="py-4 pr-4">
                  <Ext href={HANSONS_ADVANCED}>Advanced plan PDF</Ext>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
          This page compares published structure. It does not reprint either week-by-week schedule.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="long-run">
        <h2 id="long-run" className="text-2xl font-semibold">
          Which plan has the longer long run?
        </h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
          Pfitz 18/55 has the longer long run, at 20 miles. Both Hansons plans cap the long run at 16 miles, in weeks 11, 13, and 15.
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
          The Hansons long run is 4 miles shorter than the Pfitz 18/55 long run. Pfitz also schedules a separate marathon-pace long run of up to 18 miles, with 14 miles at marathon pace. That session is not the 20-mile long run.
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
          The{" "}
          <Ext href={HANSONS_BOOK}>book preview</Ext>{" "}
          describes the Hansons long run on already-tired legs as simulating &quot;the last 16 miles of the marathon, not the first 16 miles.&quot; Read{" "}
          <Link href="/guides/hitting-the-wall-marathon" className="font-medium text-brand underline underline-offset-2">
            how runners describe hitting the wall
          </Link>{" "}
          for that late-race slowdown in plain language.
        </p>
        <Sources>
          <Ext href={PFITZ_BOOK}>Advanced Marathoning, 4th ed.</Ext>
          {" · "}
          <Ext href={PFITZ_CALENDAR}>Calendar Hack</Ext>
          {" · "}
          <Ext href={HANSONS_BEGINNER}>Beginner plan PDF</Ext>
          {" · "}
          <Ext href={HANSONS_ADVANCED}>Advanced plan PDF</Ext>
          {" · "}
          <Ext href={HANSONS_BOOK}>Book preview</Ext>
        </Sources>
      </section>

      <section className="mt-12" aria-labelledby="mileage">
        <h2 id="mileage" className="text-2xl font-semibold">
          Which plan needs more weekly mileage?
        </h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
          Hansons has the higher peak week. The Beginner plan peaks at 57.5 miles in week 15, and the Advanced plan peaks at 61.5 miles in week 15. Pfitz 18/55 peaks at 55 miles in week 11.
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
          The Hansons peak is higher even though the long run is 4 miles shorter. Pfitz 18/55 starts at 33 miles, so it assumes an existing base. The Beginner plan starts at 12 miles. The Advanced plan starts at 38 miles.
        </p>
        <Sources>
          <Ext href={PFITZ_BOOK}>Advanced Marathoning, 4th ed.</Ext>
          {" · "}
          <Ext href={PFITZ_CALENDAR}>Calendar Hack</Ext>
          {" · "}
          <Ext href={HANSONS_BEGINNER}>Beginner plan PDF</Ext>
          {" · "}
          <Ext href={HANSONS_ADVANCED}>Advanced plan PDF</Ext>
        </Sources>
      </section>

      <section className="mt-12" aria-labelledby="workouts">
        <h2 id="workouts" className="text-2xl font-semibold">
          What are the hard workouts in each plan?
        </h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
          Pfitz 18/55 uses lactate-threshold runs, medium-long runs, and a marathon-pace long run. Hansons uses three SOS days, meaning something of substance: Tuesday speed or strength, a Thursday tempo, and a Sunday long run.
        </p>
        <h3 className="mt-6 text-xl font-semibold">Pfitz 18/55</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
          <li>Lactate-threshold runs cover 4-7 miles at 15K to half-marathon race pace.</li>
          <li>Medium-long runs are 11-15 miles, usually midweek.</li>
          <li>One marathon-pace long run goes up to 18 miles, with 14 miles at marathon pace.</li>
          <li>In the race-preparation weeks, VO2max sessions run from 5 x 600 m to 5 x 1,000 m at 5K race pace.</li>
          <li>The final weeks include tune-up races.</li>
          <li>The plan uses a 3-week taper.</li>
        </ul>
        <h3 className="mt-6 text-xl font-semibold">Hansons Marathon Method</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
          <li>Tuesday starts as speed work at 5K-10K pace.</li>
          <li>From week 11, Tuesday switches to longer strength repeats at marathon pace minus 10 seconds per mile.</li>
          <li>Thursday is a tempo at goal marathon pace.</li>
          <li>On the Beginner plan that tempo is 5 miles in week 6 and 9 miles by week 12.</li>
          <li>On the Advanced plan the tempo rises from 6 miles to 10 miles.</li>
          <li>Sunday is the long run, capped at 16 miles.</li>
        </ul>
        <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">
          The book calls the tired-legs pattern cumulative fatigue. See{" "}
          <Link href="/guides/what-is-a-tempo-run" className="font-medium text-brand underline underline-offset-2">
            what a tempo run means
          </Link>{" "}
          before you treat a lactate-threshold run and a goal-marathon-pace tempo as the same session. Pfitz 18/55 includes a 3-week taper. See{" "}
          <Link href="/guides/marathon-taper" className="font-medium text-brand underline underline-offset-2">
            how a marathon taper works
          </Link>{" "}
          before you shorten that block on your own.
        </p>
        <Sources>
          <Ext href={PFITZ_BOOK}>Advanced Marathoning, 4th ed.</Ext>
          {" · "}
          <Ext href={PFITZ_CALENDAR}>Calendar Hack</Ext>
          {" · "}
          <Ext href={HANSONS_BEGINNER}>Beginner plan PDF</Ext>
          {" · "}
          <Ext href={HANSONS_ADVANCED}>Advanced plan PDF</Ext>
          {" · "}
          <Ext href={HANSONS_BOOK}>Book preview</Ext>
        </Sources>
      </section>

      <section className="mt-12" aria-labelledby="hansons-better">
        <h2 id="hansons-better" className="text-2xl font-semibold">
          Where is Hansons the better choice?
        </h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
          Hansons is the better choice when you want six running days, a 16-mile long-run cap, and Thursday practice at goal marathon pace.
        </p>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-muted-foreground">
          <li>
            You want six running days. The Beginner plan has six running days a week from week 6. The Advanced plan has six running days every week. Pfitz peak weeks have five running days, and Monday is rest or cross-training.
          </li>
          <li>
            You want the long run capped at 16 miles. Both Hansons plans do that. Pfitz 18/55 goes to 20 miles.
          </li>
          <li>
            You want goal marathon pace every Thursday. Beginner tempos are 5 miles in week 6 and 9 miles by week 12. Advanced tempos rise from 6 miles to 10 miles.
          </li>
          <li>
            Week 1 of the Beginner plan is 12 miles, below the 33-mile first week of Pfitz 18/55. The Advanced plan starts at 38 miles, so it is not the lower-mileage option.
          </li>
        </ul>
        <Sources>
          <Ext href={HANSONS_BEGINNER}>Beginner plan PDF</Ext>
          {" · "}
          <Ext href={HANSONS_ADVANCED}>Advanced plan PDF</Ext>
          {" · "}
          <Ext href={PFITZ_BOOK}>Advanced Marathoning, 4th ed.</Ext>
          {" · "}
          <Ext href={PFITZ_CALENDAR}>Calendar Hack</Ext>
        </Sources>
      </section>

      <section className="mt-12" aria-labelledby="pfitz-better">
        <h2 id="pfitz-better" className="text-2xl font-semibold">
          Where is Pfitz 18/55 the better choice?
        </h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
          Pfitz 18/55 is the better choice when you can handle a 20-mile long run and midweek medium-long runs on five running days.
        </p>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-muted-foreground">
          <li>
            You can handle a 20-mile long run. That is 4 miles longer than the Hansons cap of 16 miles.
          </li>
          <li>
            You want medium-long runs of 11-15 miles, usually midweek, along with the long run.
          </li>
          <li>
            You want five running days in peak weeks, with Monday as rest or cross-training.
          </li>
          <li>
            You want a marathon-pace long run of up to 18 miles, with 14 miles at marathon pace.
          </li>
          <li>
            You want VO2max sessions from 5 x 600 m to 5 x 1,000 m at 5K race pace in the race-preparation weeks. You also want tune-up races in the final weeks, and a 3-week taper.
          </li>
        </ul>
        <Sources>
          <Ext href={PFITZ_BOOK}>Advanced Marathoning, 4th ed.</Ext>
          {" · "}
          <Ext href={PFITZ_CALENDAR}>Calendar Hack</Ext>
          {" · "}
          <Ext href={HANSONS_BEGINNER}>Beginner plan PDF</Ext>
          {" · "}
          <Ext href={HANSONS_ADVANCED}>Advanced plan PDF</Ext>
        </Sources>
      </section>

      <section className="mt-12" aria-labelledby="neither">
        <h2 id="neither" className="text-2xl font-semibold">
          What if neither plan fits?
        </h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
          A first marathon, or a week that should stay lower than these plans, points somewhere else. Read the{" "}
          <Link href="/plans/higdon-marathon-novice-1" className="font-medium text-brand underline underline-offset-2">
            Hal Higdon Marathon Novice 1 overview
          </Link>
          . Use the{" "}
          <Link href="/#plan-finder" className="font-medium text-brand underline underline-offset-2">
            plan finder
          </Link>{" "}
          to match a plan to the days you can run. Browse{" "}
          <Link href="/training-plans/marathon" className="font-medium text-brand underline underline-offset-2">
            marathon plans
          </Link>{" "}
          for the full list on Anystride.
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
          If you want a person to review the choice, see{" "}
          <Link href="/coaching/focus/marathon" className="font-medium text-brand underline underline-offset-2">
            marathon coaches
          </Link>{" "}
          or the{" "}
          <Link href="/coaches" className="font-medium text-brand underline underline-offset-2">
            coach directory
          </Link>
          . This page does not promise a race result from hiring a coach.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="faq">
        <h2 id="faq" className="text-2xl font-semibold">
          Frequently asked questions
        </h2>
        <div className="mt-4 divide-y divide-border border-y border-border">
          {faqs.map((faq) => (
            <div key={faq.question} className="py-4">
              <h3 className="text-base font-semibold">{faq.question}</h3>
              <p className="mt-2 max-w-3xl leading-relaxed text-muted-foreground">
                <Copy parts={faq.answer} />
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="sources">
        <h2 id="sources" className="text-2xl font-semibold">
          Sources checked Nov 22, 2026
        </h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
          Every mileage figure above comes from one of these pages, checked Nov 22, 2026.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <li>
            <Ext href={PFITZ_BOOK}>Pfitzinger and Douglas, Advanced Marathoning, 4th ed. (Human Kinetics)</Ext>
          </li>
          <li>
            <Ext href={PFITZ_CALENDAR}>Calendar Hack: the book&apos;s Pfitz 18/55 schedule in miles</Ext>
          </li>
          <li>
            <Ext href={HANSONS_BEGINNER}>Hansons Coaching Services free Beginner marathon plan (PDF)</Ext>
          </li>
          <li>
            <Ext href={HANSONS_ADVANCED}>Hansons Coaching Services free Advanced marathon plan (PDF)</Ext>
          </li>
          <li>
            <Ext href={HANSONS_BOOK}>Hansons Marathon Method, 2nd ed., book preview (Luke Humphrey with Keith and Kevin Hanson)</Ext>
          </li>
        </ul>
      </section>
    </div>
  );
}

function Sources({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-sm text-muted-foreground">Sources, checked Nov 22, 2026: {children}</p>;
}

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function Copy({ parts }: { parts: Part[] }) {
  return parts.map((part, index) =>
    typeof part === "string" ? (
      <span key={index}>{part}</span>
    ) : part.href.startsWith("/") ? (
      <Link key={index} href={part.href} className="font-medium text-brand underline underline-offset-2">
        {part.label}
      </Link>
    ) : (
      <a
        key={index}
        href={part.href}
        className="font-medium text-brand underline underline-offset-2"
        target="_blank"
        rel="noopener noreferrer"
      >
        {part.label}
      </a>
    ),
  );
}
