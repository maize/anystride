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

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isUpcoming(race: Race): boolean {
  return new Date(race.date).getTime() >= startOfToday();
}

/** Upcoming races, soonest first. */
export function upcomingRaces(): Race[] {
  return RACES.filter(isUpcoming).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

/** Past races, most recent first. */
export function pastRaces(): Race[] {
  return RACES.filter((r) => !isUpcoming(r)).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

/** Races a given racer appears in (confirmed fields only). */
export function racesForRacer(slug: string): Race[] {
  return RACES.filter((race) =>
    [...(race.men ?? []), ...(race.women ?? [])].some((e) => e.racer === slug),
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
