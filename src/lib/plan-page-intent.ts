import type { Distance, TrainingPlan } from "@/data/types";
import { getAllPlans, getPlanBySlug } from "@/lib/plans";

/**
 * On-page search intent for /plans/[slug].
 * Titles and meta descriptions stay in plan-page-metadata.ts and are not set here.
 * Every number in this copy comes from the plan record (weeks, volume, outline, source).
 */

export type TextPart = string | { href: string; label: string };

export interface PlanIntentDetail {
  heading: string;
  answer: TextPart[];
}

export interface PlanIntentSection {
  id: string;
  heading: string;
  answer: TextPart[];
  details?: PlanIntentDetail[];
  sources?: TextPart[];
}

export interface PlanFaq {
  question: string;
  answer: TextPart[];
}

export interface PlanPageCopy {
  heading: string;
  affiliation: TextPart[];
  sections: PlanIntentSection[];
  structure?: { heading: string; answer: TextPart[] };
  schedule?: { heading: string; intro: string };
  faqs: PlanFaq[];
}

const SEARCH_HEADINGS: Record<string, string> = {
  "pfitzinger-18-55": "Pfitz 18/55 Marathon Plan",
  "higdon-marathon-novice-1": "Hal Higdon Marathon Novice 1 Plan",
  "hansons-marathon-method": "Hansons Marathon Method Plan",
  "bridge-to-10k": "Bridge to 10K Plan",
  "couch-to-5k": "Couch to 5K Plan",
};

const QUESTION_NAMES: Record<string, string> = {
  "pfitzinger-18-55": "Pfitz 18/55",
  "higdon-marathon-novice-1": "Hal Higdon Marathon Novice 1",
  "hansons-marathon-method": "Hansons Marathon Method",
  "bridge-to-10k": "Bridge to 10K",
  "couch-to-5k": "Couch to 5K",
};

const RELATED_SLUGS: Record<string, string[]> = {
  "pfitzinger-18-55": ["higdon-marathon-novice-1", "hansons-marathon-method"],
  "higdon-marathon-novice-1": ["pfitzinger-18-55", "hansons-marathon-method"],
  "hansons-marathon-method": ["pfitzinger-18-55", "higdon-marathon-novice-1"],
  "bridge-to-10k": ["couch-to-5k", "higdon-10k-intermediate"],
  "couch-to-5k": ["bridge-to-10k", "base-building-4-week"],
};

const DISTANCE_PROSE: Record<Distance, string> = {
  "5k": "5K",
  "10k": "10K",
  "half-marathon": "half marathon",
  marathon: "marathon",
  ultra: "ultra",
};

export function planPageHeading(plan: Pick<TrainingPlan, "slug" | "name">): string {
  return SEARCH_HEADINGS[plan.slug] ?? plan.name;
}

export function faqPlainText(parts: TextPart[]): string {
  return parts.map((part) => (typeof part === "string" ? part : part.label)).join("");
}

export function faqPageSchema(faqs: PlanFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faqPlainText(faq.answer) },
    })),
  };
}

export function planPageFaqs(copy: PlanPageCopy): PlanFaq[] {
  const extras: PlanFaq[] = [];
  for (const section of copy.sections) {
    if (!section.details?.length) continue;
    extras.push({ question: section.heading, answer: section.answer });
    for (const detail of section.details) {
      extras.push({ question: detail.heading, answer: detail.answer });
    }
  }
  return [...copy.faqs, ...extras];
}

export function planPageCopy(plan: TrainingPlan): PlanPageCopy {
  const questionName = QUESTION_NAMES[plan.slug] ?? plan.name;
  return {
    heading: planPageHeading(plan),
    affiliation: affiliation(plan),
    sections: sections(plan, questionName),
    ...(plan.kind === "explainer"
      ? { structure: structureCopy(plan, questionName) }
      : { schedule: scheduleCopy(plan, questionName) }),
    faqs: faqs(plan),
  };
}

function link(href: string, label: string): TextPart {
  return { href, label };
}

