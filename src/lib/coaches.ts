import {
  COACHES,
  CITY_ORDER,
  FOCUS_ORDER,
  type Coach,
  type CoachFocus,
  type CoachFormat,
} from "@/data/coaches";
import { citySlug } from "./slug";

function sortCoaches(coaches: Coach[]): Coach[] {
  return [...coaches].sort(
    (a, b) => Number(b.verified) - Number(a.verified) || a.name.localeCompare(b.name),
  );
}

function normalizedName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sourceKeys(coach: Coach): { url: string; domain: string } | null {
  try {
    const url = new URL(coach.source.url);
    url.hash = "";
    url.hostname = url.hostname.toLocaleLowerCase("en-US");
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    const domain = url.hostname.replace(/^www\./, "");
    return { url: url.href, domain };
  } catch {
    return null;
  }
}

/** Merge validated discovered profiles while preserving static catalog precedence. */
export function mergeCoachCatalog(discovered: Coach[]): Coach[] {
  const merged = [...COACHES];
  const slugs = new Set(COACHES.map((coach) => coach.slug.toLocaleLowerCase("en-US")));
  const names = new Set(COACHES.map((coach) => normalizedName(coach.name)));
  const sourceUrls = new Set<string>();
  const sourceDomains = new Set<string>();

  for (const coach of COACHES) {
    const source = sourceKeys(coach);
    if (source) {
      sourceUrls.add(source.url);
      sourceDomains.add(source.domain);
    }
  }

  for (const coach of discovered) {
    const slug = coach.slug.toLocaleLowerCase("en-US");
    const name = normalizedName(coach.name);
    const source = sourceKeys(coach);
    if (
      !source ||
      slugs.has(slug) ||
      names.has(name) ||
      sourceUrls.has(source.url) ||
      sourceDomains.has(source.domain)
    ) continue;

    merged.push(coach);
    slugs.add(slug);
    names.add(name);
    sourceUrls.add(source.url);
    sourceDomains.add(source.domain);
  }

  return sortCoaches(merged);
}

export function getAllCoaches(): Coach[] {
  return sortCoaches(COACHES);
}

/** Request-time catalog including private, reviewed discovery imports. */
export async function getAllCoachesWithDiscovered(): Promise<Coach[]> {
  const { loadDiscoveredCoaches } = await import("./discovered-coach-store");
  return mergeCoachCatalog(await loadDiscoveredCoaches());
}

export function getCoachBySlug(slug: string): Coach | undefined {
  return COACHES.find((c) => c.slug === slug);
}

export async function getCoachBySlugWithDiscovered(slug: string): Promise<Coach | undefined> {
  const staticCoach = getCoachBySlug(slug);
  if (staticCoach) return staticCoach;
  return (await getAllCoachesWithDiscovered()).find((coach) => coach.slug === slug);
}

export function filterCoaches(opts: {
  city?: string;
  focus?: CoachFocus;
  format?: CoachFormat;
}): Coach[] {
  return getAllCoaches().filter(
    (c) =>
      (!opts.city || c.city === opts.city) &&
      (!opts.focus || c.focus.includes(opts.focus)) &&
      (!opts.format || c.format === opts.format),
  );
}

export function filterCoachCatalog(
  coaches: Coach[],
  opts: { city?: string; focus?: CoachFocus; format?: CoachFormat },
): Coach[] {
  return coaches.filter(
    (coach) =>
      (!opts.city || coach.city === opts.city) &&
      (!opts.focus || coach.focus.includes(opts.focus)) &&
      (!opts.format || coach.format === opts.format),
  );
}

/** Focus tags that at least one coach offers, in display order. */
export function availableFocuses(): CoachFocus[] {
  return availableFocusesFor(COACHES);
}

export function availableFocusesFor(coaches: Coach[]): CoachFocus[] {
  const present = new Set(coaches.flatMap((coach) => coach.focus));
  return FOCUS_ORDER.filter((f) => present.has(f));
}

/** Resolve a city URL slug (e.g. "new-york") back to its city name. */
export function getCityBySlug(slug: string): string | undefined {
  return availableCities().find((c) => citySlug(c) === slug);
}

export function getCityBySlugFor(coaches: Coach[], slug: string): string | undefined {
  return availableCitiesFor(coaches).find((city) => citySlug(city) === slug);
}

/** Cities with at least one coach, preferred order first then any extras. */
export function availableCities(): string[] {
  return availableCitiesFor(COACHES);
}

export function availableCitiesFor(coaches: Coach[]): string[] {
  const present = new Set(coaches.map((coach) => coach.city));
  const ordered = CITY_ORDER.filter((c) => present.has(c));
  const extras = [...present].filter((c) => !CITY_ORDER.includes(c)).sort();
  return [...ordered, ...extras];
}
