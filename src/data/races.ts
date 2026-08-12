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

export const RACES_AS_OF = "2026-08-12";

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
    slug: "prefontaine-classic-2026",
    name: "Prefontaine Classic 2026",
    date: "2026-07-03",
    city: "Eugene",
    country: "United States",
    distance: "Track",
    series: "Diamond League",
    why: "Two nights at Hayward Field in Eugene delivered the Pre Classic's signature drama: Nikki Hiltz stunned three-time world champion Faith Kipyegon to win the women's mile in a meeting-record 4:17.49, and Australia's Cameron Myers set an Australian record 3:46.06 to win the Bowerman Mile, with Yared Nuguse and Ethan Strand both breaking 3:47.",
    watchUrl: "https://www.preclassic.com/",
    fieldConfirmed: true,
    men: [
      { racer: "cameron-myers", place: 1, time: "3:46.06" },
      { racer: "yared-nuguse", place: 2, time: "3:46.61" },
      { racer: "ethan-strand", place: 3, time: "3:46.97" },
    ],
    women: [
      { racer: "nikki-hiltz", place: 1, time: "4:17.49" },
      { racer: "dorcus-ewoi", place: 2, time: "4:17.62" },
      { racer: "faith-kipyegon", place: 3, time: "4:17.80" },
    ],
  },
  {
    slug: "london-diamond-league-2026",
    name: "London Diamond League 2026",
    date: "2026-07-18",
    city: "London",
    country: "Great Britain",
    distance: "Track",
    series: "Diamond League",
    why: "Josh Kerr delivered on every promise of “Project 222”: the Scot shattered Hicham El Guerrouj’s 27-year-old mile world record with a stunning 3:42.66 at London Stadium, becoming the first man in history to break 3:43. Yared Nuguse ran 3:45.69 in second, with Jake Hayward completing a British podium in 3:46.73.",
    watchUrl: "https://londonathletics.net/",
    fieldConfirmed: true,
    men: [
      { racer: "josh-kerr", place: 1, time: "3:42.66" },
      { racer: "yared-nuguse", place: 2, time: "3:45.69" },
      { racer: "jake-hayward", place: 3, time: "3:46.73" },
    ],
  },
  {
    slug: "commonwealth-games-athletics-2026",
    name: "Commonwealth Games Athletics 2026",
    date: "2026-07-27",
    city: "Glasgow",
    country: "Great Britain",
    distance: "Track & Road",
    why: "Scotland’s Josh Kerr delivered the ‘Scottish Miracle’ on home soil: the world-record holder broke the 60-year-old Commonwealth mile record with 3:54.12, edging Cameron Myers (3:55.26) and Timothy Cheruiyot (3:55.41). Australia swept the inaugural women’s Commonwealth mile podium — Abbey Caldwell gold (4:39.31), Jessica Hull silver (4:39.86), Claudia Hollingsworth bronze (4:40.20) — the first time the mile has featured at the Games since 1966.",
    watchUrl: "https://www.glasgow2026.com/",
    fieldConfirmed: true,
    men: [
      { racer: "josh-kerr", place: 1, time: "3:54.12" },
      { racer: "cameron-myers", place: 2, time: "3:55.26" },
      { racer: "timothy-cheruiyot", place: 3, time: "3:55.41" },
    ],
    women: [
      { racer: "abbey-caldwell", place: 1, time: "4:39.31" },
      { racer: "jessica-hull", place: 2, time: "4:39.86" },
      { racer: "claudia-hollingsworth", place: 3, time: "4:40.20" },
    ],
  },
  {
    slug: "european-athletics-championships-2026",
    name: "European Athletics Championships 2026",
    date: "2026-08-10",
    city: "Birmingham",
    country: "Great Britain",
    distance: "Track & Road",
    why: "The first European Athletics Championships on British soil since London 2012 opened with fireworks in the distance events: Jakob Ingebrigtsen stormed back from winter achilles surgery to win the men's 5000m in 13:15.29 (Aug 10), and Nadia Battocletti retained her European crown in the women's 5000m with a decisive sprint finish in 15:37.84 (Aug 11). The 1500m and 10,000m finals run through August 16.",
    watchUrl: "https://www.european-athletics.com/competitions/european-athletics-championships/",
    fieldConfirmed: true,
    men: [
      { racer: "jakob-ingebrigtsen", place: 1, time: "13:15.29" },
    ],
    women: [
      { racer: "nadia-battocletti", place: 1, time: "15:37.84" },
    ],
  },
  {
    slug: "sydney-marathon-2026",
    name: "Sydney Marathon 2026",
    date: "2026-08-30",
    city: "Sydney",
    country: "Australia",
    distance: "Marathon",
    series: "World Marathon Majors",
    why: "The newest Abbott World Marathon Major fields its deepest elite roster yet. Both races are led by reigning world champions: 2025 World Athletics Championships gold medalist Stella Chesang heads the women's field alongside Ruti Aga and Haven Hailu, while 2025 world champion Alphonce Simbu and 2:01:48 man Sisay Lemma take on defending Sydney champion Hailemaryam Kiros in the men's race.",
    watchUrl: "https://www.sydneymarathon.com.au/",
    fieldConfirmed: true,
    men: [
      { racer: "alphonce-simbu" },
      { racer: "sisay-lemma" },
      { racer: "hailemaryam-kiros" },
    ],
    women: [
      { racer: "stella-chesang" },
      { racer: "ruti-aga" },
      { racer: "haven-hailu" },
    ],
  },
  {
    slug: "diamond-league-final-brussels-2026",
    name: "Diamond League Final Brussels 2026",
    date: "2026-09-04",
    city: "Brussels",
    country: "Belgium",
    distance: "Track",
    series: "Diamond League",
    why: "The Memorial Van Damme — one of track's oldest and most prestigious meetings — hosts the 2026 Diamond League Final, crowning season champions and awarding the Diamond Trophy across all events. With world-record holders and Olympic champions competing over two evenings, the Brussels finale routinely closes the outdoor season in style.",
    watchUrl: "https://www.memorialvandamme.be/",
    fieldConfirmed: false,
  },
  {
    slug: "world-athletics-ultimate-championship-2026",
    name: "World Athletics Ultimate Championship 2026",
    date: "2026-09-11",
    city: "Budapest",
    country: "Hungary",
    distance: "Track",
    why: "The inaugural World Athletics Ultimate Championship invites only defending Olympic and world champions — 26 events across three evenings at the National Athletics Centre in Budapest, with a $10 million prize purse on the line. Distance highlights: Faith Kipyegon in the women's 1500m, Cole Hocker in the men's 1500m, Beatrice Chebet in the women's 5000m, and Jakob Ingebrigtsen in the men's 5000m.",
    watchUrl: "https://worldathletics.org/competitions/world-athletics-ultimate-championship/2026",
    fieldConfirmed: true,
    men: [
      { racer: "cole-hocker" },
      { racer: "jakob-ingebrigtsen" },
    ],
    women: [
      { racer: "faith-kipyegon" },
      { racer: "beatrice-chebet" },
    ],
  },
  {
    slug: "world-road-running-championships-2026",
    name: "World Athletics Road Running Championships 2026",
    date: "2026-09-20",
    city: "Copenhagen",
    country: "Denmark",
    distance: "Half Marathon",
    why: "The World Athletics Road Running Championships returns to Copenhagen for world title races at the half marathon, 5K, and one mile — the only championship occasion where every nation's top road runners converge on a single start line. The half marathon crowns official world champions, making it the road runner's answer to the track World Championships.",
    watchUrl: "https://worldathletics.org/en/competitions/world-athletics-road-running-championships/copenhagen26",
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
    why: "The fastest marathon course in the world welcomes back its record-breakers: marathon world-record holder Sabastian Sawe defends his Berlin title, and Tigst Assefa headlines a loaded women's field alongside Rosemary Wanjiru and Amane Beriso. The question on every lip: can Sawe better his own 1:59:30 on these flat streets?",
    watchUrl: "https://www.bmw-berlin-marathon.com/en/",
    fieldConfirmed: true,
    men: [
      { racer: "sabastian-sawe" },
      { racer: "gabriel-geay" },
    ],
    women: [
      { racer: "tigst-assefa" },
      { racer: "rosemary-wanjiru" },
      { racer: "amane-beriso" },
    ],
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
    slug: "melbourne-marathon-2026",
    name: "Melbourne Marathon 2026",
    date: "2026-10-11",
    city: "Melbourne",
    country: "Australia",
    distance: "Marathon",
    why: "Eliud Kipchoge brings his seven-continent world marathon tour to Australia, headlining a redesigned, faster Melbourne course as the city targets its first sub-2:05 finish on home soil. Kipchoge is joined by Vincent Ngetich (KEN, PB 2:03:13) on what could be one of the great final-chapter chapters in marathon history.",
    watchUrl: "https://melbournemarathon.com.au/",
    fieldConfirmed: true,
    men: [
      { racer: "eliud-kipchoge" },
    ],
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
