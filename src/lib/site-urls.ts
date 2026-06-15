import { getAllPlans } from "./plans";
import { getAllGuides } from "./guides";
import { getAllCoaches, availableCities } from "./coaches";
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
    "/compare",
    "/calculator",
    "/coaching",
    "/coaching/apply",
  ];
  const plans = getAllPlans().map((p) => `/plans/${p.slug}`);
  const guides = getAllGuides().map((g) => `/guides/${g.slug}`);
  const coaches = getAllCoaches().map((c) => `/coaching/${c.slug}`);
  const cityPages = availableCities().map((c) => `/running-coaches/${citySlug(c)}`);
  const distancePages = distancesWithPlans().map((d) => `/training-plans/${d}`);

  return [
    ...staticPaths,
    ...plans,
    ...guides,
    ...coaches,
    ...cityPages,
    ...distancePages,
  ];
}

/** Same list as absolute URLs. */
export function getAllSiteUrls(): string[] {
  return getAllSitePaths().map((p) => `${BASE}${p}`);
}
