import assert from "node:assert/strict";
import { test } from "node:test";
import { load } from "./support/load-module.mjs";

function memoryStorage(initial = {}) {
  const values = { local: null, cookie: null, ...initial };
  return {
    getLocal: () => values.local,
    setLocal: (value) => {
      values.local = value;
    },
    getCookie: () => values.cookie,
    setCookie: (value) => {
      values.cookie = value;
    },
    values,
  };
}

test("plan activation parameters keep the variant and drop dates, contact and training fields", () => {
  const { productEventParameters, PRODUCT_EVENTS } = load("src/lib/product-events.ts");
  for (const event of ["plan_experiment_exposure", "plan_activation_view", "plan_activation_start", "plan_activation_abandon"]) {
    assert.ok(PRODUCT_EVENTS.includes(event));
  }
  const safe = productEventParameters({
    plan_slug: "pfitzinger-18-55",
    experiment: "plan_start_cta",
    variant: "treatment",
    step_name: "start_date",
    step_number: 1,
    last_field: "start_date",
    startDate: "2026-04-12",
    start_date: "2026-04-12",
    email: "runner@example.com",
    name: "Pat Runner",
    mileage: 55,
    weekly_mileage: "55 mpw",
    strava_activity: "morning-run",
    unit: "mi",
  });
  assert.deepEqual(JSON.parse(JSON.stringify(safe)), {
    plan_slug: "pfitzinger-18-55",
    experiment: "plan_start_cta",
    variant: "treatment",
    step_name: "start_date",
    step_number: 1,
    last_field: "start_date",
  });
  const encoded = JSON.stringify(safe);
  assert.equal(encoded.includes("2026-04-12"), false);
  assert.equal(encoded.includes("example.com"), false);
  assert.equal(encoded.includes("Pat"), false);
  assert.equal(encoded.includes("strava"), false);
  assert.equal(encoded.includes("mpw"), false);
  assert.equal(encoded.includes("\"mi\""), false);
  assert.deepEqual(JSON.parse(JSON.stringify(productEventParameters({
    variant: "treatment",
    experiment: "runner@example.com",
    last_field: "2026-04-12",
    step_name: "start_date",
    step_number: 2,
    plan_slug: "Pfitz 18/55",
  }))), {});
  assert.deepEqual(JSON.parse(JSON.stringify(productEventParameters({
    plan_slug: "bridge-to-10k",
    variant: "control",
  }))), { plan_slug: "bridge-to-10k" });
});

test("GA and PostHog activation hits keep the variant and drop the start date", () => {
  const ga = [];
  const { trackProductEvent } = load("src/lib/analytics.ts", {
    "@next/third-parties/google": { sendGAEvent: (...args) => ga.push(args) },
    "./posthog": { capturePostHogProductEvent: () => {} },
  }, {
    process: { env: { NODE_ENV: "production" } },
    window: { location: { hostname: "anystride.com", origin: "https://anystride.com", pathname: "/plans/pfitzinger-18-55" } },
    navigator: {},
  });
  const payload = {
    plan_slug: "pfitzinger-18-55",
    experiment: "plan_start_cta",
    variant: "control",
    startDate: "2026-04-12",
    email: "runner@example.com",
    name: "Pat Runner",
    mileage: 55,
  };
  trackProductEvent("plan_activated", payload);
  assert.equal(ga.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(ga[0])), ["event", "plan_activated", {
    plan_slug: "pfitzinger-18-55",
    experiment: "plan_start_cta",
    variant: "control",
  }]);
  assert.equal(JSON.stringify(ga).includes("2026-04-12"), false);
  assert.equal(JSON.stringify(ga).includes("example.com"), false);
  const blocked = [];
  load("src/lib/analytics.ts", {
    "@next/third-parties/google": { sendGAEvent: (...args) => blocked.push(args) },
    "./posthog": { capturePostHogProductEvent: () => blocked.push("posthog") },
  }, {
    process: { env: { NODE_ENV: "production" } },
    window: { location: { hostname: "anystride.com", origin: "https://anystride.com", pathname: "/plans/pfitzinger-18-55" } },
    navigator: { doNotTrack: "1" },
  }).trackProductEvent("plan_activation_start", payload);
  assert.equal(blocked.length, 0);

  const sent = [];
  let config;
  const sdk = {
    init(_token, options) { config = options; },
    capture(event, properties) {
      const filtered = config.before_send({
        uuid: "event-id",
        event,
        properties: {
          token: "project-token",
          distinct_id: "anonymous-id",
          $current_url: "https://anystride.com/plans/pfitzinger-18-55?email=runner@example.com",
          startDate: "2026-04-12",
          email: "runner@example.com",
          ...properties,
        },
      });
      if (filtered) sent.push(filtered);
    },
  };
  const { capturePostHogProductEvent } = load("src/lib/posthog.ts", {
    "posthog-js": { default: sdk },
  }, {
    process: { env: { NODE_ENV: "production", NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "project-token", NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com" } },
    window: { location: { hostname: "anystride.com", origin: "https://anystride.com", pathname: "/plans/pfitzinger-18-55" } },
    navigator: {},
  });
  capturePostHogProductEvent("plan_activation_abandon", {
    ...payload,
    variant: "treatment",
    step_name: "start_date",
    step_number: 1,
    last_field: "start_date",
    strava_activity: "12345",
  });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].event, "plan_activation_abandon");
  assert.deepEqual(JSON.parse(JSON.stringify(sent[0].properties)), {
    token: "project-token",
    distinct_id: "anonymous-id",
    $process_person_profile: false,
    $current_url: "https://anystride.com/plans/pfitzinger-18-55",
    $pathname: "/plans/pfitzinger-18-55",
    plan_slug: "pfitzinger-18-55",
    experiment: "plan_start_cta",
    variant: "treatment",
    step_name: "start_date",
    step_number: 1,
    last_field: "start_date",
  });
  assert.equal(JSON.stringify(sent).includes("2026-04-12"), false);
  assert.equal(JSON.stringify(sent).includes("example.com"), false);
  assert.equal(JSON.stringify(sent).includes("strava"), false);
  assert.equal(JSON.stringify(sent).includes("Pat"), false);
});

