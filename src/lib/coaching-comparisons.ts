export const comparisonChecked = "2026-11-05";
export const coachingCompetitors = {
  "final-surge": {
    name: "Final Surge",
    description: "Compare Final Surge and Anystride for running coaches: training workflows, communication, integrations and costs. Try the account preview before applying.",
    strength: "Final Surge suits coaches who need established team tools, workout communication and device connections in one platform.",
    consideration: "If you mainly coach runners individually, test whether Anystride’s invitation, plan assignment and result-review workflow fits your working week. Check the integration limits before moving athletes.",
    price: "$19/month for 1–5 athletes; $39/month for up to 100 athletes.",
    sources: [
      { label: "Final Surge pricing", url: "https://www.finalsurge.com/pricing" },
      { label: "Final Surge coach features", url: "https://www.finalsurge.com/coaches" },
      { label: "Final Surge integrations and features", url: "https://www.finalsurge.com/features" },
      { label: "Final Surge business tools", url: "https://www.finalsurge.com/coaching-business" },
    ],
    rows: [
      ["Planning", "Structured workouts, reusable plans and multi-athlete calendars.", "Structured workouts, reusable plans and individual athlete calendars."],
      ["Feedback", "Workout comments, mailbox and team social walls.", "Review recorded time, distance, effort and notes. No equivalent threaded workout conversation or team mailbox."],
      ["Devices", "Planned-workout sync/export includes Garmin Connect and Apple Watch.", "Limited Strava beta and CSV activity import. No direct Garmin/COROS sync or watch workout delivery."],
      ["Business", "Subscriptions, one-time programs, intake forms and waivers.", "Coach profiles and one-payment packages or consultations. No equivalent recurring subscription or waiver workflow."],
    ],
  },
  "vdot-coach": {
    name: "V.O2 / VDOT Coach",
    description: "Compare V.O2 / VDOT Coach and Anystride: pacing, training plans, athlete feedback, integrations and pricing. Explore a runner and coach account preview.",
    strength: "V.O2 is a strong fit when custom VDOT pacing is central to your coaching and you want an established running-specific marketplace.",
    consideration: "Consider Anystride when you want to choose your own workout targets and combine a public coaching profile with a straightforward training workspace. Try a training week before deciding whether it fits.",
    price: "$29.99/month for up to 25 athletes; $39.99/month for up to 100; $49.99/month for up to 200.",
    sources: [
      { label: "V.O2 coach features and pricing", url: "https://vdoto2.com/vdot-coach" },
      { label: "V.O2 device support", url: "https://vdoto2.com/p/vdot-coach-200-yearly/117" },
      { label: "V.O2 coach marketplace", url: "https://vdoto2.com/running-coaches" },
    ],
    rows: [
      ["Pacing", "Built-in custom pacing and future pace updates from race results.", "Coach-authored workout targets. No automatic VDOT-based recalculation of assigned training."],
      ["Planning", "Workout templates, saved workouts and training groups.", "Reusable workouts, multiweek plans and assignments to connected athletes."],
      ["Feedback", "Workout commenting and activity notifications.", "Recorded workout results and notes. No equivalent threaded workout conversation."],
      ["Devices", "Lists Garmin, Strava, COROS and Apple Watch support.", "Limited Strava beta and CSV activity import. No direct Garmin/COROS sync or watch workout delivery."],
      ["Discovery", "Profiles, specialty filters, coaching offers and purchaser reviews.", "Free coach directory and approved coach storefronts. Unclaimed listings are labeled; no purchaser-review system."],
    ],
  },
} as const;
export type CoachingCompetitor = keyof typeof coachingCompetitors;
export function isCoachingCompetitor(value: string): value is CoachingCompetitor {
  return Object.hasOwn(coachingCompetitors, value);
}
