import { planPageMetadata } from "@/lib/plan-page-metadata";
import { getAllPlans } from "@/lib/plans";
import { storefrontFeeDescription, workspacePricingDescription } from "@/lib/public-product";
import { BASE, getAllSitePaths } from "@/lib/site-urls";

const COMPARISONS = [
  {
    path: "/compare",
    label: "Compare training plans",
    description: "Side-by-side comparison of the free training plans.",
  },
  {
    path: "/compare/pfitz-18-55-vs-hansons",
    label: "Pfitz 18/55 vs Hansons",
    description: "Head-to-head comparison of the Pfitzinger 18/55 and Hansons marathon plans.",
  },
  {
    path: "/compare/vdot-vs-final-surge",
    label: "V.O2 vs Final Surge",
    description: "Comparison of V.O2 and Final Surge for running coaches.",
  },
  {
    path: "/racers",
    label: "Pro runners",
    description: "Pro runner PBs and race results.",
  },
] as const;

function asciiText(value: string): string {
  return value
    .replaceAll(" \u2014 ", ": ")
    .replaceAll("\u2014", ": ")
    .replaceAll("\u2013", "-")
    .replaceAll("\u201c", "\"")
    .replaceAll("\u201d", "\"")
    .replaceAll("\u2018", "'")
    .replaceAll("\u2019", "'")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function planOverviewLines(publicPaths: Set<string>): string {
  return getAllPlans()
    .filter((plan) => publicPaths.has(`/plans/${plan.slug}`))
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((plan) => {
      const name = asciiText(plan.name);
      const description = asciiText(planPageMetadata(plan).description);
      return `- [${name}](${BASE}/plans/${plan.slug}): ${description}`;
    })
    .join("\n");
}

function comparisonLines(publicPaths: Set<string>): string {
  return COMPARISONS
    .filter((item) => publicPaths.has(item.path))
    .map((item) => `- [${item.label}](${BASE}${item.path}): ${item.description}`)
    .join("\n");
}

export function llmsText(): string {
  const publicPaths = new Set(getAllSitePaths());
  return `# Anystride

> Training plans and coaching for runners, with tools for independent running coaches.

Public plans and guides are free to read without an account. Coaches set their own service prices. ${storefrontFeeDescription} ${workspacePricingDescription}

Approved coaches can invite athletes, build plans of 1 to 24 weeks and assign workouts. Athletes accept invitations and can revoke calendar access. Runner and coach views use the same account.

Strava syncing is a limited beta with capacity for ten connected athletes across the app. Activity sharing needs separate permission for each coach. Only You activities are not shared with coaches. Direct Garmin or COROS syncing and workout delivery to watches are not available.

## Product and costs
- [Pricing](https://anystride.com/pricing): costs and selling requirements.
- [Plain text pricing](https://anystride.com/pricing.txt): the same pricing information.
- [Tools for coaches](https://anystride.com/for-coaches): capabilities, approval and limitations.
- [Running coaches](https://anystride.com/coaches): independent profiles and services.

## Training resources
- [Free training plans](https://anystride.com/plans): schedules for 5K through marathon.
- [Running guides](https://anystride.com/guides): general training information and sources.
- [Editorial standards](https://anystride.com/editorial): responsibility, sourcing and corrections.
- [Privacy](https://anystride.com/privacy): account and activity data handling.
- [Terms](https://anystride.com/terms): service conditions.

## Free plan overviews
Plan pages summarize published plans and link to the original; they do not reproduce week-by-week schedules and Anystride is not affiliated with the plan authors.
${planOverviewLines(publicPaths)}

## Comparisons and race data
${comparisonLines(publicPaths)}
`;
}

export function GET() {
  return new Response(llmsText(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
