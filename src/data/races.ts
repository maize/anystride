export interface FieldEntry {
  /** Racer slug (must exist in racers.ts). */
  racer: string;
  /** Finishing place, for completed races. */
  place?: number;
  /** Result time, for completed races. */
  time?: string;
}

export interface Race {
  slug: string;
  name: string;
  /** ISO date (YYYY-MM-DD). Upcoming vs past is derived from this. */
  date: string;
  city: string;
  country: string;
  distance: string;
  series?: string;
  /** Why it's worth watching. */
  why: string;
  /** Where/how to watch (official site or broadcast). */
  watchUrl?: string;
  /**
   * true once the elite field (or result) is known. When false, the page shows
   * "field announced closer to race day" plus the season's stars.
   */
  fieldConfirmed: boolean;
  men?: FieldEntry[];
  women?: FieldEntry[];
}

export const RACES_AS_OF = "2026-06-21";

export const RACES: Race[] = [
  {
    slug: "london-marathon-2026",
    name: "London Marathon 2026",
    date: "2026-04-26",
    city: "London",
    country: "Great Britain",
    distance: "Marathon",
    series: "World Marathon Majors",
    why: "The day the two-hour barrier fell: Sabastian Sawe ran 1:59:30 for the first sub-2 marathon in competition, while Tigst Assefa set a women's record — the deepest fields the sport has ever seen.",
    watchUrl: "https://www.tcslondonmarathon.com/",
    fieldConfirmed: true,
    men: [
      { racer: "sabastian-sawe", place: 1, time: "1:59:30" },
      { racer: "yomif-kejelcha", place: 2, time: "1:59:41" },
      { racer: "jacob-kiplimo", place: 3, time: "2:00:28" },
    ],
    women: [
      { racer: "tigst-assefa", place: 1, time: "2:15:41" },
      { racer: "hellen-obiri", place: 2, time: "2:15:53" },
      { racer: "joyciline-jepkosgei", place: 3, time: "2:15:55" },
    ],
  },
  {
    slug: "berlin-marathon-2026",
    name: "Berlin Marathon 2026",
    date: "2026-09-27",
    city: "Berlin",
    country: "Germany",
    distance: "Marathon",
    series: "World Marathon Majors",
    why: "The fastest course in the world and the traditional home of marathon world records. After the sub-2 in London, every eye is on whether the barrier falls again on Berlin's flat streets.",
    watchUrl: "https://www.bmw-berlin-marathon.com/en/",
    fieldConfirmed: false,
  },
  {
    slug: "chicago-marathon-2026",
    name: "Chicago Marathon 2026",
    date: "2026-10-11",
    city: "Chicago",
    country: "United States",
    distance: "Marathon",
    series: "World Marathon Majors",
    why: "Flat, fast, and a magnet for American records and global stars — Chicago routinely produces some of the year's quickest times.",
    watchUrl: "https://www.chicagomarathon.com/",
    fieldConfirmed: false,
  },
  {
    slug: "new-york-city-marathon-2026",
    name: "New York City Marathon 2026",
    date: "2026-11-01",
    city: "New York",
    country: "United States",
    distance: "Marathon",
    series: "World Marathon Majors",
    why: "The world's biggest marathon — 50,000+ runners across five boroughs — with a tactical, championship-style elite race to close the major-marathon season.",
    watchUrl: "https://www.nyrr.org/tcsnycmarathon",
    fieldConfirmed: false,
  },
];
