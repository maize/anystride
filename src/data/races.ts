export interface FieldEntry {
  /** Racer slug when Anystride has a profile for this athlete. */
  racer?: string;
  /** Display name for athletes who do not have an Anystride profile yet. */
  name?: string;
  /** Country name or three-letter code for an unlinked athlete. */
  country?: string;
  /** Finishing place, for completed races. */
  place?: number;
  /** Result time, for completed races. */
  time?: string;
}

export interface Race {
  slug: string;
  name: string;
  /** Local calendar date used in exports; lifecycle is derived from startsAt/endsAt. */
  date: string;
  /** Exact ISO-8601 event boundary, including the local UTC offset. */
  startsAt: string;
  /** Exact ISO-8601 event boundary, including the local UTC offset. */
  endsAt: string;
  /** IANA timezone used when displaying the event schedule. */
  timeZone: string;
  /** Whether the published schedule includes a confirmed start time. */
  schedulePrecision: "date" | "time";
  city: string;
  country: string;
  distance: string;
  series?: string;
  /** Why it's worth watching. */
  why: string;
  /** Where/how to watch (official site or broadcast). */
  watchUrl?: string;
  /** Official complete results, when published separately from the event page. */
  resultsUrl?: string;
  /** What the selected athlete rows below represent. */
  coverage: "schedule" | "field" | "results";
  verification: {
    state: "verified" | "review-needed";
    checkedAt: string;
    sourceName: string;
    sourceUrl: string;
  };
  men?: FieldEntry[];
  women?: FieldEntry[];
}

export const RACES_AS_OF = "2026-09-11";

