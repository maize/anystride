import test from "node:test";
import assert from "node:assert/strict";
import { load } from "./support/load-module.mjs";

const { getAllPlans, getPlanBySlug } = load("src/lib/plans.ts");
const { getGuideBySlug } = load("src/lib/guides.ts");
const { planPageMetadata } = load("src/lib/plan-page-metadata.ts");
const { planPageCopy, planPageHeading, faqPageSchema, faqPlainText } = load("src/lib/plan-page-intent.ts");

const plans = getAllPlans();
const priority = [
  "pfitzinger-18-55",
  "higdon-marathon-novice-1",
  "hansons-marathon-method",
  "bridge-to-10k",
  "couch-to-5k",
];

const headings = {
  "pfitzinger-18-55": "Pfitz 18/55 Marathon Plan",
  "higdon-marathon-novice-1": "Hal Higdon Marathon Novice 1 Plan",
  "hansons-marathon-method": "Hansons Marathon Method Plan",
  "bridge-to-10k": "Bridge to 10K Plan",
  "couch-to-5k": "Couch to 5K Plan",
};

function textOf(copy) {
  const chunks = [
    copy.heading,
    faqPlainText(copy.affiliation),
    ...copy.sections.flatMap((section) => [section.heading, faqPlainText(section.answer)]),
    copy.structure ? faqPlainText(copy.structure.answer) : "",
    copy.schedule?.intro ?? "",
    ...copy.faqs.flatMap((faq) => [faq.question, faqPlainText(faq.answer)]),
  ];
  return chunks.join("\n");
}

function linksOf(parts, found = []) {
  for (const part of parts) {
    if (part && typeof part === "object" && part.href) found.push(part);
  }
  return found;
}

function allLinks(copy) {
  const found = [];
  linksOf(copy.affiliation, found);
  for (const section of copy.sections) linksOf(section.answer, found);
  if (copy.structure) linksOf(copy.structure.answer, found);
  for (const faq of copy.faqs) linksOf(faq.answer, found);
  return found;
}

test("priority plan pages use the searched phrase as the only H1 source", () => {
  for (const slug of priority) {
    const plan = getPlanBySlug(slug);
    assert.equal(planPageHeading(plan), headings[slug]);
    assert.equal(planPageCopy(plan).heading, headings[slug]);
    assert.notEqual(headings[slug], plan.name);
  }
  for (const plan of plans) {
    if (priority.includes(plan.slug)) continue;
    assert.equal(planPageHeading(plan), plan.name);
  }
});

test("search-intent copy does not change titles or meta descriptions", () => {
  for (const plan of plans) {
    const meta = planPageMetadata(plan);
    assert.equal(typeof meta.title, "string");
    assert.equal(typeof meta.description, "string");
    assert.ok(!meta.title.includes(planPageCopy(plan).faqs[0].question));
  }
});

test("every plan page has question headings, a direct answer, and 4 to 6 FAQs", () => {
  for (const plan of plans) {
    const copy = planPageCopy(plan);
    assert.equal(copy.sections.map((section) => section.id).join(","), "who,duration,volume,paces,start");
    for (const section of copy.sections) {
      assert.match(section.heading, /\?$/);
      const answer = faqPlainText(section.answer).trim();
      assert.ok(answer.length > 40, `${plan.slug} ${section.id} answer is short`);
      const sentences = answer.split(/(?<=[.!?])\s+/).filter(Boolean);
      assert.ok(sentences.length >= 1 && sentences.length <= 3, `${plan.slug} ${section.id} has ${sentences.length} sentences`);
    }
    assert.ok(copy.faqs.length >= 4 && copy.faqs.length <= 6, `${plan.slug} has ${copy.faqs.length} FAQs`);
    const schema = faqPageSchema(copy.faqs);
    assert.equal(schema["@type"], "FAQPage");
    assert.equal(schema.mainEntity.length, copy.faqs.length);
    copy.faqs.forEach((faq, index) => {
      assert.equal(schema.mainEntity[index].name, faq.question);
      assert.equal(schema.mainEntity[index].acceptedAnswer.text, faqPlainText(faq.answer));
      assert.ok(!faqPlainText(faq.answer).includes("  "), `${faq.question} has a double space`);
    });
    if (plan.kind === "explainer") {
      assert.ok(copy.structure);
      assert.match(copy.structure.heading, /\?$/);
      assert.match(faqPlainText(copy.structure.answer), /does not reproduce|not a copy of the week-by-week schedule/i);
    } else {
      assert.ok(copy.schedule);
      assert.match(copy.schedule.heading, /\?$/);
      assert.match(copy.schedule.intro, /full/i);
    }
  }
});

