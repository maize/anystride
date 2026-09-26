import { getAllPlans } from "./plans";
import { getAllGuides } from "./guides";
import { getAllCoaches, availableCities } from "./coaches";
import { getAllRaces, getAllRacers } from "./races";
import { DISTANCE_ORDER } from "@/data/types";
import { citySlug } from "./slug";

export const BASE = "https://anystride.com";

/** Distances that have at least one plan (for /training-plans/[distance] hubs). */
function distancesWithPlans(): string[] {
  const present = new Set(getAllPlans().map((p) => p.distance));
  return DISTANCE_ORDER.filter((d) => present.has(d));
}

/**
 * Canonical list of all indexable site paths. Single source of truth for both
 * the sitemap and IndexNow submission.
 */
export function getAllSitePaths(): string[] {
  const staticPaths = [
    "/",
    "/plans",
    "/guides",
    "/races",
    "/compare",
    "/calculator",
    "/coaching",
    "/coaching/apply",
    "/editorial",
  ];
  const plans = getAllPlans().map((p) => `/plans/${p.slug}`);
  const guides = getAllGuides().map((g) => `/guides/${g.slug}`);
  const coaches = getAllCoaches().map((c) => `/coaching/${c.slug}`);
  const cityPages = availableCities().map((c) => `/running-coaches/${citySlug(c)}`);
  const distancePages = distancesWithPlans().map((d) => `/training-plans/${d}`);
  const races = getAllRaces().map((r) => `/races/${r.slug}`);
  const racers = getAllRacers().map((r) => `/racers/${r.slug}`);

  return [
    ...staticPaths,
    ...plans,
    ...guides,
    ...coaches,
    ...cityPages,
    ...distancePages,
    ...races,
    ...racers,
  ];
}

/** Same list as absolute URLs. */
export function getAllSiteUrls(): string[] {
  return getAllSitePaths().map((p) => `${BASE}${p}`);
}

/** Content dates, not build timestamps. Leave unknown revision dates unset. */
export function getSiteRevisions(): Map<string, string> {
  const revisions = new Map<string, string>([["/editorial", "2026-09-12"]]);
  for (const guide of getAllGuides()) revisions.set(`/guides/${guide.slug}`, guide.updated);
  const latestGuide = getAllGuides()[0]?.updated;
  if (latestGuide) revisions.set("/guides", latestGuide);
  // Verification dates are visible page content, not an automated refresh clock.
  for (const race of getAllRaces()) revisions.set(`/races/${race.slug}`, race.verification.checkedAt);
  return revisions;
}
