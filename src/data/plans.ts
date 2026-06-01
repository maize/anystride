import type { TrainingPlan, Workout } from "./types";
import { EXPLAINER_PLANS } from "./explainer-plans";

// Reusable cells
const rest: Workout = { type: "rest", label: "Rest" };
const cross: Workout = {
  type: "cross",
  label: "Cross-train",
  note: "Easy 20–40 min: cycling, swimming, or brisk walk. Keep it low impact.",
};
const easy = (label: string, note?: string): Workout => ({
  type: "easy",
  label,
  note,
});

/**
 * Couch to 5K — the classic beginner walk/run progression. The methodology is
 * freely published (NHS, Cool Running) and is the most-recommended starting
 * point in r/C25K and r/running. Each session starts with a 5-min brisk-walk
 * warmup and ends with a 5-min walk cooldown. Runs are 3 non-consecutive days.
 */
const walkRun = (label: string, note?: string): Workout => ({
  type: "walk-run",
  label,
  note: note ?? "5-min brisk walk warmup + 5-min walk cooldown.",
});

const c25k: TrainingPlan = {
  slug: "couch-to-5k",
  name: "Couch to 5K",
  distance: "5k",
  level: "beginner",
  durationWeeks: 9,
  daysPerWeek: 3,
  summary:
    "The classic 9-week walk/run program that takes a non-runner from the couch to running 5K (30 minutes) continuously.",
  prerequisite: "You can walk briskly for 30 minutes",
  timePerWeek: "1.5–2 hrs",
  intensity: "low",
  peakWorkout: "30-min continuous run (≈5K)",
  kind: "full",
  weeklyVolume: { start: 5, peak: 10 },
  bestFor: [
    "Brand-new runners starting from scratch",
    "Returning after a long break",
    "Anyone who wants a gentle, injury-safe on-ramp",
  ],
  source: {
    name: "NHS / Cool Running (community standard)",
    url: "https://www.nhs.uk/live-well/exercise/running-and-aerobic-exercises/get-running-with-couch-to-5k/",
  },
  communityNote:
    "The default recommendation in r/C25K and r/running for brand-new runners. Builds the habit safely with walk/run intervals so you don't get injured ramping up too fast.",
  weeks: [
    {
      week: 1,
      focus: "Walk/run intervals",
      days: [
        walkRun("60s jog / 90s walk × 8 (20 min)"),
        rest,
        walkRun("60s jog / 90s walk × 8 (20 min)"),
        rest,
        walkRun("60s jog / 90s walk × 8 (20 min)"),
        rest,
        rest,
      ],
    },
    {
      week: 2,
      days: [
        walkRun("90s jog / 2 min walk × 6 (~21 min)"),
        rest,
        walkRun("90s jog / 2 min walk × 6 (~21 min)"),
        rest,
        walkRun("90s jog / 2 min walk × 6 (~21 min)"),
        rest,
        rest,
      ],
    },
    {
      week: 3,
      days: [
        walkRun("2× [90s jog, 90s walk, 3 min jog, 3 min walk]"),
        rest,
        walkRun("2× [90s jog, 90s walk, 3 min jog, 3 min walk]"),
        rest,
        walkRun("2× [90s jog, 90s walk, 3 min jog, 3 min walk]"),
        rest,
        rest,
      ],
    },
    {
      week: 4,
      focus: "Longer intervals",
      days: [
        walkRun("3 jog, 90s walk, 5 jog, 2.5 walk, 3 jog, 90s walk, 5 jog (min)"),
        rest,
        walkRun("3 jog, 90s walk, 5 jog, 2.5 walk, 3 jog, 90s walk, 5 jog (min)"),
        rest,
        walkRun("3 jog, 90s walk, 5 jog, 2.5 walk, 3 jog, 90s walk, 5 jog (min)"),
        rest,
        rest,
      ],
    },
    {
      week: 5,
      focus: "First continuous run",
      days: [
        walkRun("5 jog, 3 walk, 5 jog, 3 walk, 5 jog (min)"),
        rest,
        walkRun("8 min jog, 5 min walk, 8 min jog"),
        rest,
        easy("20 min continuous jog", "No walking breaks — keep it slow and steady."),
        rest,
        rest,
      ],
    },
    {
      week: 6,
      days: [
        walkRun("5 jog, 3 walk, 8 jog, 3 walk, 5 jog (min)"),
        rest,
        walkRun("10 min jog, 3 min walk, 10 min jog"),
        rest,
        easy("25 min continuous jog"),
        rest,
        rest,
      ],
    },
    {
      week: 7,
      focus: "Building endurance",
      days: [
        easy("25 min continuous jog"),
        rest,
        easy("25 min continuous jog"),
        rest,
        easy("25 min continuous jog"),
        rest,
        rest,
      ],
    },
    {
      week: 8,
      days: [
        easy("28 min continuous jog"),
        rest,
        easy("28 min continuous jog"),
        rest,
        easy("28 min continuous jog"),
        rest,
        rest,
      ],
    },
    {
      week: 9,
      focus: "5K!",
      days: [
        easy("30 min continuous jog"),
        rest,
        easy("30 min continuous jog"),
        rest,
        { type: "race", label: "30 min / 5K", note: "You did it — run your 5K!" },
        rest,
        rest,
      ],
    },
  ],
};

/**
 * Base Building — a gentle 4-week block for someone who can already jog 20–30 min
 * and wants to establish consistent easy mileage before chasing a goal. Generic,
 * methodology-based (easy aerobic running + one cross-train day).
 */