test("experiment assignment is stable, anonymous and limited to enrolled plans", () => {
  const {
    assignPlanExperimentVariant,
    parsePlanExperimentVariant,
    planExperimentAlternatives,
    planExperimentEnabled,
    planStartModuleCopy,
    resolvePlanExperimentVariant,
  } = load("src/lib/plan-experiment.ts");
  assert.equal(assignPlanExperimentVariant(0), "control");
  assert.equal(assignPlanExperimentVariant(0.49), "control");
  assert.equal(assignPlanExperimentVariant(0.5), "treatment");
  assert.equal(assignPlanExperimentVariant(0.999), "treatment");
  assert.equal(assignPlanExperimentVariant(Number.NaN), "control");
  assert.equal(assignPlanExperimentVariant(1), "control");
  assert.equal(parsePlanExperimentVariant("plan_start_cta.treatment"), "treatment");
  assert.equal(parsePlanExperimentVariant("runner@example.com"), null);
  assert.equal(parsePlanExperimentVariant("2026-04-12"), null);
  assert.equal(planExperimentEnabled("pfitzinger-18-55"), true);
  assert.equal(planExperimentEnabled("bridge-to-10k"), false);
  assert.equal(planStartModuleCopy("explainer", 18).includes("week markers"), true);
  assert.equal(planStartModuleCopy("explainer", 18).includes("example.com"), false);
  assert.deepEqual(JSON.parse(JSON.stringify(planExperimentAlternatives("pfitzinger-18-55").map((item) => item.href))), [
    "/plans/higdon-marathon-novice-1",
    "/plans/hansons-marathon-method",
    "/coaching/focus/marathon",
  ]);

  const first = memoryStorage();
  assert.equal(resolvePlanExperimentVariant(first, 0.2), "control");
  assert.deepEqual(first.values, { local: "control", cookie: "plan_start_cta.control" });
  assert.equal(resolvePlanExperimentVariant(first, 0.9), "control");
  assert.equal(JSON.stringify(first.values).includes("@"), false);
  assert.equal(JSON.stringify(first.values).includes("2026"), false);

  const preferLocal = memoryStorage({ local: "treatment", cookie: "plan_start_cta.control" });
  assert.equal(resolvePlanExperimentVariant(preferLocal, 0.1), "treatment");
  assert.equal(preferLocal.values.cookie, "plan_start_cta.treatment");

  const fromCookie = memoryStorage({ cookie: "plan_start_cta.treatment" });
  assert.equal(resolvePlanExperimentVariant(fromCookie, 0.1), "treatment");
  assert.equal(fromCookie.values.local, "treatment");

  const garbage = memoryStorage({ local: "runner@example.com", cookie: "2026-04-12" });
  const assigned = resolvePlanExperimentVariant(garbage, 0.8);
  assert.equal(assigned, "treatment");
  assert.equal(garbage.values.local, "treatment");
  assert.equal(garbage.values.cookie, "plan_start_cta.treatment");
});

test("explainer week-marker calendars omit daily workouts and personal fields", () => {
  const { buildWeekMarkerCalendar } = load("src/lib/plan-progress.ts");
  const ics = buildWeekMarkerCalendar(
    { slug: "pfitzinger-18-55", name: "Pfitzinger 18/55", durationWeeks: 18 },
    "2026-03-02",
  );
  assert.equal(ics.split("BEGIN:VEVENT").length - 1, 18);
  assert.match(ics, /DTSTART;VALUE=DATE:20260302/);
  assert.match(ics, /DTSTART;VALUE=DATE:20260309/);
  assert.match(ics, /SUMMARY:Pfitzinger 18\/55: Week 1 of 18/);
  assert.match(ics, /DESCRIPTION:Week marker only\. Daily workouts are not included\./);
  assert.equal(ics.includes("tempo"), false);
  assert.equal(ics.includes("miles"), false);
  assert.equal(ics.includes("mpw"), false);
  assert.equal(ics.includes("@example"), false);
  assert.equal(ics.includes("Pat"), false);
  assert.equal(buildWeekMarkerCalendar(
    { slug: "pfitzinger-18-55", name: "Pfitzinger 18/55", durationWeeks: 18 },
    "not-a-date",
  ), null);
  assert.equal(buildWeekMarkerCalendar(
    { slug: "Bad Slug", name: "Pfitzinger 18/55", durationWeeks: 18 },
    "2026-03-02",
  ), null);
});
