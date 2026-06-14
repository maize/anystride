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
  /** City bucket used for the directory filter (e.g. "New York", "Online"). */
  city: string;
  /** Full display location, e.g. "New York, NY". */
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

/** Preferred display order for the city filter; unknown cities sort after these. */
export const CITY_ORDER: string[] = [
  "New York",
  "Boston",
  "Chicago",
  "Los Angeles",
  "San Francisco",
  "Online",
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
    city: "New York",
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
    city: "New York",
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
    city: "New York",
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
    city: "New York",
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
    city: "New York",
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
    city: "New York",
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
    city: "New York",
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

  // ---- Boston ----
  {
    slug: "boston-run-coaching",
    name: "Boston Run Coaching",
    city: "Boston",
    location: "Boston, MA",
    format: "hybrid",
    focus: ["5k-10k", "marathon", "performance"],
    specialties: ["800m–marathon", "One-on-one", "All levels"],
    blurb:
      "One-on-one Boston coaching from 800m to the marathon, for runners of all levels.",
    bio: [
      "Boston Run Coaching offers one-on-one, personalized coaching for athletes of all levels, across distances from 800m to the marathon.",
    ],
    link: "https://bostonruncoaching.com/",
    source: { name: "bostonruncoaching.com", url: "https://bostonruncoaching.com/" },
    verified: false,
  },

  // ---- Chicago ----
  {
    slug: "dwrunning",
    name: "DWRunning",
    city: "Chicago",
    location: "Chicago, IL",
    format: "hybrid",
    focus: ["5k-10k", "marathon", "performance"],
    specialties: ["Distance team", "Personal coaching", "Beginner to elite"],
    blurb:
      "Chicago distance-running team and personal coaching for everyone from beginners to elites.",
    bio: [
      "DWRunning is a Chicago-based distance running team and personal coaching service dedicated to helping everyone from elite athletes to beginners.",
    ],
    link: "https://www.dwrunning.com/",
    source: { name: "dwrunning.com", url: "https://www.dwrunning.com/" },
    verified: false,
  },
  {
    slug: "mary-namestnik",
    name: "Mary Namestnik",
    city: "Chicago",
    location: "Chicago, IL",
    format: "in-person",
    focus: ["5k-10k", "half", "marathon"],
    specialties: ["5K to marathon", "In-person (Chicago)"],
    blurb:
      "Chicago coach for the 5K through the marathon, with in-person sessions in the western suburbs.",
    bio: [
      "Mary Namestnik is a Chicago running coach for the 5K, 10K, half, and full marathon, offering in-person sessions within about 15 miles of the western suburbs.",
    ],
    link: "https://teamrunrun.com/coach/mary-namestnik-chicago-running-coach/",
    source: {
      name: "Team RunRun",
      url: "https://teamrunrun.com/coach/mary-namestnik-chicago-running-coach/",
    },
    verified: false,
  },

  // ---- Los Angeles ----
  {
    slug: "coach-kim-silverstein",
    name: "Coach Kim Silverstein",
    city: "Los Angeles",
    location: "Los Angeles, CA",
    format: "hybrid",
    focus: ["first-timers", "marathon"],
    specialties: ["Virtual & in-person", "Marathon", "Private & group"],
    blurb: "LA-based virtual and in-person marathon coaching, private or group.",
    bio: [
      "Kim Silverstein is a Los Angeles running coach providing virtual and in-person marathon training, private coaching, and group coaching.",
    ],
    link: "https://www.coachkim.la/",
    source: { name: "coachkim.la", url: "https://www.coachkim.la/" },
    verified: false,
  },
  {
    slug: "la-running-coach",
    name: "LA Running Coach — Mike Hamberger",
    city: "Los Angeles",
    location: "Los Angeles, CA",
    format: "hybrid",
    focus: ["performance", "5k-10k"],
    specialties: ["Custom programs", "Running mechanics"],
    blurb:
      "Custom training and running-mechanics coaching for all abilities, led by Mike Hamberger.",
    bio: [
      "LA Running Coach offers custom-designed training programs and technical instruction in running mechanics for runners of all abilities, owned and operated by Mike Hamberger.",
    ],
    link: "https://www.larunningcoach.com/",
    source: { name: "larunningcoach.com", url: "https://www.larunningcoach.com/" },
    verified: false,
  },
  {
    slug: "greenrunner-la",
    name: "GreenRunner",
    city: "Los Angeles",
    location: "Los Angeles, CA",
    format: "in-person",
    focus: ["performance", "5k-10k"],
    specialties: ["Speed & form", "Track to ultra"],
    blurb:
      "LA speed and running-form coaching, from track and 5K up to marathon and ultra.",
    bio: [
      "GreenRunner specializes in efficient running form, speed, endurance, and injury prevention, with clients setting PRs from the 5K through marathons and ultras.",
    ],
    link: "https://greenrunnerla.com/",
    source: { name: "greenrunnerla.com", url: "https://greenrunnerla.com/" },
    verified: false,
  },

  // ---- San Francisco Bay Area ----
  {
    slug: "running-fit-lab",
    name: "Running Fit Lab",
    city: "San Francisco",
    location: "SF Bay Area, CA",
    format: "hybrid",
    focus: ["marathon", "injury-aware", "performance"],
    specialties: ["Gait analysis", "Race-specific pacing", "Online US-wide"],
    blurb:
      "East Bay & Tri-Valley in person plus online across the US, with gait analysis and race-pace work.",
    bio: [
      "Running Fit Lab offers in-person coaching across the East Bay and Tri-Valley, plus online coaching anywhere in the US, building strategic marathon plans backed by gait analysis and race-specific pacing.",
    ],
    link: "https://www.runningfitlab.com/",
    source: { name: "runningfitlab.com", url: "https://www.runningfitlab.com/" },
    verified: false,
  },
  {
    slug: "coach-eve",
    name: "Running with Coach Eve",
    city: "San Francisco",
    location: "Marin & SF, CA",
    format: "hybrid",
    focus: ["first-timers", "marathon"],
    specialties: ["All levels", "Major marathons"],
    blurb:
      "Marin and San Francisco coaching for all levels, including the Boston, Big Sur, and SF marathons.",
    bio: [
      "Coach Eve and Coach Toby offer Bay Area coaching for runners of all levels, with training for the Napa, Boston, Big Sur, and San Francisco marathons.",
    ],
    link: "http://www.coacheve.com/",
    source: { name: "coacheve.com", url: "http://www.coacheve.com/" },
    verified: false,
  },
  {
    slug: "miles-bennett-smith",
    name: "Miles Bennett-Smith",
    city: "San Francisco",
    location: "San Francisco, CA",
    format: "online",
    focus: ["5k-10k", "marathon", "performance"],
    specialties: ["Competitive runners", "5K to marathon"],
    blurb:
      "San Francisco coach for competitive runners looking to improve from the 5K to the marathon.",
    bio: [
      "Miles Bennett-Smith is a San Francisco running coach who specializes in working with competitive runners looking to improve across the 5K up to the marathon.",
    ],
    link: "https://teamrunrun.com/coach/miles-bennett-smith-san-francisco-running-coach/",
    source: {
      name: "Team RunRun",
      url: "https://teamrunrun.com/coach/miles-bennett-smith-san-francisco-running-coach/",
    },
    verified: false,
  },

  // ---- Online (US) ----
  {
    slug: "running-joyfully",
    name: "Running Joyfully — Kaitlin Gregg Goodman",
    city: "Online",
    location: "Online (US)",
    format: "online",
    focus: ["first-timers", "half", "marathon", "performance"],
    specialties: ["Olympic Trials qualifier", "Custom programs"],
    blurb:
      "Online coaching from 4× Olympic Trials qualifier Kaitlin Gregg Goodman, with in-person race support.",
    bio: [
      "Running Joyfully provides custom run-training programs led by 4-time Olympic Trials qualifier and 2:32 marathoner Kaitlin Gregg Goodman, with online coaching and in-person support at major marathons.",
    ],
    link: "http://www.runningjoyfully.com/runcoach",
    source: { name: "runningjoyfully.com", url: "http://www.runningjoyfully.com/runcoach" },
    verified: false,
  },
  {
    slug: "trainwithmarc",
    name: "TrainwithMarc — Marc Pelerin",
    city: "Online",
    location: "Online (US)",
    format: "online",
    focus: ["5k-10k", "half", "marathon", "performance"],
    specialties: ["Online coaching", "5K to marathon"],
    blurb:
      "Online running coaching from the 5K to the marathon, with custom plans built around your schedule.",
    bio: [
      "TrainwithMarc offers online running coaching across distances from the 5K to the marathon, building custom plans that adapt to your schedule.",
    ],
    link: "https://trainwithmarc.com/online-coaching",
    source: { name: "trainwithmarc.com", url: "https://trainwithmarc.com/online-coaching" },
    verified: false,
  },
];
