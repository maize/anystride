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

export const RACES_AS_OF = "2026-06-24";

export const RACES: Race[] = [
  {
    slug: "tokyo-marathon-2026",
    name: "Tokyo Marathon 2026",
    date: "2026-03-01",
    city: "Tokyo",
    country: "Japan",
    distance: "Marathon",
    series: "World Marathon Majors",
    why: "Asia's only World Marathon Major produced a photo-finish for the ages: Tadese Takele defended his title in 2:03:37, matching runner-up Geoffrey Toroitich to the second on a crisp March morning. Brigid Kosgei's 2:14:29 erased the course record and reasserted her place among the all-time marathon greats.",
    watchUrl: "https://www.marathon.tokyo/en/",
    fieldConfirmed: true,
    men: [
      { racer: "tadese-takele", place: 1, time: "2:03:37" },
      { racer: "geoffrey-toroitich", place: 2, time: "2:03:37" },
      { racer: "alexander-mutiso", place: 3, time: "2:03:38" },
    ],
    women: [
      { racer: "brigid-kosgei", place: 1, time: "2:14:29" },
      { racer: "bertukan-welde", place: 2, time: "2:16:36" },
      { racer: "hawi-feysa", place: 3, time: "2:17:39" },
    ],
  },
  {
    slug: "boston-marathon-2026",
    name: "Boston Marathon 2026",
    date: "2026-04-20",
    city: "Boston",
    country: "United States",
    distance: "Marathon",
    series: "World Marathon Majors",
    why: "The 130th edition was the fastest Boston ever: John Korir shattered Geoffrey Mutai's 15-year-old course record with 2:01:52, and 13 men broke 2:06 in the deepest major-marathon field in history — six days before the sub-2 barrier fell in London.",
    watchUrl: "https://www.baa.org/races/boston-marathon",
    fieldConfirmed: true,
    men: [
      { racer: "john-korir", place: 1, time: "2:01:52" },
      { racer: "alphonce-simbu", place: 2, time: "2:02:47" },
      { racer: "benson-kipruto", place: 3, time: "2:02:50" },
    ],
    women: [
      { racer: "sharon-lokedi", place: 1, time: "2:18:51" },
      { racer: "loice-chemnung", place: 2, time: "2:19:37" },
      { racer: "mary-ngugi-cooper", place: 3, time: "2:20:07" },
    ],
  },
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
    slug: "european-athletics-championships-2026",
    name: "European Athletics Championships 2026",
    date: "2026-08-10",
    city: "Birmingham",
    country: "Great Britain",
    distance: "Track & Road",
    why: "The first European Athletics Championships on British soil since London 2012, with distance titles at stake across the 1500m, 5000m, 10,000m, 3000m steeplechase, and marathon — a showcase for the next generation of European distance talent.",
    watchUrl: "https://www.european-athletics.com/competitions/european-athletics-championships/",
    fieldConfirmed: false,
  },
  {
    slug: "sydney-marathon-2026",
    name: "Sydney Marathon 2026",
    date: "2026-08-30",
    city: "Sydney",
    country: "Australia",
    distance: "Marathon",
    series: "World Marathon Majors",
    why: "The newest Abbott World Marathon Major — Asia-Pacific's first — enters its third year with a rapidly maturing elite field and a spectacular course that finishes beneath the Sydney Harbour Bridge.",
    watchUrl: "https://www.sydneymarathon.com.au/",
    fieldConfirmed: false,
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
