import test from "node:test";
import assert from "node:assert/strict";
import { load } from "./support/load-module.mjs";

const { getAllRacers, ageFromBorn, racesForRacer } = load("src/lib/races.ts");
const { getAllPlans } = load("src/lib/plans.ts");
const {
  COACH_DIRECTORY_HREF,
  PLAN_FINDER_HREF,
  RACER_DESCRIPTION_LIMIT,
  RACER_TITLE_LIMIT,
  birthYearFromBorn,
  bornHeaderSuffix,
  bornQuickFact,
  racerSearchMetadata,
  trainAffiliationNote,
  trainGroupsForEvents,
} = load("src/lib/racer-page.ts");

const FIVE_K = [
  "/training-plans/5k",
  "/plans/couch-to-5k",
  "/plans/base-building-4-week",
  "/plans/higdon-5k-intermediate",
];
const TEN_K = [
  "/training-plans/10k",
  "/plans/bridge-to-10k",
  "/plans/higdon-10k-intermediate",
];

const EXPECTED_LINKS = {
  Marathon: [
    "/training-plans/marathon",
    "/plans/higdon-marathon-novice-1",
    "/plans/pfitzinger-18-55",
    "/plans/hansons-marathon-method",
  ],
  "Half Marathon": [
    "/training-plans/half-marathon",
    "/plans/higdon-half-novice-1",
    "/plans/higdon-half-intermediate-1",
  ],
  "10,000m": TEN_K,
  "Cross country": TEN_K,
  "5000m": FIVE_K,
  "1500m": FIVE_K,
  Mile: FIVE_K,
  "3000m": FIVE_K,
  "800m": FIVE_K,
  "1000m": FIVE_K,
  Track: FIVE_K,
};

const planHrefs = new Set(getAllPlans().map((plan) => `/plans/${plan.slug}`));
const distanceHrefs = new Set(getAllPlans().map((plan) => `/training-plans/${plan.distance}`));

function racer(slug) {
  const found = getAllRacers().find((item) => item.slug === slug);
  assert.ok(found, slug);
  return found;
}

test("birth year is read only from a real born field", () => {
  assert.equal(birthYearFromBorn(undefined), undefined);
  assert.equal(birthYearFromBorn(""), undefined);
  assert.equal(birthYearFromBorn("nope"), undefined);
  assert.equal(birthYearFromBorn("1996"), "1996");
  assert.equal(birthYearFromBorn("1996-12-03"), "1996");
  assert.equal(bornQuickFact(undefined, undefined), undefined);
  const fact = bornQuickFact("1993-01-11", 33);
  assert.equal(fact.label, "Age");
  assert.equal(fact.value, "33 (born 1993)");
  assert.equal(bornHeaderSuffix("1993-01-11", 33), " · Age 33 (born 1993)");
  assert.equal(bornHeaderSuffix(undefined, undefined), "");
});

test("racer snippets answer with on-page facts and stay within snippet limits", () => {
  for (const athlete of getAllRacers()) {
    const meta = racerSearchMetadata(athlete);
    const year = birthYearFromBorn(athlete.born);
    const blob = `${meta.title} ${meta.description}`;
    assert.ok(
      meta.title.length <= RACER_TITLE_LIMIT,
      `${athlete.slug} title ${meta.title.length}: ${meta.title}`,
    );
    assert.ok(
      meta.description.length <= RACER_DESCRIPTION_LIMIT,
      `${athlete.slug} description ${meta.description.length}: ${meta.description}`,
    );
    assert.equal(meta.title.includes(athlete.name), true);
    assert.doesNotMatch(meta.title, /anystride|·/);
    assert.doesNotMatch(blob, /upcoming|train like|endorsed by/i);

    const pr = athlete.prs[0];
    if (pr) {
      assert.equal(meta.description.includes(pr.time), true, athlete.slug);
      assert.equal(meta.description.includes(pr.event), true, athlete.slug);
    } else {
      assert.doesNotMatch(meta.description, /\bPB\b/);
      assert.doesNotMatch(meta.description, /personal bests/i);
    }

    if (year) {
      assert.match(blob, new RegExp(`\\b${year}\\b`));
      assert.match(meta.description, new RegExp(`born ${year}`));
      const fact = bornQuickFact(athlete.born, ageFromBorn(athlete.born));
      assert.equal(fact?.value.includes(year), true);
    } else {
      assert.doesNotMatch(blob, /\b(born|age)\b/i);
      assert.equal(bornQuickFact(athlete.born, ageFromBorn(athlete.born)), undefined);
    }

    if (racesForRacer(athlete.slug).length === 0) {
      assert.doesNotMatch(meta.description, /Races on anystride/);
    }
  }
});