test("priority pages answer from plan data and name their independence", () => {
  const expectations = {
    "pfitzinger-18-55": [/18 weeks/, /55 miles/, /33 miles/, /20–22 miles/, /not affiliated with Pete Pfitzinger/, /no pace chart|does not list numeric paces/i],
    "higdon-marathon-novice-1": [/18 weeks/, /40 miles/, /20-mile/, /no speedwork/i, /not affiliated with Hal Higdon/, /three 20-mile/i],
    "hansons-marathon-method": [/18 weeks/, /50 miles/, /16 miles/, /6 running days/, /no pace chart/i, /not affiliated with the Hansons/],
    "bridge-to-10k": [/6 weeks/, /18 miles/, /6 miles in week 5/, /4 miles in week 1/, /not affiliated with a named author/],
    "couch-to-5k": [/9 weeks/, /30-minute continuous run|30 minutes of continuous running/, /not a promise/, /not affiliated with the NHS/, /60 seconds of jogging/],
  };

  for (const [slug, patterns] of Object.entries(expectations)) {
    const copy = planPageCopy(getPlanBySlug(slug));
    const text = textOf(copy);
    for (const pattern of patterns) assert.match(text, pattern, `${slug} missing ${pattern}`);
    assert.doesNotMatch(text, /\b\d:\d{2}\b/, `${slug} invented a clock pace`);
    assert.doesNotMatch(text, /million|testimonial|star rating|official partner|endorsed by/i, slug);
    assert.match(faqPlainText(copy.affiliation), /Anystride is independent/);
    assert.match(faqPlainText(copy.affiliation), /not affiliated/);
  }

  const couch = textOf(planPageCopy(getPlanBySlug("couch-to-5k")));
  assert.doesNotMatch(couch, /will (finish|run) a 5K|guaranteed/i);
  const hansons = textOf(planPageCopy(getPlanBySlug("hansons-marathon-method")));
  assert.match(hansons, /has no pace chart/);
  assert.doesNotMatch(hansons, /taper length of \d|3-week taper/);
});

test("FAQ links point at real internal pages or the plan source", () => {
  const internal = new Set([
    "/calculator",
    "/#plan-finder",
    "/coaches",
    "/coaching/focus/marathon",
    "/coaching/focus/half-marathon",
    "/coaching/focus/beginners",
    "/guides/how-to-choose-a-training-plan",
    ...plans.map((plan) => `/plans/${plan.slug}`),
    ...new Set(plans.map((plan) => `/training-plans/${plan.distance}`)),
  ]);
  assert.ok(getGuideBySlug("how-to-choose-a-training-plan"));

  for (const slug of priority) {
    const plan = getPlanBySlug(slug);
    const copy = planPageCopy(plan);
    const hrefs = allLinks(copy).map((item) => item.href);
    assert.ok(hrefs.includes("/calculator"), slug);
    assert.ok(hrefs.includes("/#plan-finder"), slug);
    assert.ok(hrefs.some((href) => href === "/coaches" || href.startsWith("/coaching/focus/")), slug);
    assert.ok(hrefs.some((href) => href.startsWith("/plans/") && href !== `/plans/${slug}`), slug);
    for (const href of hrefs) {
      assert.ok(internal.has(href) || href === plan.source.url, `${slug} unexpected ${href}`);
    }
  }
});
