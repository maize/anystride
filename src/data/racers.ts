export interface PersonalBest {
  event: string;
  time: string;
}

export interface Racer {
  slug: string;
  name: string;
  gender: "M" | "F";
  country: string;
  hometown?: string;
  /** Birth date (YYYY-MM-DD or YYYY); used to compute age. */
  born?: string;
  events: string[];
  prs: PersonalBest[];
  /** Notable wins, records, and titles. */
  honors: string[];
  links?: { worldAthletics?: string; instagram?: string };
}

/** When this dataset was last hand-verified (the weekly agent keeps it fresh). */
export const RACERS_AS_OF = "2026-06-24";

/** Flag emoji for the countries currently in the dataset. */
export const COUNTRY_FLAGS: Record<string, string> = {
  Australia: "🇦🇺",
  Ethiopia: "🇪🇹",
  Germany: "🇩🇪",
  "Great Britain": "🇬🇧",
  Japan: "🇯🇵",
  Kenya: "🇰🇪",
  Netherlands: "🇳🇱",
  Tanzania: "🇹🇿",
  Uganda: "🇺🇬",
  "United States": "🇺🇸",
};

export const RACERS: Racer[] = [
  // ── Men ─────────────────────────────────────────────────────────────────────
  {
    slug: "sabastian-sawe",
    name: "Sabastian Sawe",
    gender: "M",
    country: "Kenya",
    events: ["Marathon", "Half Marathon"],
    prs: [{ event: "Marathon", time: "1:59:30" }],
    honors: [
      "Marathon world record — 1:59:30 (London 2026)",
      "First man to run a marathon under two hours in competition",
    ],
  },
  {
    slug: "yomif-kejelcha",
    name: "Yomif Kejelcha",
    gender: "M",
    country: "Ethiopia",
    born: "1997-08-01",
    events: ["Marathon", "Half Marathon", "Track"],
    prs: [
      { event: "Marathon", time: "1:59:41" },
      { event: "Half Marathon", time: "57:30" },
    ],
    honors: [
      "2nd-fastest marathon ever — 1:59:41 on debut (London 2026)",
      "World Indoor champion (3000m)",
      "Former one-mile world record holder",
    ],
  },
  {
    slug: "jacob-kiplimo",
    name: "Jacob Kiplimo",
    gender: "M",
    country: "Uganda",
    born: "2000-11-14",
    events: ["Marathon", "Half Marathon", "10,000m", "Cross country"],
    prs: [
      { event: "Marathon", time: "2:00:28" },
      { event: "Half Marathon", time: "56:42" },
    ],
    honors: [
      "Half marathon world record holder (56:42)",
      "World Cross Country champion",
      "Olympic 10,000m bronze medalist (Tokyo 2020)",
    ],
  },
  {
    slug: "eliud-kipchoge",
    name: "Eliud Kipchoge",
    gender: "M",
    country: "Kenya",
    hometown: "Kapsisiywa, Nandi County",
    born: "1984-11-05",
    events: ["Marathon"],
    prs: [{ event: "Marathon", time: "2:01:09" }],
    honors: [
      "Two-time Olympic marathon champion (2016, 2020)",
      "Former marathon world record holder",
      "First to run a marathon under two hours (INEOS 1:59 Challenge, 2019, unofficial)",
    ],
  },
  {
    slug: "tadese-takele",
    name: "Tadese Takele",
    gender: "M",
    country: "Ethiopia",
    born: "2003-02-06",
    events: ["Marathon", "Half Marathon"],
    prs: [{ event: "Marathon", time: "2:03:37" }],
    honors: [
      "Tokyo Marathon champion (2025, 2026)",
      "First man to win consecutive Tokyo Marathon titles",
    ],
  },
  {
    slug: "geoffrey-toroitich",
    name: "Geoffrey Toroitich",
    gender: "M",
    country: "Uganda",
    events: ["Marathon", "Half Marathon"],
    prs: [{ event: "Marathon", time: "2:03:37" }],
    honors: ["Tokyo Marathon runner-up (2026)"],
  },
  {
    slug: "alexander-mutiso",
    name: "Alexander Mutiso",
    gender: "M",
    country: "Kenya",
    events: ["Marathon"],
    prs: [{ event: "Marathon", time: "2:03:38" }],
    honors: ["Tokyo Marathon 3rd place (2026)"],
  },
  {
    slug: "john-korir",
    name: "John Korir",
    gender: "M",
    country: "Kenya",
    born: "1993-01-11",
    events: ["Marathon"],
    prs: [{ event: "Marathon", time: "2:01:52" }],
    honors: [
      "Boston Marathon champion (2022, 2024, 2026)",
      "Boston Marathon course record — 2:01:52 (2026)",
    ],
  },
  {
    slug: "alphonce-simbu",
    name: "Alphonce Felix Simbu",
    gender: "M",
    country: "Tanzania",
    born: "1992-08-27",
    events: ["Marathon", "Half Marathon"],
    prs: [{ event: "Marathon", time: "2:02:47" }],
    honors: ["Boston Marathon runner-up (2026)"],
  },
  {
    slug: "benson-kipruto",
    name: "Benson Kipruto",
    gender: "M",
    country: "Kenya",
    born: "1988-07-08",
    events: ["Marathon"],
    prs: [{ event: "Marathon", time: "2:02:50" }],
    honors: [
      "Boston Marathon champion (2021)",
      "Multiple World Marathon Major podiums",
    ],
  },
  // ── Women ────────────────────────────────────────────────────────────────────
  {
    slug: "tigst-assefa",
    name: "Tigst Assefa",
    gender: "F",
    country: "Ethiopia",
    born: "1996-12-03",
    events: ["Marathon"],
    prs: [{ event: "Marathon", time: "2:11:53" }],
    honors: [
      "Women-only marathon world record — 2:15:41 (London 2026)",
      "Former outright marathon world record (2:11:53, Berlin 2023)",
      "Olympic marathon silver medalist (Paris 2024)",
    ],
  },
  {
    slug: "hellen-obiri",
    name: "Hellen Obiri",
    gender: "F",
    country: "Kenya",
    born: "1989-12-13",
    events: ["Marathon", "5000m", "Cross country"],
    prs: [{ event: "Marathon", time: "2:15:53" }],
    honors: [
      "Boston & New York City Marathon champion",
      "Two-time world 5000m champion",
      "Multiple Olympic track medalist",
    ],
  },
  {
    slug: "sifan-hassan",
    name: "Sifan Hassan",
    gender: "F",
    country: "Netherlands",
    born: "1993-01-01",
    events: ["Marathon", "1500m", "5000m", "10,000m"],
    prs: [{ event: "Marathon", time: "2:13:44" }],
    honors: [
      "Olympic marathon champion (Paris 2024)",
      "Olympic 5000m & 10,000m champion (Tokyo 2020)",
      "Multiple world champion on the track",
    ],
  },
  {
    slug: "joyciline-jepkosgei",
    name: "Joyciline Jepkosgei",
    gender: "F",
    country: "Kenya",
    born: "1993-12-08",
    events: ["Marathon", "Half Marathon"],
    prs: [
      { event: "Marathon", time: "2:15:55" },
      { event: "Half Marathon", time: "1:04:51" },
    ],
    honors: [
      "London Marathon champion (2021)",
      "New York City Marathon champion (2019)",
      "Former half marathon world record holder",
    ],
  },
  {
    slug: "brigid-kosgei",
    name: "Brigid Kosgei",
    gender: "F",
    country: "Kenya",
    born: "1994-02-20",
    events: ["Marathon", "Half Marathon"],
    prs: [{ event: "Marathon", time: "2:14:04" }],
    honors: [
      "Former marathon world record holder (2:14:04, Chicago 2019)",
      "London Marathon champion (2018, 2019)",
      "Chicago Marathon champion (2018, 2019)",
      "Tokyo Marathon champion (2026)",
    ],
  },
  {
    slug: "sharon-lokedi",
    name: "Sharon Lokedi",
    gender: "F",
    country: "Kenya",
    born: "1996-09-28",
    events: ["Marathon"],
    prs: [{ event: "Marathon", time: "2:18:51" }],
    honors: [
      "Boston Marathon champion (2023, 2026)",
      "New York City Marathon champion (2022, 2023)",
    ],
  },
  {
    slug: "loice-chemnung",
    name: "Loice Chemnung",
    gender: "F",
    country: "Kenya",
    events: ["Marathon"],
    prs: [{ event: "Marathon", time: "2:19:37" }],
    honors: ["Boston Marathon runner-up (2026)"],
  },
  {
    slug: "mary-ngugi-cooper",
    name: "Mary Ngugi-Cooper",
    gender: "F",
    country: "Kenya",
    events: ["Marathon"],
    prs: [{ event: "Marathon", time: "2:20:07" }],
    honors: ["Boston Marathon 3rd place (2026)"],
  },
  {
    slug: "bertukan-welde",
    name: "Bertukan Welde",
    gender: "F",
    country: "Ethiopia",
    events: ["Marathon"],
    prs: [{ event: "Marathon", time: "2:16:36" }],
    honors: ["Tokyo Marathon runner-up (2026)"],
  },
  {
    slug: "hawi-feysa",
    name: "Hawi Feysa",
    gender: "F",
    country: "Ethiopia",
    events: ["Marathon"],
    prs: [{ event: "Marathon", time: "2:17:39" }],
    honors: ["Tokyo Marathon 3rd place (2026)"],
  },
];
