import type { TrainingPlan } from "./types";

/**
 * The most-recommended plans across the running subreddits. Their exact
 * week-by-week schedules are copyrighted, so each entry is an honest *explainer*
 * — philosophy, structure, volume, pros/cons, and a link to the official source —
 * rather than a reproduction. Use the pace calculator to personalize the paces.
 */
export const EXPLAINER_PLANS: TrainingPlan[] = [
  {
    slug: "higdon-5k-intermediate",
    name: "Hal Higdon — 5K Intermediate",
    distance: "5k",
    level: "intermediate",
    durationWeeks: 8,
    daysPerWeek: 5,
    summary:
      "An 8-week plan for runners who can already finish a 5K and now want to race one faster, adding intervals and tempo work.",
    prerequisite: "You can already run a 5K",
    timePerWeek: "3–4 hrs",
    intensity: "high",
    peakWorkout: "Interval session (e.g. 5×1000m) + tempo runs",
    bestFor: [
      "Runners chasing a faster 5K time",
      "First taste of structured speedwork",
      "Anyone with a solid easy-running base",
    ],
    weeklyVolume: { start: 12, peak: 20 },
    source: {
      name: "Hal Higdon",
      url: "https://www.halhigdon.com/training-programs/5k-training/intermediate-5k/",
    },
    communityNote:
      "Higdon's free plans are a perennial r/running recommendation — clear, beginner-friendly, and battle-tested by millions of runners.",
    kind: "explainer",
    outline: [
      "5 running days per week",
      "One interval day (e.g. 400–1000m repeats at ~5K effort)",
      "One tempo run at comfortably-hard effort",
      "Easy runs plus a slightly longer weekend run (3–5 mi)",
      "Optional strength/stretch and rest days",
    ],
    pros: [
      "Adds real speed without overwhelming volume",
      "Free and simple to follow",
    ],
    cons: [
      "Assumes you can already run 3+ miles",
      "5 days/week is a step up from beginner plans",
    ],
  },
  {
    slug: "higdon-10k-intermediate",
    name: "Hal Higdon — 10K Intermediate",
    distance: "10k",
    level: "intermediate",
    durationWeeks: 8,
    daysPerWeek: 5,
    summary:
      "An 8-week 10K plan blending intervals, tempo runs and a building long run for runners ready to race the distance with intent.",
    prerequisite: "You can comfortably run 30–40 minutes",
    timePerWeek: "3.5–4.5 hrs",
    intensity: "high",
    peakWorkout: "Interval workout + 6-mile long run",
    bestFor: [
      "Runners targeting a 10K PR",
      "5K racers stepping up in distance",
      "Those who want speed + endurance together",
    ],
    weeklyVolume: { start: 15, peak: 26 },
    source: {
      name: "Hal Higdon",
      url: "https://www.halhigdon.com/training-programs/10k-training/intermediate-10k/",
    },
    communityNote:
      "A common 'I can run, now make me faster' pick. Balances the speed of 5K work with the endurance the 10K demands.",
    kind: "explainer",
    outline: [
      "5 running days per week",
      "One interval/speed day and one tempo day",
      "Easy mileage on the other run days",
      "Weekend long run building toward 6 miles",
      "Rest / cross-training to absorb the work",
    ],
    pros: ["Well-rounded speed and endurance", "Manageable 8-week commitment"],
    cons: ["Needs an existing aerobic base", "Two quality days/week can sting"],
  },
  {
    slug: "higdon-half-novice-1",
    name: "Hal Higdon — Half Marathon Novice 1",
    distance: "half-marathon",
    level: "beginner",
    durationWeeks: 12,
    daysPerWeek: 4,
    summary:
      "The classic 'finish your first half' plan: 12 weeks, no speedwork, just steadily building your long run to race-ready.",
    prerequisite: "You can run ~3 miles continuously",
    timePerWeek: "3–4 hrs",
    intensity: "low",
    peakWorkout: "10-mile long run",
    bestFor: [
      "Your first half marathon",
      "Runners who just want to finish, not race",
      "Anyone who prefers simple over complex",
    ],
    weeklyVolume: { start: 12, peak: 25 },
    source: {
      name: "Hal Higdon",
      url: "https://www.halhigdon.com/training-programs/half-marathon-training/novice-1-half-marathon/",
    },
    communityNote:
      "Probably the single most-recommended first-half-marathon plan on Reddit. Low-stress, low-injury, gets you to the start line confident.",
    kind: "explainer",
    outline: [
      "4 running days + cross-training + rest",
      "No formal speedwork — all about time on feet",
      "Short weekday runs of 3–5 miles",
      "Weekend long run building ~1 mi/week to 10 miles",
      "Gentle, forgiving progression",
    ],
    pros: ["Very approachable and low-injury", "Free, flexible, hard to mess up"],
    cons: [
      "No speedwork, so limited for time goals",
      "Lower mileage than 'race it' plans",
    ],
  },
  {
    slug: "higdon-half-intermediate-1",
    name: "Hal Higdon — Half Marathon Intermediate 1",
    distance: "half-marathon",
    level: "intermediate",
    durationWeeks: 12,
    daysPerWeek: 5,
    summary:
      "A step up from Novice: adds pace runs and longer long runs for runners who want to race the half, not just finish it.",
    prerequisite: "You're running ~20 mpw with some long-run experience",
    timePerWeek: "4.5–6 hrs",
    intensity: "moderate",
    peakWorkout: "12-mile long run + race-pace runs",
    bestFor: [
      "Chasing a half-marathon PR",
      "Runners with a season or two behind them",
      "Those ready for 5 days/week",
    ],
    weeklyVolume: { start: 20, peak: 33 },
    source: {
      name: "Hal Higdon",
      url: "https://www.halhigdon.com/training-programs/half-marathon-training/intermediate-1-half-marathon/",
    },
    communityNote:
      "The natural next step after Novice — same trustworthy structure, with race-pace work that translates current fitness into a faster finish.",
    kind: "explainer",
    outline: [
      "5 running days per week",
      "Marathon/half goal-pace runs during the week",
      "A tempo or faster session to sharpen",
      "Long runs building beyond race distance (to ~12 mi)",
      "Cross-training and rest to recover",
    ],
    pros: ["Genuinely prepares you to race", "Still simple and well-structured"],
    cons: ["Bigger time commitment", "Needs a real base before week 1"],
  },
  {
    slug: "higdon-marathon-novice-1",
    name: "Hal Higdon — Marathon Novice 1",
    distance: "marathon",
    level: "beginner",
    durationWeeks: 18,
    daysPerWeek: 4,
    summary:
      "The go-to first-marathon plan: 18 weeks, four runs a week, long runs marching up to 20 miles. Finish-focused, no speedwork.",
    prerequisite: "You can run 3–6 miles comfortably",
    timePerWeek: "4–6 hrs",
    intensity: "moderate",
    peakWorkout: "20-mile long run",
    bestFor: [
      "Your first marathon",
      "Runners who want to finish strong, not race",
      "Busy people — only 4 runs/week",
    ],
    weeklyVolume: { start: 15, peak: 40 },
    source: {
      name: "Hal Higdon",
      url: "https://www.halhigdon.com/training-programs/marathon-training/novice-1-marathon/",
    },
    communityNote:
      "The default first-marathon recommendation across r/running and r/firstmarathon for decades. Only 4 runs/week makes it realistic for normal lives.",
    kind: "explainer",
    outline: [
      "4 running days + cross-training + 2 rest days",
      "Three shorter weekday runs (3–5 mi)",
      "One weekend long run, building ~1–2 mi/week",
      "Three 20-mile long runs in the back half",
      "Step-back weeks and a 3-week taper",
    ],
    pros: ["Realistic schedule, low injury risk", "Gets first-timers to the line"],
    cons: [
      "No speedwork — not built for a time goal",
      "Long runs are a big share of weekly volume",
    ],
  },
  {
    slug: "pfitzinger-18-55",
    name: "Pfitzinger 18/55",
    distance: "marathon",
    level: "advanced",
    durationWeeks: 18,
    daysPerWeek: 6,
    summary:
      "The famous 'Pfitz' plan from Advanced Marathoning: 18 weeks peaking at 55 mpw, built on lactate-threshold runs and midweek medium-long runs.",
    prerequisite: "You're already running 30+ mpw with a 10+ mile long run",
    timePerWeek: "6–9 hrs",
    intensity: "high",
    peakWorkout: "20–22 mi long runs; 55 mpw peak weeks",
    bestFor: [
      "Experienced marathoners chasing a big PR or BQ",
      "Runners who thrive on structure and mileage",
      "Those with time for 6 days/week",
    ],
    weeklyVolume: { start: 33, peak: 55 },
    source: {
      name: "Pfitzinger & Douglas, 'Advanced Marathoning' (r/AdvancedRunning wiki)",
      url: "https://www.reddit.com/r/AdvancedRunning/wiki/contents/",
    },
    communityNote:
      "The most-discussed serious marathon plan on r/AdvancedRunning. The signature midweek medium-long runs build enormous endurance — runners swear by the results, and by how demanding it is.",
    kind: "explainer",
    outline: [
      "5–6 running days, peaking around 55 mpw",
      "Lactate-threshold (tempo) runs of 4–7 mi at ~15K–half effort",
      "Midweek medium-long runs of 11–15 mi — the trademark element",
      "VO2max intervals in the sharpening phase",
      "Long runs up to 20–22 mi at controlled effort",
      "A structured 3-week taper",
    ],
    pros: [
      "Proven for big PRs and Boston qualifiers",
      "Detailed, periodized, leaves nothing to chance",
    ],
    cons: [
      "High volume + intensity — demands real fitness and time",
      "Unforgiving if you start under-prepared",
    ],
  },
  {
    slug: "hansons-marathon-method",
    name: "Hansons Marathon Method",
    distance: "marathon",
    level: "intermediate",
    durationWeeks: 18,
    daysPerWeek: 6,
    summary:
      "A high-frequency plan built on 'cumulative fatigue' — six runs a week, goal-pace tempo runs, and a deliberately capped 16-mile long run.",
    prerequisite: "You can run ~25 mpw and want a structured marathon build",
    timePerWeek: "6–8 hrs",
    intensity: "high",
    peakWorkout: "16-mile long run on cumulatively-tired legs",
    bestFor: [
      "Runners who improve with frequency over single big runs",
      "Marathoners with a specific pace goal",
      "Those nervous about 20-milers but able to run often",
    ],
    weeklyVolume: { start: 18, peak: 50 },
    source: {
      name: "Hansons Marathon Method — Luke Humphrey Running",
      url: "https://lukehumphreyrunning.com/",
    },
    communityNote:
      "A Reddit favorite and lightning rod: the 16-mile long-run cap is famous (and controversial). The idea is that running tired all week simulates the marathon's final miles better than one long run does.",
    kind: "explainer",
    outline: [
      "6 running days per week — frequency is the point",
      "'Something of Substance' days: speed, strength, tempo, long",
      "Tempo runs at goal marathon pace, building to 10 mi",
      "Cumulative fatigue: workouts done on tired legs all week",
      "Long run capped at 16 mi by design",
    ],
    pros: [
      "Frequency builds resilience and pace judgment",
      "Race-pace focus; shorter long runs reduce injury risk",
    ],
    cons: [
      "6 days/week is a major time commitment",
      "The 16-mile cap is mentally daunting for first-timers",
    ],
  },
];
