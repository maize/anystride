import type { Racer } from "@/data/racers";
import { DISTANCE_LABELS, type Distance } from "@/data/types";
import { getAllPlans } from "@/lib/plans";
import { ageFromBorn, racesForRacer } from "@/lib/races";

/**
 * Search titles are the `%s` in the root layout template `%s · anystride`.
 * Do not append the site name here.
 */
export const RACER_TITLE_LIMIT = 60;
export const RACER_DESCRIPTION_LIMIT = 155;

export const PLAN_FINDER_HREF = "/#plan-finder";
export const COACH_DIRECTORY_HREF = "/coaches";

/** Year from "YYYY" or "YYYY-MM-DD". Undefined when the field is missing or not a year. */
export function birthYearFromBorn(born: string | undefined): string | undefined {
  if (!born) return undefined;
  const match = /^(\d{4})(?:-\d{2}-\d{2})?$/.exec(born.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const current = new Date().getFullYear();
  if (year < 1900 || year > current) return undefined;
  return match[1];
}

export function bornQuickFact(
  born: string | undefined,
  age: number | undefined,
): { label: "Age" | "Born"; value: string } | undefined {
  const year = birthYearFromBorn(born);
  if (year && age != null) return { label: "Age", value: `${age} (born ${year})` };
  if (year) return { label: "Born", value: year };
  if (age != null) return { label: "Age", value: String(age) };
  return undefined;
}

/** Suffix for the header line, including the leading separator. */
export function bornHeaderSuffix(born: string | undefined, age: number | undefined): string {
  const fact = bornQuickFact(born, age);
  if (!fact) return "";
  if (fact.label === "Age" && fact.value.includes("born")) return ` · Age ${fact.value}`;
  if (fact.label === "Born") return ` · Born ${fact.value}`;
  return ` · ${fact.value}`;
}

export function racerSearchMetadata(racer: Racer): { title: string; description: string } {
  const year = birthYearFromBorn(racer.born);
  const age = year ? ageFromBorn(racer.born) : undefined;
  const pr = racer.prs[0];
  const event = pr?.event ?? racer.events[0];
  const raceCount = racesForRacer(racer.slug).length;

  return {
    title: firstWithin(RACER_TITLE_LIMIT, titleCandidates(racer, event, pr?.time, year, age)),
    description: firstWithin(
      RACER_DESCRIPTION_LIMIT,
      descriptionCandidates(racer, pr, event, year, age, raceCount),
    ),
  };
}

function titleCandidates(
  racer: Racer,
  event: string | undefined,
  time: string | undefined,
  year: string | undefined,
  age: number | undefined,
): string[] {
  const { name, country } = racer;
  const candidates: string[] = [];
  if (event && time && year) candidates.push(`${name}: ${event} PB ${time}, Born ${year}`);
  if (event && time && age != null) candidates.push(`${name}: ${event} PB ${time}, Age ${age}`);
  if (event && time) candidates.push(`${name}: ${event} PB ${time}`);
  if (event && year) candidates.push(`${name}: ${country} ${roleFor(event)}, Born ${year}`);
  if (event) candidates.push(`${name}: ${country} ${roleFor(event)}`);
  candidates.push(`${name}: ${country} runner`);
  candidates.push(name);
  return candidates;
}

function descriptionCandidates(
  racer: Racer,
  pr: Racer["prs"][number] | undefined,
  event: string | undefined,
  year: string | undefined,
  age: number | undefined,
  raceCount: number,
): string[] {
  const role = roleFor(event);
  const who = `${racer.country} ${role} ${racer.name}`;
  const facts = pr ? "Personal bests and career highlights." : "Career highlights.";
  const also = alsoSentence(racer.events, event);
  const races = raceCount > 0 ? " Races on anystride are listed too." : "";
  const clauses = [
    year && age != null ? ` (age ${age}, born ${year})` : "",
    year ? ` (born ${year})` : "",
    "",
  ].filter((clause, index, all) => all.indexOf(clause) === index);

  const candidates: string[] = [];
  for (const clause of clauses) {
    const lead = pr ? `${who}${clause}: ${pr.event} PB ${pr.time}. ` : `${who}${clause}. `;
    candidates.push(`${lead}${facts}${also}${races}`);
    if (also) candidates.push(`${lead}${facts}${also}`);
    if (races) candidates.push(`${lead}${facts}${races}`);
    candidates.push(`${lead}${facts}`);
  }
  candidates.push(`${racer.country} runner ${racer.name}. ${facts}`);
  return candidates;
}

function roleFor(event: string | undefined): string {
  if (event === "Marathon") return "marathoner";
  if (event === "Half Marathon") return "half marathoner";
  if (event === "Mile") return "mile runner";
  if (!event) return "runner";
  return `${event} runner`;
}

function eventPhrase(event: string): string {
  switch (event) {
    case "Marathon":
      return "marathon";
    case "Half Marathon":
      return "half marathon";
    case "Mile":
      return "mile";
    case "Cross country":
      return "cross country";
    case "Track":
      return "track";
    default:
      return event;
  }
}

function joinList(items: string[], conjunction: "and" | "or"): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, ${conjunction} ${items[items.length - 1]}`;
}

function alsoSentence(events: string[], primary: string | undefined): string {
  const rest = events.filter((event) => event !== primary);
  if (rest.length === 0) return "";
  return ` Also ${joinList(rest.map(eventPhrase), "and")}.`;
}

function firstWithin(limit: number, candidates: string[]): string {
  const cleaned = candidates.map((candidate) => candidate.replace(/\s+/g, " ").trim()).filter(Boolean);
  const fit = cleaned.find((candidate) => candidate.length <= limit);
  if (fit) return fit;
  const cut = (cleaned[cleaned.length - 1] ?? "").slice(0, limit);
  const space = cut.lastIndexOf(" ");
  return (space > 20 ? cut.slice(0, space) : cut).trim();
}

type RoadDistance = Extract<Distance, "5k" | "10k" | "half-marathon" | "marathon">;

type EventMatch = { distance: RoadDistance; exact: boolean };

/**
 * Racer event → plans that already exist.
 * `exact` means the race distance matches the plan distance (5000m is a 5K,
 * 10,000m is a 10K). Other events use the closest road distance we publish.
 */
const EVENT_MATCH: Record<string, EventMatch> = {
  Marathon: { distance: "marathon", exact: true },
  "Half Marathon": { distance: "half-marathon", exact: true },
  "10,000m": { distance: "10k", exact: true },
  "5000m": { distance: "5k", exact: true },
  "Cross country": { distance: "10k", exact: false },
  "1500m": { distance: "5k", exact: false },
  Mile: { distance: "5k", exact: false },
  "3000m": { distance: "5k", exact: false },
  "800m": { distance: "5k", exact: false },
  "1000m": { distance: "5k", exact: false },
  Track: { distance: "5k", exact: false },
};

const PLAN_SLUGS: Record<RoadDistance, string[]> = {
  marathon: ["higdon-marathon-novice-1", "pfitzinger-18-55", "hansons-marathon-method"],
  "half-marathon": ["higdon-half-novice-1", "higdon-half-intermediate-1"],
  "10k": ["bridge-to-10k", "higdon-10k-intermediate"],
  "5k": ["couch-to-5k", "base-building-4-week", "higdon-5k-intermediate"],
};

export type TrainLink = { href: string; label: string };

export type TrainGroup = {
  id: RoadDistance;
  /** Words after "Train for the ". */
  heading: string;
  events: string[];
  body: string;
  links: TrainLink[];
};

export function trainGroupsForEvents(events: string[]): TrainGroup[] {
  const plans = getAllPlans();
  const order: RoadDistance[] = [];
  const buckets = new Map<RoadDistance, { exact: string[]; approx: string[] }>();

  for (const event of events) {
    const match = EVENT_MATCH[event];
    if (!match) continue;
    let bucket = buckets.get(match.distance);
    if (!bucket) {
      bucket = { exact: [], approx: [] };
      buckets.set(match.distance, bucket);
      order.push(match.distance);
    }
    const list = match.exact ? bucket.exact : bucket.approx;
    if (!list.includes(event)) list.push(event);
  }

  return order.map((distance) => {
    const bucket = buckets.get(distance)!;
    const shown = [...bucket.exact, ...bucket.approx];
    return {
      id: distance,
      heading: joinList(shown.map(eventPhrase), "and"),
      events: shown,
      body: groupBody(distance, bucket.exact, bucket.approx),
      links: linksFor(distance, plans),
    };
  });
}

function linksFor(distance: RoadDistance, plans: ReturnType<typeof getAllPlans>): TrainLink[] {
  const links: TrainLink[] = [
    {
      href: `/training-plans/${distance}`,
      label: `Free ${DISTANCE_LABELS[distance]} training plans`,
    },
  ];
  for (const slug of PLAN_SLUGS[distance]) {
    const plan = plans.find((item) => item.slug === slug && item.distance === distance);
    if (!plan) continue;
    links.push({ href: `/plans/${plan.slug}`, label: plan.name });
  }
  return links;
}

function groupBody(distance: RoadDistance, exact: string[], approx: string[]): string {
  const parts: string[] = [];
  if (exact.length > 0) parts.push(exactIntro(distance));
  if (approx.length > 0) {
    const list = joinList(approx.map(eventPhrase), "or");
    const label = DISTANCE_LABELS[distance];
    parts.push(
      exact.length > 0
        ? `There is no ${list} plan on anystride, so these ${label} plans are the closest schedules for your own training.`
        : `There is no ${list} plan on anystride. The closest free schedules are ${label} plans for your own training.`,
    );
  }
  return parts.join(" ");
}

function exactIntro(distance: RoadDistance): string {
  switch (distance) {
    case "marathon":
      return "Training for your own marathon? Free plans for every level.";
    case "half-marathon":
      return "Training for your own half marathon? Free plans for newer and intermediate runners.";
    case "10k":
      return "Training for your own 10K? A 10,000m race is the same distance. Free road 10K plans for runners who already have a base.";
    case "5k":
      return "Training for your own 5K? A 5000m race is the same distance. Free plans from a first 5K to a faster one.";
  }
}

export function trainAffiliationNote(name: string): string {
  return `These are free plans for your own training. They are not affiliated with ${name}, and listing a plan here does not mean its author endorses this page.`;
}
