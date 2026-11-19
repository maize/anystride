import test from "node:test";
import assert from "node:assert/strict";
import { load } from "./support/load-module.mjs";

const { planPageMetadata, planRouteMetadata } = load("src/lib/plan-page-metadata.ts");
const { getAllPlans } = load("src/lib/plans.ts");

const plans = getAllPlans();
const bySlug = Object.fromEntries(plans.map((plan) => [plan.slug, plan]));

const expected = {
  "bridge-to-10k": {
    title: "Bridge to 10K Plan: Free 6-Week Schedule",
    description:
      "Free Bridge to 10K plan with the full 6-week, 4-day schedule. Print it or download a calendar. No account needed. For runners who can already run a 5K.",
  },
  "couch-to-5k": {
    title: "Couch to 5K: Free 9-Week Run/Walk Plan",
    description:
      "Free Couch to 5K plan: the full 9-week run/walk schedule, 3 days a week. Print it or download a calendar. No account needed. Builds to 30 minutes of running.",
  },
  "higdon-marathon-novice-1": {
    title: "Hal Higdon Marathon Novice 1: Free 18-Week Overview",
    description:
      "Free overview of Hal Higdon Marathon Novice 1 for beginner marathon training: 18 weeks, 4 runs a week, long runs to 20 miles, and a link to the original plan.",
  },
  "pfitzinger-18-55": {
    title: "Pfitz 18/55 Plan (Pfitzinger): Free Overview",
    description:
      "Free overview of Pfitz 18/55, the Pfitzinger marathon plan: 18 weeks, five running days, up to 55 miles a week. Starting requirements and a link to the book.",
  },
  "hansons-marathon-method": {
    title: "Hansons Marathon Method: Free 18-Week Overview",
    description:
      "Free overview of the Hansons Marathon Method: 18 weeks, six runs a week, cumulative fatigue, and a 16-mile long-run cap. Also called the Hansons Method.",
  },
};

test("ranked plan pages use query-led titles and honest descriptions", () => {
  for (const [slug, copy] of Object.entries(expected)) {
    const plan = bySlug[slug];
    assert.ok(plan, slug);
    const meta = planPageMetadata(plan);
    assert.equal(meta.title, copy.title);
    assert.equal(meta.description, copy.description);
    assert.ok(meta.title.length <= 60, `${slug} title is ${meta.title.length}`);
    assert.ok(
      meta.description.length >= 150 && meta.description.length <= 160,
      `${slug} description is ${meta.description.length}`,
    );
    const route = planRouteMetadata(plan);
    assert.equal(route.title, copy.title);
    assert.equal(route.description, copy.description);
    assert.equal(route.openGraph.title, copy.title);
    assert.equal(route.openGraph.description, copy.description);
    assert.equal(route.openGraph.url, `/plans/${slug}`);
    assert.equal(route.twitter.card, "summary_large_image");
    assert.equal(route.twitter.title, copy.title);
    assert.equal(route.twitter.description, copy.description);
    assert.equal(route.alternates.canonical, `/plans/${slug}`);
  }
});

test("full schedules can offer print and calendar; explainers stay overviews", () => {
  for (const slug of ["bridge-to-10k", "couch-to-5k"]) {
    const text = `${expected[slug].title} ${expected[slug].description}`;
    assert.match(text, /schedule/i);
    assert.match(text, /print/i);
    assert.match(text, /calendar/i);
    assert.match(text, /no account/i);
    assert.equal(bySlug[slug].kind, "full");
  }

  for (const slug of ["higdon-marathon-novice-1", "pfitzinger-18-55", "hansons-marathon-method"]) {
    const text = `${expected[slug].title} ${expected[slug].description}`;
    assert.match(text, /overview/i);
    assert.doesNotMatch(text, /print|calendar|week-by-week|official|endorsed/i);
    assert.equal(bySlug[slug].kind, "explainer");
  }

  assert.match(expected["couch-to-5k"].description, /30 minutes/);
  assert.doesNotMatch(expected["couch-to-5k"].description, /finish a 5K|run a 5K|NHS/i);
});

test("other plan pages keep the shared name and summary", () => {
  for (const plan of plans) {
    if (plan.slug in expected) continue;
    const meta = planPageMetadata(plan);
    assert.equal(meta.title, plan.name);
    assert.equal(meta.description, plan.summary);
    const route = planRouteMetadata(plan);
    assert.equal(route.openGraph.title, plan.name);
    assert.equal(route.twitter.card, "summary_large_image");
    assert.equal(route.twitter.title, plan.name);
    assert.equal(route.description, plan.summary);
  }
});