const baseBuilding: TrainingPlan = {
  slug: "base-building-4-week",
  name: "Base Building (4 Weeks)",
  distance: "5k",
  level: "beginner",
  durationWeeks: 4,
  daysPerWeek: 4,
  summary:
    "A 4-week aerobic base block for new-ish runners: build consistent easy miles and one cross-train day before targeting a race.",
  prerequisite: "You can already jog 20–30 minutes",
  timePerWeek: "2–3 hrs",
  intensity: "low",
  peakWorkout: "40-min easy run",
  kind: "full",
  weeklyVolume: { start: 8, peak: 12 },
  bestFor: [
    "Runners between programs who want to hold fitness",
    "Building a base before a 5K/10K plan",
    "People who prefer time-on-feet over structured workouts",
  ],
  source: {
    name: "Community methodology (easy-mileage base building)",
    url: "https://www.reddit.com/r/running/wiki/index/",
  },
  communityNote:
    "r/running's perennial advice: most beginners improve fastest by simply running easy and consistently. Keep every run conversational — you should be able to talk in full sentences.",
  weeks: [
    {
      week: 1,
      focus: "Establish the routine",
      days: [
        easy("20 min easy"),
        rest,
        cross,
        easy("20 min easy"),
        rest,
        easy("25 min easy"),
        rest,
      ],
    },
    {
      week: 2,
      days: [
        easy("25 min easy"),
        rest,
        cross,
        easy("25 min easy"),
        rest,
        easy("30 min easy"),
        rest,
      ],
    },
    {
      week: 3,
      focus: "Add a little volume",
      days: [
        easy("30 min easy"),
        rest,
        cross,
        easy("30 min easy"),
        rest,
        easy("35 min easy"),
        rest,
      ],
    },
    {
      week: 4,
      days: [
        easy("30 min easy"),
        rest,
        cross,
        easy("30 min easy"),
        rest,
        easy("40 min easy"),
        rest,
      ],
    },
  ],
};

/**
 * Bridge to 10K — a 6-week step up for a runner comfortable with 5K who wants to
 * reach 10K. Adds a weekly long run plus a light tempo session. Methodology-based.
 */
const tempo = (label: string, note?: string): Workout => ({
  type: "tempo",
  label,
  note:
    note ??
    "Comfortably hard — around your fastest sustainable-for-the-distance pace. Warm up and cool down with easy jogging.",
});
const long = (label: string, note?: string): Workout => ({
  type: "long",
  label,
  note: note ?? "Keep it easy and conversational. Time on feet matters more than pace.",
});

const bridgeTo10k: TrainingPlan = {
  slug: "bridge-to-10k",
  name: "Bridge to 10K",
  distance: "10k",
  level: "intermediate",
  durationWeeks: 6,
  daysPerWeek: 4,
  summary:
    "Already running 5K? This 6-week plan adds a weekly long run and a light tempo session to comfortably carry you to 10K.",
  prerequisite: "You can comfortably run a 5K",
  timePerWeek: "2.5–3.5 hrs",
  intensity: "moderate",
  peakWorkout: "6-mile long run",
  kind: "full",
  weeklyVolume: { start: 12, peak: 18 },
  bestFor: [
    "5K runners ready for their next distance",
    "Runners who want a first taste of tempo work",
    "Training for a first 10K race",
  ],
  source: {
    name: "Community methodology (easy + long + tempo)",
    url: "https://www.reddit.com/r/running/wiki/index/",
  },
  communityNote:
    "A standard intermediate build: mostly easy running, one long run that creeps up ~10% per week, and one tempo to develop a stronger cruising pace. Race day is the longest you'll go.",
  weeks: [
    {
      week: 1,
      days: [
        easy("3 mi easy"),
        rest,
        tempo("2 mi: 1 mi easy + 1 mi tempo"),
        rest,
        easy("3 mi easy"),
        long("4 mi long"),
        rest,
      ],
    },
    {
      week: 2,
      days: [
        easy("3 mi easy"),
        rest,
        tempo("3 mi: 1 easy + 1.5 tempo + 0.5 easy"),
        rest,
        easy("3 mi easy"),
        long("4.5 mi long"),
        rest,
      ],
    },
    {
      week: 3,
      focus: "Build",
      days: [
        easy("3.5 mi easy"),
        rest,
        tempo("3.5 mi: 1 easy + 2 tempo + 0.5 easy"),
        rest,
        easy("3 mi easy"),
        long("5 mi long"),
        rest,
      ],
    },
    {
      week: 4,
      days: [
        easy("4 mi easy"),
        rest,
        tempo("4 mi: 1 easy + 2.5 tempo + 0.5 easy"),
        rest,
        easy("3 mi easy"),
        long("5.5 mi long"),
        rest,
      ],
    },
    {
      week: 5,
      focus: "Peak",
      days: [
        easy("4 mi easy"),
        rest,
        tempo("4 mi: 1 easy + 2.5 tempo + 0.5 easy"),
        rest,
        easy("3 mi easy"),
        long("6 mi long"),
        rest,
      ],
    },
    {
      week: 6,
      focus: "Taper + race",
      days: [
        easy("3 mi easy"),
        rest,
        easy("2 mi easy + 4 strides"),
        rest,
        rest,
        { type: "race", label: "10K race", note: "Race day — start easy, finish strong." },
        rest,
      ],
    },
  ],
};

export const PLANS: TrainingPlan[] = [
  c25k,
  baseBuilding,
  bridgeTo10k,
  ...EXPLAINER_PLANS,
];
