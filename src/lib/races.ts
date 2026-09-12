import { RACES, type Race } from "@/data/races";
import { RACERS, type Racer } from "@/data/racers";

// ---- racers ----

export function getAllRacers(): Racer[] {
  return [...RACERS].sort((a, b) => a.name.localeCompare(b.name));
}

export function getRacerBySlug(slug: string): Racer | undefined {
  return RACERS.find((r) => r.slug === slug);
}

/** Age in years from a "YYYY" or "YYYY-MM-DD" birth date. */
export function ageFromBorn(born: string | undefined): number | undefined {
  if (!born) return undefined;
  const birth = new Date(born.length === 4 ? `${born}-01-01` : born);
  if (Number.isNaN(birth.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

// ---- races ----

export function getAllRaces(): Race[] {
  return [...RACES];
}

export function getRaceBySlug(slug: string): Race | undefined {
  return RACES.find((r) => r.slug === slug);
}

export type RaceStatus = "upcoming" | "live" | "completed";

function timestamp(value: string): number {
  const result = Date.parse(value);
  if (Number.isNaN(result)) {
    throw new Error(`Invalid race timestamp: ${value}`);
  }
  return result;
}

export function getRaceStatus(
  race: Race,
  now: Date = new Date(),
): RaceStatus {
  const current = now.getTime();
  if (current < timestamp(race.startsAt)) return "upcoming";
  if (current <= timestamp(race.endsAt)) return "live";
  return "completed";
}

/** Upcoming and in-progress races, soonest first. */
export function upcomingRaces(now: Date = new Date()): Race[] {
  return RACES.filter((race) => getRaceStatus(race, now) !== "completed").sort(
    (a, b) => timestamp(a.startsAt) - timestamp(b.startsAt),
  );
}

/** Past races, most recent first. */
export function pastRaces(now: Date = new Date()): Race[] {
  return RACES.filter((race) => getRaceStatus(race, now) === "completed").sort(
    (a, b) => timestamp(b.endsAt) - timestamp(a.endsAt),
  );
}

function dateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function formatRaceDate(
  race: Race,
  weekday: "short" | "long" = "short",
): string {
  const start = new Date(race.startsAt);
  const end = new Date(race.endsAt);
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday,
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: race.timeZone,
  });
  if (dateKey(start, race.timeZone) === dateKey(end, race.timeZone)) {
    return formatter.format(start);
  }
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function formatRaceStartTime(race: Race): string | undefined {
  if (race.schedulePrecision !== "time") return undefined;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: race.timeZone,
    timeZoneName: "short",
  }).format(new Date(race.startsAt));
}

export function raceTimingLabel(race: Race, now: Date = new Date()): string {
  const status = getRaceStatus(race, now);
  if (status === "live") return "Live now";
  if (status === "completed") {
    return race.coverage === "results" ? "Results available" : "Finished";
  }

  const remaining = timestamp(race.startsAt) - now.getTime();
  const hours = Math.ceil(remaining / 3_600_000);
  if (hours <= 1) return "Starts within the hour";
  if (hours < 24) return `Starts in ${hours} hours`;
  const days = Math.ceil(remaining / 86_400_000);
  return days === 1 ? "Starts tomorrow" : `Starts in ${days} days`;
}

/**
 * Schedule and field claims become stale quickly near race day. Verified
 * historical results remain stable; unfinished coverage never does.
 */
export function isRaceDataStale(
  race: Race,
  now: Date = new Date(),
): boolean {
  if (race.verification.state === "review-needed") return true;

  const status = getRaceStatus(race, now);
  if (status === "completed") return race.coverage !== "results";

  const checkedAt = timestamp(`${race.verification.checkedAt}T23:59:59Z`);
  const ageInDays = (now.getTime() - checkedAt) / 86_400_000;
  const daysToStart =
    (timestamp(race.startsAt) - now.getTime()) / 86_400_000;
  const maximumAge = status === "live" || daysToStart <= 14 ? 7 : 30;
  return ageInDays > maximumAge;
}

/** Races a given racer appears in (confirmed fields only). */
export function racesForRacer(slug: string): Race[] {
  return RACES.filter((race) =>
    [...(race.men ?? []), ...(race.women ?? [])].some((e) => e.racer === slug),
  ).sort((a, b) => timestamp(b.startsAt) - timestamp(a.startsAt));
}
