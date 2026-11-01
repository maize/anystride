import type { Race } from "@/data/races";
import { getRacerBySlug } from "./races";

/** Describe only event facts already shown on the race page. */
export function raceStructuredData(race: Race) {
  const participants = [...(race.men ?? []), ...(race.women ?? [])].flatMap((entry) => {
    const racer = entry.racer ? getRacerBySlug(entry.racer) : undefined;
    const name = racer?.name ?? entry.name;
    return name ? [{ "@type": "Person", name, ...(racer ? { url: `https://anystride.com/racers/${racer.slug}` } : {}) }] : [];
  });
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: race.name,
    description: race.why,
    sport: "Running",
    // A date-only schedule must not imply a confirmed midnight start.
    startDate: race.schedulePrecision === "time" ? race.startsAt : race.startsAt.slice(0, 10),
    endDate: race.schedulePrecision === "time" ? race.endsAt : race.endsAt.slice(0, 10),
    // Schema.org has no completed-event status; retain the scheduled status
    // for events that took place, rather than dropping it after the end date.
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(participants.length ? { performer: participants } : {}),
    location: {
      "@type": "Place",
      name: `${race.city}, ${race.country}`,
      address: { "@type": "PostalAddress", addressLocality: race.city, addressCountry: race.country },
    },
    url: `https://anystride.com/races/${race.slug}`,
    sameAs: race.verification.sourceUrl,
  };
}
