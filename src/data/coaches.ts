export type CoachFormat = "online" | "in-person" | "hybrid";

export type CoachFocus =
  | "first-timers"
  | "5k-10k"
  | "half"
  | "marathon"
  | "performance"
  | "injury-aware"
  | "triathlon";

export interface Coach {
  slug: string;
  name: string;
  /** City / metro. */
  location: string;
  format: CoachFormat;
  focus: CoachFocus[];
  /** Short factual specialty tags shown on the profile. */
  specialties: string[];
  experience?: string;
  /** One-line summary for cards. */
  blurb: string;
  /** A short factual description (their public positioning). */
  bio: string[];
  /** The coach's own website / booking page. */
  link: string;
  /** Where this listing was compiled from. */
  source: { name: string; url: string };
  /**
   * false = a public listing compiled from the web, not yet claimed or vetted by
   * AnyStride. true = the coach has claimed/verified their profile.
   */
  verified: boolean;
}

export const COACH_FORMAT_LABELS: Record<CoachFormat, string> = {
  online: "Online",
  "in-person": "In person",
  hybrid: "Online & in person",
};

export const COACH_FOCUS_LABELS: Record<CoachFocus, string> = {
  "first-timers": "First-timers",
  "5k-10k": "5K–10K",
  half: "Half marathon",
  marathon: "Marathon",
  performance: "Performance / PR",
  "injury-aware": "Injury-aware",
  triathlon: "Triathlon",
};

export const FOCUS_ORDER: CoachFocus[] = [
  "first-timers",
  "5k-10k",
  "half",
  "marathon",
  "performance",
  "injury-aware",
  "triathlon",
];

/**
 * NYC running coaches, compiled from public listings to seed the directory.
 * `verified: false` — these are public listings, not yet claimed by the coaches.
 * Each links to the coach's own site; coaches can claim or remove their profile.
 */
export const COACHES: Coach[] = [
  {
    slug: "city-coach-nyc",
    name: "City Coach",
    location: "New York, NY",
    format: "hybrid",
    focus: ["first-timers", "marathon", "triathlon"],
    specialties: ["Couch to 5K & 10K", "Marathon", "Triathlon", "Corporate wellness"],
    blurb:
      "NYC endurance multisport coaching — from Couch to 5K through marathon and triathlon, private or group.",
    bio: [
      "City Coach is a New York City endurance coaching service offering private, group, and corporate programs across running, swimming, cycling, and triathlon.",
      "Programs span complete beginners (Couch to 5K/10K) through marathon and triathlon training, delivered online or in person across the five boroughs.",
    ],
    link: "https://www.citycoach.org/",
    source: { name: "citycoach.org", url: "https://www.citycoach.org/" },
    verified: false,
  },
  {
    slug: "central-park-coaching",
    name: "Central Park Coaching — Sean Fortune",
    location: "New York, NY",
    format: "hybrid",
    focus: ["first-timers", "marathon", "performance"],
    specialties: ["All levels", "NYC Marathon", "One-on-one"],
    experience: "15+ years",
    blurb:
      "Sean Fortune coaches every level — beginners to experienced NYC Marathoners — with one-on-one private sessions.",
    bio: [
      "Sean Fortune is a New York City running coach with 15+ years of experience coaching runners of every level, from beginners to experienced New York City Marathoners.",
      "He specializes in one-on-one private training, helping runners of all ages work toward a personal best.",
    ],
    link: "https://www.centralparkcoaching.com/",
    source: {
      name: "centralparkcoaching.com",
      url: "https://www.centralparkcoaching.com/",
    },
    verified: false,
  },
  {
    slug: "john-henwood-coaching",
    name: "John Henwood",
    location: "New York, NY",
    format: "hybrid",
    focus: ["marathon", "performance", "first-timers"],
    specialties: ["Marathon", "Performance", "First race to PR"],
    experience: "20+ years",
    blurb:
      "Olympian with 20+ years coaching, offering personalized running & marathon coaching from first race to PR.",
    bio: [
      "John Henwood is an Olympian with 20+ years of experience coaching runners, offering personalized running and marathon coaching in NYC.",
      "His approach centers on a well-balanced program, whether you're training for a first race or chasing a new personal best.",
    ],
    link: "https://www.johnhenwood.com/",
    source: { name: "johnhenwood.com", url: "https://www.johnhenwood.com/" },
    verified: false,
  },
  {
    slug: "coach-corky-runs",
    name: "Coach Corky — Elizabeth Corkum",
    location: "New York, NY",
    format: "hybrid",
    focus: ["first-timers", "marathon", "injury-aware"],
    specialties: ["Custom marathon programs", "Injury-aware progression"],
    blurb:
      "Elizabeth Corkum builds custom marathon programs that progress steadily without injury.",
    bio: [
      "Elizabeth Corkum (“Coach Corky”) is a New York City running coach and personal trainer.",
      "She builds custom marathon training programs designed to let runners progress steadily while reducing injury risk.",
    ],
    link: "http://coachcorkyruns.com/",
    source: { name: "coachcorkyruns.com", url: "http://coachcorkyruns.com/" },
    verified: false,
  },
  {
    slug: "gb-running",
    name: "GB Running",
    location: "New York, NY",
    format: "online",
    focus: ["marathon", "performance"],
    specialties: ["Private coaching tiers", "Marathon"],
    blurb:
      "NYC running & marathon coaching with tiered private programs to fit different needs and budgets.",
    bio: [
      "GB Running offers New York City running and marathon coaching with private coaching tiers (Gold, Silver, Bronze) designed to fit different needs and budgets.",
    ],
    link: "https://www.gbrunning.com/",
    source: { name: "gbrunning.com", url: "https://www.gbrunning.com/" },
    verified: false,
  },
  {
    slug: "sam-renikoff",
    name: "Sam Renikoff",
    location: "New York, NY",
    format: "online",
    focus: ["5k-10k", "marathon", "first-timers"],
    specialties: ["5K to marathon", "First-time NYC marathoners"],
    blurb:
      "NYC coach focusing on 5K through the marathon, personalizing plans for first-time NYC marathoners and beyond.",
    bio: [
      "Sam Renikoff is a New York City running coach focusing on the 5K through the marathon.",
      "He has coached clients through their first NYC marathon and personalizes training to meet runners at their specific level.",
    ],
    link: "https://teamrunrun.com/coach/sam-renikoff-new-york-city-running-coach/",
    source: {
      name: "Team RunRun",
      url: "https://teamrunrun.com/coach/sam-renikoff-new-york-city-running-coach/",
    },
    verified: false,
  },
  {
    slug: "motivny",
    name: "MOTIVNY",
    location: "New York, NY",
    format: "in-person",
    focus: ["injury-aware", "performance"],
    specialties: ["Run coaching", "Gait analysis", "PT-informed"],
    blurb:
      "Run coaching and gait analysis from a physical-therapy-informed NYC practice, with week-by-week plans.",
    bio: [
      "MOTIVNY provides run coaching and gait analysis in New York City, with week-by-week training plans covering distance, pacing, and endurance.",
      "Their physical-therapy-informed approach factors in your history, personal life, and preferences.",
    ],
    link: "https://www.motivny.com/services/run-coaching-and-gait-analysis",
    source: {
      name: "motivny.com",
      url: "https://www.motivny.com/services/run-coaching-and-gait-analysis",
    },
    verified: false,
  },
];
