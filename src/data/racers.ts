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
export const RACERS_AS_OF = "2026-06-21";

/** Flag emoji for the countries currently in the dataset. */
export const COUNTRY_FLAGS: Record<string, string> = {
  Kenya: "🇰🇪",
  Ethiopia: "🇪🇹",
  Uganda: "🇺🇬",
  Netherlands: "🇳🇱",
  "United States": "🇺🇸",
  Germany: "🇩🇪",
  "Great Britain": "🇬🇧",
};

export const RACERS: Racer[] = [
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
];
