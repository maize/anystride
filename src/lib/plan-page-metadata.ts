import type { Metadata } from "next";
import type { TrainingPlan } from "@/data/types";

/**
 * Titles and descriptions for /plans/[slug].
 * Only pages with weak click-through are overridden. Every other plan keeps
 * its name and summary, so listing cards and on-page copy stay unchanged.
 * Titles are the text before the root layout suffix " · anystride".
 */
const PLAN_PAGE_METADATA: Record<string, { title: string; description: string }> = {
  "bridge-to-10k": {
    title: "Bridge to 10K Plan: Free 6-Week Schedule",
    description:
      "Free Bridge to 10K plan with the full 6-week, 4-day schedule. Print it or download a calendar. No account needed. For runners who can already run a 5K.",
  },
  "couch-to-5k": {
    title: "Couch to 5K: Free 9-Week Run/Walk Plan",
    description:
      "Free Couch to 5K plan: the full 9-week run/walk schedule, 3 days a week. Print it or download a calendar. No account needed. Builds to 30 minutes of running.",
  },
  "higdon-marathon-novice-1": {
    title: "Hal Higdon Marathon Novice 1: Free 18-Week Overview",
    description:
      "Free overview of Hal Higdon Marathon Novice 1 for beginner marathon training: 18 weeks, 4 runs a week, long runs to 20 miles, and a link to the original plan.",
  },
  "pfitzinger-18-55": {
    title: "Pfitz 18/55 Plan (Pfitzinger): Free Overview",
    description:
      "Free overview of Pfitz 18/55, the Pfitzinger marathon plan: 18 weeks, five running days, up to 55 miles a week. Starting requirements and a link to the book.",
  },
  "hansons-marathon-method": {
    title: "Hansons Marathon Method: Free 18-Week Overview",
    description:
      "Free overview of the Hansons Marathon Method: 18 weeks, six runs a week, cumulative fatigue, and a 16-mile long-run cap. Also called the Hansons Method.",
  },
};

export function planPageMetadata(
  plan: Pick<TrainingPlan, "slug" | "name" | "summary">,
): { title: string; description: string } {
  return PLAN_PAGE_METADATA[plan.slug] ?? { title: plan.name, description: plan.summary };
}

export function planRouteMetadata(
  plan: Pick<TrainingPlan, "slug" | "name" | "summary">,
): Metadata {
  const { title, description } = planPageMetadata(plan);
  return {
    title,
    description,
    alternates: { canonical: `/plans/${plan.slug}` },
    // Setting openGraph replaces the root layout object, so siteName is repeated.
    openGraph: {
      title,
      description,
      url: `/plans/${plan.slug}`,
      siteName: "anystride",
      type: "website",
    },
    twitter: {
      // The plan route already ships a 1200×630 opengraph-image. Setting any
      // twitter fields replaces that default, so keep the large card.
      card: "summary_large_image",
      title,
      description,
    },
  };
}