export const RACES: Race[] = [
  {
    slug: "tokyo-marathon-2026",
    name: "Tokyo Marathon 2026",
    date: "2026-03-01",
    startsAt: "2026-03-01T09:10:00+09:00",
    endsAt: "2026-03-01T17:00:00+09:00",
    timeZone: "Asia/Tokyo",
    schedulePrecision: "time",
    city: "Tokyo",
    country: "Japan",
    distance: "Marathon",
    series: "World Marathon Majors",
    why: "Asia's only World Marathon Major produced a photo-finish for the ages: Tadese Takele defended his title in 2:03:37, matching runner-up Geoffrey Toroitich to the second on a crisp March morning. Brigid Kosgei's 2:14:29 erased the course record and reasserted her place among the all-time marathon greats.",
    watchUrl: "https://www.marathon.tokyo/en/",
    resultsUrl: "https://worldathletics.org/competition/calendar-results/results/7236397",
    coverage: "results",
    verification: {
      state: "verified",
      checkedAt: "2026-09-11",
      sourceName: "World Athletics results",
      sourceUrl: "https://worldathletics.org/competition/calendar-results/results/7236397",
    },
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
    startsAt: "2026-04-20T00:00:00-04:00",
    endsAt: "2026-04-20T23:59:59-04:00",
    timeZone: "America/New_York",
    schedulePrecision: "date",
    city: "Boston",
    country: "United States",
    distance: "Marathon",
    series: "World Marathon Majors",
    why: "The 130th edition was the fastest Boston ever: John Korir shattered Geoffrey Mutai's 15-year-old course record with 2:01:52, and 13 men broke 2:06 in the deepest major-marathon field in history — six days before the sub-2 barrier fell in London.",
    watchUrl: "https://www.baa.org/races/boston-marathon",
    resultsUrl: "https://worldathletics.org/competition/calendar-results/results/7235561",
    coverage: "results",
    verification: {
      state: "verified",
      checkedAt: "2026-09-11",
      sourceName: "World Athletics results",
      sourceUrl: "https://worldathletics.org/competition/calendar-results/results/7235561",
    },
    men: [
      { racer: "john-korir", place: 1, time: "2:01:52" },
      { racer: "alphonce-simbu", place: 2, time: "2:02:47" },
      { racer: "benson-kipruto", place: 3, time: "2:02:50" },
    ],
    women: [
      { racer: "sharon-lokedi", place: 1, time: "2:18:51" },
      { racer: "loice-chemnung", place: 2, time: "2:19:35" },
      { racer: "mary-ngugi-cooper", place: 3, time: "2:20:07" },
    ],
  },
  {
    slug: "london-marathon-2026",
    name: "London Marathon 2026",
    date: "2026-04-26",
    startsAt: "2026-04-26T00:00:00+01:00",
    endsAt: "2026-04-26T23:59:59+01:00",
    timeZone: "Europe/London",
    schedulePrecision: "date",
    city: "London",
    country: "Great Britain",
    distance: "Marathon",
    series: "World Marathon Majors",
    why: "The day the two-hour barrier fell: Sabastian Sawe ran 1:59:30 for the first sub-2 marathon in competition, while Tigst Assefa set a women's record — the deepest fields the sport has ever seen.",
    watchUrl: "https://www.tcslondonmarathon.com/",
    resultsUrl: "https://worldathletics.org/competition/calendar-results/results/7235562",
    coverage: "results",
    verification: {
      state: "verified",
      checkedAt: "2026-09-11",
      sourceName: "World Athletics results",
      sourceUrl: "https://worldathletics.org/competition/calendar-results/results/7235562",
    },
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
    startsAt: "2026-07-03T18:00:00-07:00",
    endsAt: "2026-07-04T15:00:00-07:00",
    timeZone: "America/Los_Angeles",
    schedulePrecision: "time",
    city: "Eugene",
    country: "United States",
    distance: "Track",
    series: "Diamond League",
    why: "Two nights at Hayward Field in Eugene delivered the Pre Classic's signature drama: Nikki Hiltz stunned three-time world champion Faith Kipyegon to win the women's mile in a meeting-record 4:17.49, and Australia's Cameron Myers set an Australian record 3:46.06 to win the Bowerman Mile, with Yared Nuguse and Ethan Strand both breaking 3:47.",
    watchUrl: "https://www.preclassic.com/",
    resultsUrl: "https://worldathletics.org/competitions/diamond-league/calendar-results/7214024/result",
    coverage: "results",
    verification: {
      state: "verified",
      checkedAt: "2026-09-11",
      sourceName: "World Athletics results",
      sourceUrl: "https://worldathletics.org/competitions/diamond-league/calendar-results/7214024/result",
    },
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
    startsAt: "2026-07-18T00:00:00+01:00",
    endsAt: "2026-07-18T23:59:59+01:00",
    timeZone: "Europe/London",
    schedulePrecision: "date",
    city: "London",
    country: "Great Britain",
    distance: "Track",
    series: "Diamond League",
    why: "Josh Kerr delivered on every promise of “Project 222”: the Scot shattered Hicham El Guerrouj’s 27-year-old mile world record with a stunning 3:42.66 at London Stadium, becoming the first man in history to break 3:43. Yared Nuguse ran 3:45.69 in second, with Jake Heyward completing a British podium in 3:46.73.",
    watchUrl: "https://londonathletics.net/",
    resultsUrl: "https://worldathletics.org/news/report/london-athletics-meet-2026-josh-kerr-world-mile-record",
    coverage: "results",
    verification: {
      state: "verified",
      checkedAt: "2026-09-11",
      sourceName: "World Athletics report",
      sourceUrl: "https://worldathletics.org/news/report/london-athletics-meet-2026-josh-kerr-world-mile-record",
    },
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
    startsAt: "2026-07-27T00:00:00+01:00",
    endsAt: "2026-08-01T23:59:59+01:00",
    timeZone: "Europe/London",
    schedulePrecision: "date",
    city: "Glasgow",
    country: "Great Britain",
    distance: "Track & Road",
    why: "Josh Kerr won the reinstated Commonwealth Mile on home soil in 3:54.12, with Australia's Cameron Myers taking silver in 3:55.26. The six-day athletics programme ran from July 27 through August 1 at Scotstoun Stadium.",
    watchUrl: "https://www.glasgow2026.com/",
    resultsUrl: "https://worldathletics.org/competition/calendar-results/results/7187518",
    coverage: "results",
    verification: {
      state: "verified",
      checkedAt: "2026-09-11",
      sourceName: "World Athletics results",
      sourceUrl: "https://worldathletics.org/competition/calendar-results/results/7187518",
    },
    men: [
      { racer: "josh-kerr", place: 1, time: "3:54.12" },
      { racer: "cameron-myers", place: 2, time: "3:55.26" },
    ],
  },
  {
    slug: "european-athletics-championships-2026",
    name: "European Athletics Championships 2026",
    date: "2026-08-10",
    startsAt: "2026-08-10T00:00:00+01:00",
    endsAt: "2026-08-16T23:59:59+01:00",
    timeZone: "Europe/London",
    schedulePrecision: "date",
    city: "Birmingham",
    country: "Great Britain",
    distance: "Track & Road",
    why: "The first European Athletics Championships on British soil since London 2012 staged distance finals from the 1500m through the marathon. Jakob Ingebrigtsen won the men's 5000m in 13:15.29 at Birmingham's Alexander Stadium.",
    watchUrl: "https://www.european-athletics.com/competitions/european-athletics-championships/",
    resultsUrl: "https://worldathletics.org/competition/calendar-results/results/7192415",
    coverage: "results",
    verification: {
      state: "verified",
      checkedAt: "2026-09-11",
      sourceName: "World Athletics results",
      sourceUrl: "https://worldathletics.org/competition/calendar-results/results/7192415",
    },
    men: [
      { racer: "jakob-ingebrigtsen", place: 1, time: "13:15.29" },
      { name: "Florian Bremm", country: "Germany", place: 2, time: "13:15.60" },
      { name: "Etienne Daguinos", country: "France", place: 3, time: "13:16.09" },
    ],
  },
  {
    slug: "sydney-marathon-2026",
    name: "Sydney Marathon 2026",
    date: "2026-08-30",
    startsAt: "2026-08-30T00:00:00+10:00",
    endsAt: "2026-08-30T23:59:59+10:00",
    timeZone: "Australia/Sydney",
    schedulePrecision: "date",
    city: "Sydney",
    country: "Australia",
    distance: "Marathon",
    series: "World Marathon Majors",
    why: "Addisu Gobena broke the Sydney course record with a 2:04:42 win, while Peres Jepchirchir won the women's race in 2:18:31. Seven men finished inside the previous course record in the newest Abbott World Marathon Major.",
    watchUrl: "https://www.sydneymarathon.com.au/",
    resultsUrl: "https://worldathletics.org/competition/calendar-results/results/7235579",
    coverage: "results",
    verification: {
      state: "verified",
      checkedAt: "2026-09-11",
      sourceName: "World Athletics results",
      sourceUrl: "https://worldathletics.org/competition/calendar-results/results/7235579",
    },
    men: [
      { name: "Addisu Gobena", country: "Ethiopia", place: 1, time: "2:04:42" },
      { name: "Chimdessa Debele", country: "Ethiopia", place: 2, time: "2:04:46" },
      { name: "Tebello Ramakongoana", country: "Lesotho", place: 3, time: "2:04:57" },
    ],
    women: [
      { racer: "peres-jepchirchir", place: 1, time: "2:18:31" },
      { name: "Irine Cheptai", country: "Kenya", place: 2, time: "2:22:11" },
      { name: "Shure Demise", country: "Ethiopia", place: 3, time: "2:22:33" },
    ],
  },
  {
    slug: "diamond-league-final-brussels-2026",
    name: "Diamond League Final Brussels 2026",
    date: "2026-09-04",
    startsAt: "2026-09-04T00:00:00+02:00",
    endsAt: "2026-09-05T23:59:59+02:00",
    timeZone: "Europe/Brussels",
    schedulePrecision: "date",
    city: "Brussels",
    country: "Belgium",
    distance: "Track",
    series: "Diamond League",
    why: "The two-night Memorial Van Damme crowned the 2026 Diamond League champions. Cameron Myers won the men's 1500m, while Freweyni Hailu led an Ethiopian sweep of the women's 5000m in Brussels.",
    watchUrl: "https://www.memorialvandamme.be/",
    resultsUrl: "https://worldathletics.org/competitions/diamond-league/calendar-results/7214029/result",
    coverage: "results",
    verification: {
      state: "verified",
      checkedAt: "2026-09-11",
      sourceName: "World Athletics results",
      sourceUrl: "https://worldathletics.org/competitions/diamond-league/calendar-results/7214029/result",
    },
  },
  {
    slug: "world-athletics-ultimate-championship-2026",
    name: "World Athletics Ultimate Championship 2026",
    date: "2026-09-11",
    startsAt: "2026-09-11T19:00:00+02:00",
    endsAt: "2026-09-13T21:00:00+02:00",
    timeZone: "Europe/Budapest",
    schedulePrecision: "time",
    city: "Budapest",
    country: "Hungary",
    distance: "Track",
    why: "The inaugural World Athletics Ultimate Championship brings 381 athletes from 65 federations to Budapest for 28 disciplines across three evenings. The distance programme includes straight finals at 1500m and 5000m.",
    watchUrl: "https://worldathletics.org/competitions/world-athletics-ultimate-championship/2026",
    coverage: "field",
    verification: {
      state: "verified",
      checkedAt: "2026-09-11",
      sourceName: "World Athletics final entry list",
      sourceUrl: "https://worldathletics.org/news/press-releases/final-entry-lists-world-athletics-ultimate-championship-budapest-26",
    },
    men: [
      { racer: "cole-hocker" },
      { racer: "jakob-ingebrigtsen" },
    ],
  },
  {
    slug: "world-road-running-championships-2026",
    name: "World Athletics Road Running Championships 2026",
    date: "2026-09-19",
    startsAt: "2026-09-19T10:10:00+02:00",
    endsAt: "2026-09-20T13:00:00+02:00",
    timeZone: "Europe/Copenhagen",
    schedulePrecision: "time",
    city: "Copenhagen",
    country: "Denmark",
    distance: "Mile · 5K · Half Marathon",
    why: "Copenhagen hosts world title races in the mile and 5K on Saturday, September 19, followed by the half marathon on Sunday, September 20. The first elite race starts at 10:10 local time on Saturday.",
    watchUrl: "https://worldathletics.org/en/competitions/world-athletics-road-running-championships/copenhagen26",
    coverage: "schedule",
    verification: {
      state: "verified",
      checkedAt: "2026-09-11",
      sourceName: "World Athletics event FAQ",
      sourceUrl: "https://worldathletics.org/competitions/world-athletics-road-running-championships/copenhagen26/faq",
    },
  },
  {
    slug: "berlin-marathon-2026",
    name: "Berlin Marathon 2026",
    date: "2026-09-27",
    startsAt: "2026-09-27T00:00:00+02:00",
    endsAt: "2026-09-27T23:59:59+02:00",
    timeZone: "Europe/Berlin",
    schedulePrecision: "date",
    city: "Berlin",
    country: "Germany",
    distance: "Marathon",
    series: "World Marathon Majors",
    why: "Berlin's fast course hosts the 52nd edition on September 27. Tigst Assefa and Rosemary Wanjiru headline the women's field; defending champion Sabastian Sawe withdrew with an injury on August 27.",
    watchUrl: "https://www.bmw-berlin-marathon.com/en/",
    coverage: "field",
    verification: {
      state: "verified",
      checkedAt: "2026-09-11",
      sourceName: "BMW Berlin Marathon",
      sourceUrl: "https://www.bmw-berlin-marathon.com/en/",
    },
    women: [
      { racer: "tigst-assefa" },
      { racer: "rosemary-wanjiru" },
    ],
  },
  {
    slug: "chicago-marathon-2026",
    name: "Chicago Marathon 2026",
    date: "2026-10-11",
    startsAt: "2026-10-11T00:00:00-05:00",
    endsAt: "2026-10-11T23:59:59-05:00",
    timeZone: "America/Chicago",
    schedulePrecision: "date",
    city: "Chicago",
    country: "United States",
    distance: "Marathon",
    series: "World Marathon Majors",
    why: "Flat, fast, and a magnet for American records and global stars — Chicago routinely produces some of the year's quickest times.",
    watchUrl: "https://www.chicagomarathon.com/",
    coverage: "schedule",
    verification: {
      state: "verified",
      checkedAt: "2026-09-11",
      sourceName: "Chicago Marathon event FAQ",
      sourceUrl: "https://www.chicagomarathon.com/event-info/event-faqs/",
    },
  },
  {
    slug: "melbourne-marathon-2026",
    name: "Melbourne Marathon 2026",
    date: "2026-10-11",
    startsAt: "2026-10-11T00:00:00+11:00",
    endsAt: "2026-10-11T23:59:59+11:00",
    timeZone: "Australia/Melbourne",
    schedulePrecision: "date",
    city: "Melbourne",
    country: "Australia",
    distance: "Marathon",
    why: "Eliud Kipchoge brings his seven-continent marathon tour to Australia for a redesigned Melbourne course and a new two-day festival format.",
    watchUrl: "https://melbournemarathon.com.au/",
    coverage: "field",
    verification: {
      state: "verified",
      checkedAt: "2026-09-11",
      sourceName: "Melbourne Marathon",
      sourceUrl: "https://melbournemarathon.com.au/",
    },
    men: [
      { racer: "eliud-kipchoge" },
    ],
  },
  {
    slug: "new-york-city-marathon-2026",
    name: "New York City Marathon 2026",
    date: "2026-11-01",
    startsAt: "2026-11-01T08:00:00-05:00",
    endsAt: "2026-11-01T22:00:00-05:00",
    timeZone: "America/New_York",
    schedulePrecision: "time",
    city: "New York",
    country: "United States",
    distance: "Marathon",
    series: "World Marathon Majors",
    why: "The 50th anniversary of New York's five-borough course brings nearly 60,000 runners to the city. Defending champions Benson Kipruto and Hellen Obiri headline the professional field.",
    watchUrl: "https://www.nyrr.org/tcsnycmarathon",
    coverage: "field",
    verification: {
      state: "verified",
      checkedAt: "2026-09-11",
      sourceName: "New York Road Runners",
      sourceUrl: "https://www.nyrr.org/media-center/press-release/2026_0819_tcsnycmprofield",
    },
    men: [
      { racer: "benson-kipruto" },
      { name: "Geoffrey Kamworor", country: "Kenya" },
      { name: "Abdi Nageeye", country: "Netherlands" },
    ],
    women: [
      { racer: "hellen-obiri" },
      { racer: "sifan-hassan" },
      { name: "Sheila Chepkirui", country: "Kenya" },
    ],
  },
];
