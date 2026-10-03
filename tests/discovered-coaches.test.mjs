import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { load } from "./support/load-module.mjs";

const fixture = {
  slug: "coach-fixture-runner",
  name: "Fixture Runner",
  city: "Online",
  location: "Global",
  format: "online",
  focus: ["marathon", "performance"],
  specialties: ["Marathon", "Personalized training"],
  experience: "10 years",
  blurb: "Fixture Runner offers online marathon coaching.",
  bio: ["Offers personalized online marathon coaching."],
  link: "https://coach.example/services",
  source: { name: "coach.example", url: "https://coach.example/services" },
  sourceCheckedAt: "2026-10-03",
  verified: false,
};

function store({ env = {}, rows = [], error, logs = [] } = {}) {
  const pools = [];
  const queries = [];
  class Pool {
    constructor(config) {
      this.config = config;
      pools.push(this);
    }
    on() {}
    async query(sql) {
      queries.push(sql);
      if (error) throw error;
      return { rows };
    }
  }
  const loaded = load(
    "src/lib/discovered-coach-store.ts",
    { "server-only": {}, pg: { Pool } },
    {
      process: { env },
      console: { error: (message) => logs.push(message) },
    },
  );
  return { ...loaded, pools, queries, logs };
}

test("discovered coach storage requires its dedicated database credential", async () => {
  const noCredential = store({
    env: { POSTGRES_URL: "postgres://ignored:ignored@db.example/ignored" },
  });
  assert.equal((await noCredential.loadDiscoveredCoaches()).length, 0);
  assert.equal(noCredential.pools.length, 0);

  const malformed = store({ env: { COACH_DISCOVERY_DATABASE_URL: "https://db.example/data" } });
  assert.equal((await malformed.loadDiscoveredCoaches()).length, 0);
  assert.equal(malformed.pools.length, 0);
});

test("the private store selects only validated Coach JSON from the sanitized view", async () => {
  const extra = { ...fixture, private_reddit_id: "must-not-escape" };
  const invalid = { ...fixture, slug: "Not Route Safe" };
  const subject = store({
    env: { COACH_DISCOVERY_DATABASE_URL: "postgres://reader:secret@db.example/anystride" },
    rows: [{ coach: extra }, { coach: invalid }, { coach: null }],
  });

  const coaches = await subject.loadDiscoveredCoaches();
  assert.equal(coaches.length, 1);
  assert.equal(coaches[0].slug, fixture.slug);
  assert.equal("private_reddit_id" in coaches[0], false);
  assert.match(subject.queries[0], /^SELECT coach FROM public\.reddit_coach_directory\s/);
  assert.doesNotMatch(subject.queries[0], /reddit_(?:post|author|user|permalink)/i);
  assert.equal(subject.pools[0].config.options, "-c default_transaction_read_only=on");
  assert.equal(subject.pools[0].config.ssl.rejectUnauthorized, true);
});

test("discovered coach validation rejects private provenance and unsafe public fields", () => {
  const { parseDiscoveredCoach } = store();
  assert.ok(parseDiscoveredCoach(fixture));
  assert.equal(parseDiscoveredCoach({ ...fixture, verified: true }), null);
  assert.equal(parseDiscoveredCoach({ ...fixture, discoveredFrom: { name: "Reddit", url: "https://reddit.com" } }), null);
  assert.equal(parseDiscoveredCoach({ ...fixture, link: "javascript:alert(1)" }), null);
  assert.equal(parseDiscoveredCoach({ ...fixture, link: "https://127.0.0.1/private", source: { name: "local", url: "https://127.0.0.1/private" } }), null);
  assert.equal(parseDiscoveredCoach({ ...fixture, source: { name: "other", url: "https://other.example/" } }), null);
  assert.equal(parseDiscoveredCoach({ ...fixture, source: { name: "u/private", url: fixture.source.url } }), null);
  assert.equal(parseDiscoveredCoach({ ...fixture, bio: ["Line one\nprivate line"] }), null);
  assert.equal(parseDiscoveredCoach({ ...fixture, name: "</script><script>alert(1)</script>" }), null);
});

test("database failures return an empty catalog without exposing error details", async () => {
  const logs = [];
  const subject = store({
    env: { COACH_DISCOVERY_DATABASE_URL: "postgres://reader:secret@db.example/anystride" },
    error: new Error("password reader:secret table raw_reddit_posts"),
    logs,
  });
  assert.equal((await subject.loadDiscoveredCoaches()).length, 0);
  assert.deepEqual(logs, ["Discovered coach catalog could not be loaded."]);
  assert.doesNotMatch(logs.join(" "), /secret|raw_reddit_posts/i);
});

test("merged catalogs give static profiles precedence across slug, name, and website", () => {
  const { COACHES } = load("src/data/coaches.ts");
  const { mergeCoachCatalog } = load("src/lib/coaches.ts");
  const unique = { ...fixture };
  const sameSlug = { ...fixture, slug: COACHES[0].slug, name: "Different Coach", link: "https://different.example", source: { name: "different.example", url: "https://different.example" } };
  const sameName = { ...fixture, slug: "different-slug", name: ` ${COACHES[0].name.toUpperCase()} `, link: "https://another.example", source: { name: "another.example", url: "https://another.example" } };
  const sameWebsite = { ...fixture, slug: "different-website-slug", name: "Website Duplicate", link: `${COACHES[0].source.url}elsewhere`, source: { name: COACHES[0].source.name, url: `${COACHES[0].source.url}elsewhere` } };
  const discoveredDomainDuplicate = { ...fixture, slug: "fixture-domain-copy", name: "Fixture Domain Copy", link: "https://www.coach.example/other", source: { name: "coach.example", url: "https://www.coach.example/other" } };

  const merged = mergeCoachCatalog([sameSlug, sameName, sameWebsite, unique, discoveredDomainDuplicate]);
  assert.equal(merged.length, COACHES.length + 1);
  assert.equal(merged.filter((coach) => coach.slug === unique.slug).length, 1);
  assert.equal(merged.some((coach) => coach.slug === discoveredDomainDuplicate.slug), false);
});

test("public coach surfaces load the request-time catalog", () => {
  const files = [
    "src/app/coaching/page.tsx",
    "src/app/coaching/[slug]/page.tsx",
    "src/app/running-coaches/[city]/page.tsx",
    "src/app/sitemap.ts",
  ];
  for (const file of files) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(source, /export const dynamic = ["']force-dynamic["']/);
    assert.match(source, /WithDiscovered|CoachCatalog|availableCitiesFor/);
  }
  const indexNow = readFileSync(new URL("../src/app/api/indexnow/route.ts", import.meta.url), "utf8");
  assert.match(indexNow, /await getAllSitePathsWithDiscovered\(\)/);
});