function article(word: string): "a" | "an" {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

function joinList(items: string[]): string {
  const normalized = items.map((item) => item.charAt(0).toLowerCase() + item.slice(1));
  if (normalized.length <= 1) return normalized[0] ?? "";
  if (normalized.length === 2) return `${normalized[0]} and ${normalized[1]}`;
  return `${normalized.slice(0, -1).join(", ")}, and ${normalized[normalized.length - 1]}`;
}

function scheduleIsTimed(plan: TrainingPlan): boolean {
  if (plan.kind !== "full" || !plan.weeks) return false;
  return !plan.weeks.some((week) =>
    week.days.some((day) => /\d+(\.\d+)?\s*mi\b/i.test(day.label)),
  );
}

function relatedPlans(plan: TrainingPlan): TrainingPlan[] {
  const preferred = RELATED_SLUGS[plan.slug];
  const slugs = preferred ?? getAllPlans()
    .filter((candidate) => candidate.distance === plan.distance && candidate.slug !== plan.slug)
    .map((candidate) => candidate.slug)
    .slice(0, 2);
  return slugs.flatMap((slug) => {
    const related = getPlanBySlug(slug);
    return related ? [related] : [];
  });
}

function coachLink(plan: TrainingPlan): TextPart {
  if (plan.distance === "half-marathon") {
    return link("/coaching/focus/half-marathon", "half marathon coaches");
  }
  if (plan.distance === "marathon") return link("/coaching/focus/marathon", "marathon coaches");
  if (plan.level === "beginner") return link("/coaching/focus/beginners", "coaches who work with new runners");
  return link("/coaches", "running coaches");
}

function distanceHub(distance: Distance): TextPart {
  return link(`/training-plans/${distance}`, `${DISTANCE_PROSE[distance]} plans`);
}

function sourceLink(plan: TrainingPlan): TextPart {
  return link(plan.source.url, plan.source.name);
}

function affiliation(plan: TrainingPlan): TextPart[] {
  const source = sourceLink(plan);
  switch (plan.slug) {
    case "pfitzinger-18-55":
      return [
        "Anystride is independent and is not affiliated with Pete Pfitzinger or Human Kinetics. The original source is ",
        source,
        ".",
      ];
    case "higdon-marathon-novice-1":
      return [
        "Anystride is independent and is not affiliated with Hal Higdon. The original plan is at ",
        source,
        ".",
      ];
    case "hansons-marathon-method":
      return [
        "Anystride is independent and is not affiliated with the Hansons or Luke Humphrey Running. The source linked here is ",
        source,
        ".",
      ];
    case "couch-to-5k":
      return [
        "Anystride is independent and is not affiliated with the NHS or Cool Running. The source named for this schedule is ",
        source,
        ".",
      ];
    case "bridge-to-10k":
      return [
        "Anystride is independent and is not affiliated with a named author for this schedule. It is a community-style easy, long, and tempo build. The source noted here is ",
        source,
        ".",
      ];
    default:
      return [
        "Anystride is independent and is not affiliated with ",
        source,
        ".",
      ];
  }
}

function volumeSentence(plan: TrainingPlan): string {
  const { start, peak } = plan.weeklyVolume;
  return `The plan records weekly volume of ${start} miles at the start and ${peak} miles at the peak.`;
}

function sections(plan: TrainingPlan, questionName: string): PlanIntentSection[] {
  const custom = customSections(plan, questionName);
  if (custom) return custom;

  const who = `${plan.name} is ${article(plan.level)} ${plan.level} ${DISTANCE_PROSE[plan.distance]} plan. The listed starting point is: ${plan.prerequisite}. It is listed for ${joinList(plan.bestFor)}.`;
  const duration = `${plan.name} is ${plan.durationWeeks} weeks, with ${plan.daysPerWeek} training days a week and about ${plan.timePerWeek} of training.`;
  const volume = scheduleIsTimed(plan)
    ? `The schedule is written in minutes, not miles. ${volumeSentence(plan)} The biggest session listed is ${plan.peakWorkout}.`
    : `${volumeSentence(plan)} The biggest session listed is ${plan.peakWorkout}.`;

  return [
    { id: "who", heading: `Who is the ${questionName} plan for?`, answer: [who] },
    { id: "duration", heading: `How long is the ${questionName} plan?`, answer: [duration] },
    { id: "volume", heading: `How many miles a week does the ${questionName} plan peak at?`, answer: [volume] },
    {
      id: "paces",
      heading: `What paces should I run on the ${questionName} plan?`,
      answer: [
        "This page does not assign numeric paces. The ",
        link("/calculator", "pace calculator"),
        " estimates training paces from a recent race result.",
      ],
    },
    {
      id: "start",
      heading: `When should I start the ${questionName} plan for a race?`,
      answer: [
        `${plan.name} is ${plan.durationWeeks} weeks, so count back ${plan.durationWeeks} weeks from race day to start week 1. The `,
        link("/#plan-finder", "plan finder"),
        ` can compare it with other ${DISTANCE_PROSE[plan.distance]} plans if this workload does not fit.`,
      ],
    },
  ];
}

function customSections(plan: TrainingPlan, name: string): PlanIntentSection[] | null {
  switch (plan.slug) {
    case "pfitzinger-18-55":
      return [
        {
          id: "who",
          heading: `Who is the ${name} plan for?`,
          answer: [
            "Pfitz 18/55 is an advanced marathon plan for runners already running 30+ miles a week with a 10+ mile long run. It is listed for experienced marathoners chasing a big PR or BQ, runners who want structure and mileage, and people with time for five running days and midweek longer runs. The ",
            link("/guides/how-to-choose-a-training-plan", "guide to choosing a training plan"),
            " walks through whether that starting mileage and five-day week fit.",
          ],
        },
        {
          id: "duration",
          heading: `How long is the ${name} plan?`,
          answer: [
            "Pfitz 18/55 is 18 weeks, with five running days a week and about 6–9 hours of training. The outline includes a structured 3-week taper inside those 18 weeks.",
          ],
        },
        {
          id: "volume",
          heading: `How many miles a week does the ${name} plan peak at?`,
          answer: [
            "Pfitz 18/55 peaks at 55 miles (89 km) a week. The plan records weekly volume of 33 miles at the start and 55 miles at the peak, and the longest run listed is 20 miles.",
          ],
        },
        {
          id: "paces",
          heading: `What paces should I run on the ${name} plan?`,
          answer: [
            "The overview describes lactate-threshold runs at about 15K to half-marathon effort and long runs at a controlled effort. It does not list numeric paces. The ",
            link("/calculator", "pace calculator"),
            " estimates paces from a recent race result.",
          ],
        },
        {
          id: "start",
          heading: `When should I start the ${name} plan for my race?`,
          answer: [
            "Count back 18 weeks from marathon day to start week 1. The 3-week taper sits inside those 18 weeks, not after them. If the mileage does not fit, compare ",
            link("/training-plans/marathon", "other marathon plans"),
            " or use the ",
            link("/#plan-finder", "plan finder"),
            ".",
          ],
        },
      ];
    case "higdon-marathon-novice-1":
      return [
        {
          id: "who",
          heading: `Who is the ${name} plan for?`,
          answer: [
            "Hal Higdon Marathon Novice 1 is a beginner marathon plan. The listed starting point is being able to run 3–6 miles comfortably. It is listed for a first marathon, runners who want to finish rather than race a time, and people training four days a week.",
          ],
        },
        {
          id: "duration",
          heading: `How long is the ${name} plan?`,
          answer: [
            "Hal Higdon Marathon Novice 1 is 18 weeks, with 4 running days a week and about 4–6 hours of training. The outline also includes cross-training, two rest days, step-back weeks, and a 3-week taper.",
          ],
        },
        {
          id: "volume",
          heading: `How many miles a week does the ${name} plan peak at?`,
          answer: [
            "The plan records weekly volume of 15 miles at the start and 40 miles at the peak. Weekday runs are described as 3–5 miles, and the long run builds to 20 miles.",
          ],
        },
        {
          id: "paces",
          heading: `What paces should I run on the ${name} plan?`,
          answer: [
            "Novice 1 is described as finish-focused, with no speedwork and no time-goal sessions, so this page does not list numeric paces. The ",
            link("/calculator", "pace calculator"),
            " can still estimate easy paces from a recent race result.",
          ],
        },
        {
          id: "start",
          heading: `When should I start the ${name} plan for my race?`,
          answer: [
            "Count back 18 weeks from marathon day. The 3-week taper is part of those 18 weeks. If four runs a week does not fit, use the ",
            link("/#plan-finder", "plan finder"),
            " to compare ",
            link("/training-plans/marathon", "other marathon plans"),
            ".",
          ],
        },
      ];
    case "hansons-marathon-method":
      return [
        {
          id: "who",
          heading: `Who is the ${name} plan for?`,
          answer: [
            "The Hansons Marathon Method is an intermediate marathon plan. Luke Humphrey suggests building to about 20 miles a week before the Beginner plan, which starts at 12 miles in week 1. It is listed for runners who improve with frequency, want a specific pace goal, and can run often instead of relying on a 20-mile long run.",
          ],
        },
        {
          id: "first-marathon",
          heading: "Is the Hansons Marathon Method good for a first marathon?",
          answer: [
            "It can be, if you already run regularly. Luke Humphrey, co-author of the Hansons method, says the Beginner plan is not for brand-new runners and suggests building to about 20 comfortable miles a week first. He says to add running days before volume over about four to six weeks, and that a typical Beginner plan runner has run about 15 to 30 miles a week.",
          ],
          details: [
            {
              heading: "Is a 16-mile long run enough for a first marathon?",
              answer: [
                "Both free Hansons plans cap the long run at 16 miles by design, and the free Beginner plan schedules three of them in weeks 11, 13, and 15. The method relies on six running days a week so the long run comes on tired legs (cumulative fatigue).",
              ],
            },
            {
              heading: "How much time does the Hansons Marathon Method take each week?",
              answer: [
                "The Beginner plan builds from 12 miles in week 1 to 24 miles in week 5 on four to five running days. From week 6 it runs six days (40 miles) and peaks at 57.5 miles in week 15; Advanced runs six days from week 1 (38 miles) to a 61.5-mile peak.",
              ],
            },
            {
              heading: "Do I need the Hansons book, or are the free plans enough?",
              answer: [
                "Hansons Coaching Services publishes the free ",
                link(
                  "https://s3.us-central-1.wasabisys.com/hansons/Beginner_Marathon_-_new.pdf",
                  "Beginner schedule",
                ),
                " and the free ",
                link(
                  "https://s3.us-central-1.wasabisys.com/hansons/Advanced_Marathon_-_new.pdf",
                  "Advanced schedule",
                ),
                " as PDFs, and each PDF includes a pace key. The book Hansons Marathon Method explains the training philosophy and is sold separately by Luke Humphrey and book retailers.",
              ],
            },
          ],
          sources: [
            "Sources checked Nov 23, 2026. Guidance from Luke Humphrey is in the Oct 20, 2025 podcast ",
            link(
              "https://lukehumphreyrunning.com/lhr-podcast-approaching-the-hansons-marathon-method-beginning-marathon-plan/",
              "Approaching the Hansons Marathon Method Beginning Marathon Plan",
            ),
            ". Weekly miles are from the ",
            link(
              "https://s3.us-central-1.wasabisys.com/hansons/Beginner_Marathon_-_new.pdf",
              "Beginner marathon PDF",
            ),
            " and the ",
            link(
              "https://s3.us-central-1.wasabisys.com/hansons/Advanced_Marathon_-_new.pdf",
              "Advanced marathon PDF",
            ),
            ".",
          ],
        },
        {
          id: "duration",
          heading: `How long is the ${name} plan?`,
          answer: [
            "The Hansons Marathon Method is 18 weeks, and listed training time is about 6-8 hours. The Beginner plan has 6 running days a week from week 6. The Advanced plan has 6 running days every week.",
          ],
        },
        {
          id: "volume",
          heading: `How many miles a week does the ${name} plan peak at?`,
          answer: [
            "The free ",
            link(
              "https://s3.us-central-1.wasabisys.com/hansons/Beginner_Marathon_-_new.pdf",
              "Hansons Beginner plan",
            ),
            " records 12 miles in week 1 and a peak of 57.5 miles. The free ",
            link(
              "https://s3.us-central-1.wasabisys.com/hansons/Advanced_Marathon_-_new.pdf",
              "Hansons Advanced plan",
            ),
            " peaks at 61.5 miles, and its tempo runs rise from 6 miles to 10 miles. Both plans cap the long run at 16 miles.",
          ],
        },
        {
          id: "paces",
          heading: `What paces should I run on the ${name} plan?`,
          answer: [
            "Tempo runs are described at goal marathon pace. This page does not include a Hansons pace chart or other numeric pace tables. The ",
            link("/calculator", "pace calculator"),
            " estimates paces from a recent race result, and those estimates are not a Hansons chart.",
          ],
        },
        {
          id: "start",
          heading: `When should I start the ${name} plan for my race?`,
          answer: [
            "Count back 18 weeks from marathon day to start week 1. This overview does not list a separate taper length. If six running days does not fit, compare ",
            link("/training-plans/marathon", "other marathon plans"),
            " or use the ",
            link("/#plan-finder", "plan finder"),
            ".",
          ],
        },
      ];
    case "bridge-to-10k":
      return [
        {
          id: "who",
          heading: `Who is the ${name} plan for?`,
          answer: [
            "The Bridge to 10K plan is an intermediate 10K plan for runners who can already run a 5K comfortably. It is listed for 5K runners moving up, a first taste of tempo work, and a first 10K race.",
          ],
        },
        {
          id: "duration",
          heading: `How long is the ${name} plan?`,
          answer: [
            "The Bridge to 10K plan is 6 weeks, with 4 training days a week and about 2.5–3.5 hours of training. Week 6 is labeled taper and race.",
          ],
        },
        {
          id: "volume",
          heading: `How many miles a week does the ${name} plan peak at?`,
          answer: [
            "The plan records weekly volume of 12 miles at the start and 18 miles at the peak. The long run builds from 4 miles in week 1 to 6 miles in week 5.",
          ],
        },
        {
          id: "paces",
          heading: `What paces should I run on the ${name} plan?`,
          answer: [
            "Tempo sessions are described as comfortably hard, with easy running and a long run kept conversational. The schedule does not list numeric paces. The ",
            link("/calculator", "pace calculator"),
            " estimates them from a recent race result.",
          ],
        },
        {
          id: "start",
          heading: `When should I start the ${name} plan for my race?`,
          answer: [
            "Start 6 weeks before the 10K so week 6, which includes the race, lands on race week. Set that date in the schedule on this page.",
          ],
        },
      ];
    case "couch-to-5k":
      return [
        {
          id: "who",
          heading: `Who is the ${name} plan for?`,
          answer: [
            "Couch to 5K is a beginner plan for new runners and people returning after a long break. The listed starting point is being able to walk briskly for 30 minutes. It builds running time with walk/run intervals and does not promise a set distance.",
          ],
        },
        {
          id: "duration",
          heading: `How long is the ${name} plan?`,
          answer: [
            "Couch to 5K is 9 weeks, with 3 sessions a week and about 1.5–2 hours of training. Early walk/run sessions include a 5-minute brisk-walk warmup and a 5-minute walk cooldown.",
          ],
        },
        {
          id: "volume",
          heading: `How many miles a week does the ${name} plan peak at?`,
          answer: [
            "The schedule is written in minutes, not miles. It builds to a 30-minute continuous run. The plan records weekly volume of 5 miles at the start and 10 miles at the peak, which is the figure used to match plans.",
          ],
        },
        {
          id: "paces",
          heading: `What paces should I run on the ${name} plan?`,
          answer: [
            "Sessions are prescribed by time and effort, not by a pace chart. Keep the jogging easy enough to finish the interval. The ",
            link("/calculator", "pace calculator"),
            " can estimate paces from a recent result once you have one.",
          ],
        },
        {
          id: "start",
          heading: `When should I start the ${name} plan for my race?`,
          answer: [
            "The plan is 9 weeks. If you have a date in mind, count back 9 weeks so week 9 lines up with it. Week 9 includes a session labeled 30 min / 5K; the distance covered still depends on pace.",
          ],
        },
      ];
    default:
      return null;
  }
}

function structureCopy(plan: TrainingPlan, questionName: string): { heading: string; answer: TextPart[] } {
  const heading = `How is the ${questionName} plan structured?`;
  switch (plan.slug) {
    case "pfitzinger-18-55":
      return {
        heading,
        answer: [
          "This page summarizes the plan and does not reproduce the book's week-by-week schedule. The outline below lists five running days, lactate-threshold runs of 4–7 miles, midweek medium-long runs of 11–15 miles, VO2max intervals, long runs of 20 miles, and a 3-week taper.",
        ],
      };
    case "higdon-marathon-novice-1":
      return {
        heading,
        answer: [
          "This page is an overview, not a copy of the week-by-week schedule. The outline lists four running days, weekday runs of 3–5 miles, a weekend long run, three 20-mile long runs in the back half, step-back weeks, and a 3-week taper.",
        ],
      };
    case "hansons-marathon-method":
      return {
        heading,
        answer: [
          "This page summarizes the method and does not reproduce a week-by-week schedule. The outline lists speed, strength, tempo, and long-run days, cumulative fatigue, and a 16-mile long-run cap. Beginner tempo runs are 5 miles in week 6 and reach 9 miles by week 12, and Advanced tempo runs rise from 6 miles to 10 miles.",
        ],
      };
    default:
      return {
        heading,
        answer: [
          `This page summarizes ${plan.name} and does not reproduce a week-by-week schedule. The outline below is the structure stored with the plan. The original source is `,
          sourceLink(plan),
          ".",
        ],
      };
  }
}

function scheduleCopy(plan: TrainingPlan, questionName: string): { heading: string; intro: string } {
  const heading = `What does the ${questionName} week-by-week schedule include?`;
  switch (plan.slug) {
    case "bridge-to-10k":
      return {
        heading,
        intro:
          "The schedule below is the full 6-week plan: easy runs, one tempo, and a long run in weeks 1–5, then week 6 labeled taper and race, including the 10K. You can set a start date, print it, or download a calendar. No account is required.",
      };
    case "couch-to-5k":
      return {
        heading,
        intro:
          "The schedule below is the full 9-week plan, from 60-second jogs in week 1 to 30-minute continuous runs in week 9. You can set a start date, print it, or download a calendar. No account is required.",
      };
    default:
      return {
        heading,
        intro: scheduleIsTimed(plan)
          ? `The schedule below is the full ${plan.durationWeeks}-week plan. Sessions are written in time rather than miles. You can set a start date on this page. No account is required.`
          : `The schedule below is the full ${plan.durationWeeks}-week plan, with ${plan.daysPerWeek} training days in a typical week. You can set a start date, print it, or download a calendar. No account is required.`,
      };
  }
}

function faqs(plan: TrainingPlan): PlanFaq[] {
  switch (plan.slug) {
    case "pfitzinger-18-55":
      return pfitzFaqs(plan);
    case "higdon-marathon-novice-1":
      return higdonFaqs(plan);
    case "hansons-marathon-method":
      return hansonsFaqs(plan);
    case "bridge-to-10k":
      return bridgeFaqs(plan);
    case "couch-to-5k":
      return couchFaqs(plan);
    default:
      return genericFaqs(plan);
  }
}

function pfitzFaqs(plan: TrainingPlan): PlanFaq[] {
  return [
    {
      question: "Is Pfitz 18/55 the same as the Pfitzinger 18/55 plan?",
      answer: [
        "Yes. On this page, Pfitz 18/55 and Pfitzinger 18/55 name the same 18-week marathon plan, peaking at 55 miles a week. The original source is ",
        sourceLink(plan),
        ".",
      ],
    },
    {
      question: "What workouts does the Pfitz 18/55 overview include?",
      answer: [
        "The outline describes lactate-threshold runs of 4–7 miles at about 15K to half-marathon effort, midweek medium-long runs of 11–15 miles, VO2max intervals in the sharpening phase, and long runs of 20 miles. This page does not list each day of the book.",
      ],
    },
    {
      question: "Does this page include the full Pfitz 18/55 schedule?",
      answer: [
        "No. This is an overview and does not reproduce the book's week-by-week schedule. Use the ",
        sourceLink(plan),
        " link for the original plan.",
      ],
    },
    {
      question: "What mileage do I need before starting Pfitz 18/55?",
      answer: [
        "The listed starting point is already running 30+ miles a week with a 10+ mile long run. The plan records 33 miles in the starting week. If that is more than you run now, compare ",
        link("/plans/higdon-marathon-novice-1", "Hal Higdon Marathon Novice 1"),
        " or the ",
        link("/plans/hansons-marathon-method", "Hansons Marathon Method"),
        ", or use the ",
        link("/#plan-finder", "plan finder"),
        ". If you want help deciding, see ",
        coachLink(plan),
        ".",
      ],
    },
    {
      question: "What paces does this Pfitz 18/55 page give me?",
      answer: [
        "It describes effort, not a pace chart: threshold work at about 15K to half-marathon effort, and long runs at a controlled effort. The ",
        link("/calculator", "pace calculator"),
        " estimates numeric paces from a recent race result.",
      ],
    },
    {
      question: "Is Anystride affiliated with Pete Pfitzinger?",
      answer: [
        "No. Anystride is independent and is not affiliated with Pete Pfitzinger or Human Kinetics. This page is an overview with a link to the book, not an endorsement.",
      ],
    },
  ];
}

function higdonFaqs(plan: TrainingPlan): PlanFaq[] {
  return [
    {
      question: "Is Hal Higdon Marathon Novice 1 for beginners?",
      answer: [
        "Yes. It is listed as a beginner marathon plan for a first marathon. The starting point is being able to run 3–6 miles comfortably, on 4 running days a week.",
      ],
    },
    {
      question: "Does Hal Higdon Novice 1 include speedwork?",
      answer: [
        "No. The plan is described as finish-focused, with no speedwork, and it is not built for a time goal. It does not prescribe numeric paces. The ",
        link("/calculator", "pace calculator"),
        " can estimate easy paces separately.",
      ],
    },
    {
      question: "How many 20-mile runs are in Hal Higdon Novice 1?",
      answer: [
        "The outline lists three 20-mile long runs in the back half. The peak workout is a 20-mile long run.",
      ],
    },
    {
      question: "Where is the original Hal Higdon Marathon Novice 1 schedule?",
      answer: [
        "The week-by-week schedule is not reproduced here. The original plan is at ",
        sourceLink(plan),
        ".",
      ],
    },
    {
      question: "How does Novice 1 compare with Pfitz 18/55 or Hansons?",
      answer: [
        "Novice 1 is 18 weeks and 4 running days, and it records a peak of 40 miles, for beginners. ",
        link("/plans/pfitzinger-18-55", "Pfitz 18/55"),
        " peaks at 55 miles on 5 days and records 33 miles in its first week. The ",
        link("/plans/hansons-marathon-method", "Hansons Marathon Method"),
        " uses 6 running days and caps the long run at 16 miles. The free ",
        link(
          "https://s3.us-central-1.wasabisys.com/hansons/Beginner_Marathon_-_new.pdf",
          "Hansons Beginner plan",
        ),
        " peaks at 57.5 miles, and the free ",
        link(
          "https://s3.us-central-1.wasabisys.com/hansons/Advanced_Marathon_-_new.pdf",
          "Hansons Advanced plan",
        ),
        " peaks at 61.5 miles. The ",
        link("/#plan-finder", "plan finder"),
        " matches a plan to your mileage and days.",
      ],
    },
    {
      question: "Is Anystride affiliated with Hal Higdon?",
      answer: [
        "No. Anystride is independent and is not affiliated with Hal Higdon. The page summarizes the plan and links to the original. See ",
        coachLink(plan),
        " if you want coaching, which is separate from this plan.",
      ],
    },
  ];
}

function hansonsFaqs(plan: TrainingPlan): PlanFaq[] {
  return [
    {
      question: "Why does the Hansons Marathon Method cap the long run at 16 miles?",
      answer: [
        "The long run is capped at 16 miles by design. The page describes cumulative fatigue from six runs a week, with the long run done on tired legs, instead of one longer long run.",
      ],
    },
    {
      question: "How many days a week is the Hansons Marathon Method?",
      answer: [
        "The Beginner plan has 6 running days a week from week 6. The Advanced plan has 6 running days every week. Listed training time is about 6-8 hours, and the outline lists speed, strength, tempo, and long-run days.",
      ],
    },
    {
      question: "Does this page include a Hansons Marathon Method pace chart?",
      answer: [
        "No. This overview has no pace chart. Beginner tempos at goal marathon pace are 5 miles in week 6 and reach 9 miles by week 12, and Advanced tempos rise from 6 miles to 10 miles. The ",
        link("/calculator", "pace calculator"),
        " estimates paces from a recent race result, and it is not a Hansons chart.",
      ],
    },
    {
      question: "What mileage do I need to start the Hansons Marathon Method?",
      answer: [
        "Luke Humphrey suggests building to about 20 miles a week before the Beginner plan. The free ",
        link(
          "https://s3.us-central-1.wasabisys.com/hansons/Beginner_Marathon_-_new.pdf",
          "Hansons Beginner plan",
        ),
        " records 12 miles in week 1 and a peak of 57.5 miles. The free ",
        link(
          "https://s3.us-central-1.wasabisys.com/hansons/Advanced_Marathon_-_new.pdf",
          "Hansons Advanced plan",
        ),
        " peaks at 61.5 miles. If six days a week does not fit, compare ",
        link("/plans/pfitzinger-18-55", "Pfitz 18/55"),
        " or ",
        link("/plans/higdon-marathon-novice-1", "Hal Higdon Marathon Novice 1"),
        ", or use the ",
        link("/#plan-finder", "plan finder"),
        ".",
      ],
    },
    {
      question: "Where is the original Hansons Marathon Method?",
      answer: [
        "This page is a summary, not the full schedule. The source linked here is ",
        sourceLink(plan),
        ".",
      ],
    },
    {
      question: "Is Anystride affiliated with the Hansons?",
      answer: [
        "No. Anystride is independent and is not affiliated with the Hansons or Luke Humphrey Running. See ",
        coachLink(plan),
        " if you want coaching, which is separate from this plan.",
      ],
    },
  ];
}

function bridgeFaqs(plan: TrainingPlan): PlanFaq[] {
  return [
    {
      question: "Who can start the Bridge to 10K plan?",
      answer: [
        "Runners who can comfortably run a 5K. If you are still using walk/run intervals, start with ",
        link("/plans/couch-to-5k", "Couch to 5K"),
        " instead.",
      ],
    },
    {
      question: "What is the longest run in the Bridge to 10K plan?",
      answer: [
        "The long run is 4 miles in week 1, 4.5 in week 2, 5 in week 3, 5.5 in week 4, and 6 miles in week 5. Week 6 is the 10K race.",
      ],
    },
    {
      question: "Can I print the Bridge to 10K schedule?",
      answer: [
        "Yes. The full 6-week schedule is on this page. You can print it or download a calendar, and no account is required.",
      ],
    },
    {
      question: "What paces does the Bridge to 10K plan use?",
      answer: [
        "The schedule does not list numeric paces. Tempo work is labeled comfortably hard. Use the ",
        link("/calculator", "pace calculator"),
        " with a recent race result.",
      ],
    },
    {
      question: "When should the Bridge to 10K plan start?",
      answer: [
        "Six weeks before the 10K, so the race session in week 6 falls on race week. The ",
        link("/#plan-finder", "plan finder"),
        " can compare this with other ",
        distanceHub(plan.distance),
        ", including the ",
        link("/plans/higdon-10k-intermediate", "Hal Higdon 10K overview"),
        ".",
      ],
    },
    {
      question: "Do I need a coach for the Bridge to 10K plan?",
      answer: [
        "No. The schedule on this page is enough to follow. See ",
        coachLink(plan),
        " if you want someone to adjust the weeks.",
      ],
    },
  ];
}

function couchFaqs(plan: TrainingPlan): PlanFaq[] {
  return [
    {
      question: "How many days a week is Couch to 5K?",
      answer: [
        "Three sessions a week for 9 weeks, with rest days between the sessions in this schedule. The recorded time is about 1.5–2 hours a week.",
      ],
    },
    {
      question: "Will Couch to 5K get me to a 5K?",
      answer: [
        "The plan builds to 30 minutes of continuous running. How far that takes you depends on your pace. Week 9 includes a session labeled 30 min / 5K, which is a time target on this page, not a promise that every runner covers 5 kilometers.",
      ],
    },
    {
      question: "What is week 1 of Couch to 5K?",
      answer: [
        "Week 1 repeats 60 seconds of jogging and 90 seconds of walking, eight times, on each of the three run days. The session note adds a 5-minute brisk-walk warmup and a 5-minute walk cooldown.",
      ],
    },
    {
      question: "Do I need an account to use Couch to 5K?",
      answer: [
        "No. You can follow, print, or download the calendar from this page without an account. A start date is saved only in this browser.",
      ],
    },
    {
      question: "What should I do after Couch to 5K?",
      answer: [
        "If you can jog 20–30 minutes, the ",
        link("/plans/base-building-4-week", "4-week base-building plan"),
        " is listed for that starting point. If you can run a 5K comfortably, the ",
        link("/plans/bridge-to-10k", "Bridge to 10K plan"),
        " is 6 weeks and adds a long run and a tempo. The ",
        link("/#plan-finder", "plan finder"),
        " matches plans to your mileage, and ",
        coachLink(plan),
        " are optional.",
      ],
    },
    {
      question: "Is Anystride affiliated with the NHS Couch to 5K program?",
      answer: [
        "No. Anystride is independent and is not affiliated with the NHS or Cool Running. The source named for this schedule is ",
        sourceLink(plan),
        ".",
      ],
    },
  ];
}

function genericFaqs(plan: TrainingPlan): PlanFaq[] {
  const related = relatedPlans(plan);
  const volume = scheduleIsTimed(plan)
    ? `The schedule is written in minutes, not miles. ${volumeSentence(plan)} The biggest session listed is ${plan.peakWorkout}.`
    : `${volumeSentence(plan)} The biggest session listed is ${plan.peakWorkout}.`;
  const compare: TextPart[] = related.length
    ? [
        " Related plans at the same distance include ",
        ...related.flatMap((item, index) => {
          const piece: TextPart[] = [link(`/plans/${item.slug}`, item.name)];
          if (index < related.length - 1) {
            const lastGap = index === related.length - 2;
            piece.push(lastGap ? (related.length === 2 ? " and " : ", and ") : ", ");
          }
          return piece;
        }),
        ".",
      ]
    : [];

  return [
    {
      question: `How long is the ${plan.name} plan?`,
      answer: [
        `${plan.name} is ${plan.durationWeeks} weeks, with ${plan.daysPerWeek} training days a week and about ${plan.timePerWeek} of training.`,
      ],
    },
    {
      question: `How many miles a week does the ${plan.name} plan peak at?`,
      answer: [volume],
    },
    {
      question: `Who is the ${plan.name} plan for?`,
      answer: [
        `It is ${article(plan.level)} ${plan.level} ${DISTANCE_PROSE[plan.distance]} plan. The listed starting point is: ${plan.prerequisite}. It is listed for ${joinList(plan.bestFor)}.`,
      ],
    },
    {
      question: `When should I start the ${plan.name} plan?`,
      answer: [
        `Count back ${plan.durationWeeks} weeks from race day to start week 1. The `,
        link("/#plan-finder", "plan finder"),
        " compares it with other ",
        distanceHub(plan.distance),
        ".",
      ],
    },
    {
      question: `What paces does the ${plan.name} plan use?`,
      answer: [
        "This page does not assign numeric paces. The ",
        link("/calculator", "pace calculator"),
        " estimates training paces from a recent race result. If you want someone to adjust the work, see ",
        coachLink(plan),
        ".",
      ],
    },
    {
      question: plan.kind === "explainer"
        ? `Where is the full ${plan.name} schedule?`
        : `Where is the ${plan.name} week-by-week schedule?`,
      answer: plan.kind === "explainer"
        ? [
            "This page summarizes the plan and does not reproduce a week-by-week schedule. The original source is ",
            sourceLink(plan),
            ".",
            ...compare,
          ]
        : [
            "The full schedule is on this page. You can set a start date, print it, or download a calendar without an account.",
            ...compare,
          ],
    },
  ];
}