test("example racers lead with the personal best and birth year when it exists", () => {
  const tebello = racerSearchMetadata(racer("tebello-ramakongoana"));
  assert.equal(tebello.title, "Tebello Ramakongoana: Marathon PB 2:04:57");
  assert.equal(
    tebello.description.startsWith(
      "Lesotho marathoner Tebello Ramakongoana: Marathon PB 2:04:57. Personal bests and career highlights.",
    ),
    true,
  );
  assert.equal(racer("tebello-ramakongoana").born, undefined);

  const korir = racerSearchMetadata(racer("john-korir"));
  assert.equal(korir.title, "John Korir: Marathon PB 2:01:52, Born 1993");
  assert.match(
    korir.description,
    /^Kenya marathoner John Korir \(age \d+, born 1993\): Marathon PB 2:01:52\. Personal bests and career highlights\./,
  );
});

test("each racer event maps to existing plan routes only", () => {
  const seen = new Set(getAllRacers().flatMap((athlete) => athlete.events));
  assert.deepEqual([...seen].filter((event) => !(event in EXPECTED_LINKS)), []);

  for (const [event, hrefs] of Object.entries(EXPECTED_LINKS)) {
    const groups = trainGroupsForEvents([event]);
    assert.equal(groups.length, 1, event);
    assert.deepEqual(
      [...groups[0].links.map((link) => link.href)],
      hrefs,
      event,
    );
    for (const link of groups[0].links) {
      assert.equal(
        planHrefs.has(link.href) || distanceHrefs.has(link.href),
        true,
        link.href,
      );
    }
    const copy = `${groups[0].heading} ${groups[0].body}`;
    assert.doesNotMatch(copy, /train like|endorsed by|affiliated with/i);
  }

  const track = trainGroupsForEvents(["1500m", "Mile"]);
  assert.equal(track.length, 1);
  assert.equal(track[0].heading, "1500m and mile");
  assert.match(track[0].body, /no 1500m or mile plan/);
  assert.doesNotMatch(track[0].body, /same distance/);

  const cross = trainGroupsForEvents(["Cross country"]);
  assert.match(cross[0].body, /no cross country plan/);
  assert.doesNotMatch(cross[0].body, /same distance/);

  const five = trainGroupsForEvents(["5000m"]);
  assert.match(five[0].body, /your own 5K/);
  assert.match(five[0].body, /same distance/);

  const marathon = trainGroupsForEvents(["Marathon"]);
  assert.equal(marathon[0].heading, "marathon");
  assert.match(marathon[0].body, /Training for your own marathon\? Free plans for every level\./);

  const mixed = trainGroupsForEvents(["Marathon", "5000m", "Cross country"]);
  assert.deepEqual(
    [...mixed.map((group) => group.id)],
    ["marathon", "5k", "10k"],
  );

  assert.equal(trainGroupsForEvents(["Pole vault"]).length, 0);
  assert.equal(PLAN_FINDER_HREF, "/#plan-finder");
  assert.equal(COACH_DIRECTORY_HREF, "/coaches");

  const note = trainAffiliationNote("Tebello Ramakongoana");
  assert.match(note, /your own training/);
  assert.match(note, /not affiliated with Tebello Ramakongoana/);
  assert.match(note, /does not mean its author endorses/);
  assert.doesNotMatch(note, /train like/i);
});
