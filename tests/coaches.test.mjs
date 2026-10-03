import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { load } from "./support/load-module.mjs";

const { COACHES } = load("src/data/coaches.ts");
const { VDOT_COACHES } = load("src/data/vdot-coaches.generated.ts");
const { availableCities } = load("src/lib/coaches.ts");
const { citySlug } = load("src/lib/slug.ts");
const { getAllSitePaths } = load("src/lib/site-urls.ts");
const registry = JSON.parse(
  readFileSync(
    new URL("../src/data/vdot-coach-registry.generated.json", import.meta.url),
    "utf8",
  ),
);
const coachPageSource = readFileSync(
  new URL("../src/app/coaching/[slug]/page.tsx", import.meta.url),
  "utf8",
);

const FORMATS = new Set(["online", "in-person", "hybrid"]);
const FOCUSES = new Set([
  "first-timers",
  "5k-10k",
  "half",
  "marathon",
  "performance",
  "injury-aware",
  "triathlon",
]);
const REGISTRY_STATUSES = new Set(["ready", "review", "invalid-profile", "duplicate"]);

function assertNonemptyString(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string`);
  assert.notEqual(value.trim(), "", `${label} must not be empty`);
}

function parsedUrl(value, label, protocols = new Set(["http:", "https:", "mailto:"])) {
  assertNonemptyString(value, label);
  const parsed = new URL(value);
  assert.ok(protocols.has(parsed.protocol), `${label} has an unsupported protocol`);
  return parsed;
}

function assertStringList(value, label) {
  assert.ok(Array.isArray(value), `${label} must be an array`);
  assert.ok(value.length > 0, `${label} must not be empty`);
  value.forEach((item, index) => assertNonemptyString(item, `${label}[${index}]`));
}

function assertIsoDate(value, label) {
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/, `${label} must be an ISO date`);
  assert.ok(!Number.isNaN(Date.parse(`${value}T00:00:00Z`)), `${label} must be a real date`);
}

test("coach records are complete, route-safe, and use known directory values", () => {
  assert.ok(COACHES.length > 0);
  const slugs = new Set();

  for (const coach of COACHES) {
    assert.match(
      coach.slug,
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      `${coach.slug || coach.name}: slug must be lowercase kebab-case`,
    );
    assert.ok(!slugs.has(coach.slug), `duplicate coach slug: ${coach.slug}`);
    slugs.add(coach.slug);

    for (const field of ["name", "city", "location", "blurb"]) {
      assertNonemptyString(coach[field], `${coach.slug}.${field}`);
    }
    assert.ok(FORMATS.has(coach.format), `${coach.slug}: unknown format ${coach.format}`);
    assertStringList(coach.focus, `${coach.slug}.focus`);
    coach.focus.forEach((focus) =>
      assert.ok(FOCUSES.has(focus), `${coach.slug}: unknown focus ${focus}`),
    );
    assert.equal(new Set(coach.focus).size, coach.focus.length, `${coach.slug}: duplicate focus`);
    assertStringList(coach.specialties, `${coach.slug}.specialties`);
    assertStringList(coach.bio, `${coach.slug}.bio`);
    assert.doesNotMatch(
      coach.bio.join(" "),
      /\b(?:according to|(?:website|site|source|listing)\s+(?:describes|says|states))\b/i,
      `${coach.slug}: bio should describe the offering instead of its source`,
    );
    parsedUrl(coach.link, `${coach.slug}.link`);
    assertNonemptyString(coach.source?.name, `${coach.slug}.source.name`);
    parsedUrl(coach.source?.url, `${coach.slug}.source.url`);
    assert.equal(typeof coach.verified, "boolean", `${coach.slug}.verified must be boolean`);

    if (coach.experience !== undefined) {
      assertNonemptyString(coach.experience, `${coach.slug}.experience`);
    }
    if (coach.discoveredFrom !== undefined) {
      assertNonemptyString(coach.discoveredFrom.name, `${coach.slug}.discoveredFrom.name`);
      parsedUrl(coach.discoveredFrom.url, `${coach.slug}.discoveredFrom.url`);
    }
    if (coach.sourceCheckedAt !== undefined) {
      assertIsoDate(coach.sourceCheckedAt, `${coach.slug}.sourceCheckedAt`);
    }
  }
});

test("V.O2 imports are independently sourced and retain discovery provenance", () => {
  assert.ok(VDOT_COACHES.length > 0, "expected at least one reviewed V.O2 import");
  const allSlugs = new Set(COACHES.map((coach) => coach.slug));

  for (const coach of VDOT_COACHES) {
    assert.ok(allSlugs.has(coach.slug), `${coach.slug}: generated coach is absent from COACHES`);
    assert.equal(coach.verified, false, `${coach.slug}: an imported profile cannot be pre-verified`);
    assert.doesNotMatch(
      coach.bio.join(" "),
      /public website describes/i,
      `${coach.slug}: imported copy should describe the offering directly`,
    );

    const link = parsedUrl(
      coach.link,
      `${coach.slug}.link`,
      new Set(["http:", "https:"]),
    );
    const source = parsedUrl(
      coach.source?.url,
      `${coach.slug}.source.url`,
      new Set(["http:", "https:"]),
    );
    for (const [label, url] of [
      ["link", link],
      ["source", source],
    ]) {
      assert.ok(
        !/(^|\.)vdoto2\.com$/i.test(url.hostname),
        `${coach.slug}: ${label} must be an independent coach website`,
      );
    }

    const discovery = parsedUrl(
      coach.discoveredFrom?.url,
      `${coach.slug}.discoveredFrom.url`,
      new Set(["http:", "https:"]),
    );
    assert.ok(
      /(^|\.)vdoto2\.com$/i.test(discovery.hostname),
      `${coach.slug}: discovery provenance must point to V.O2`,
    );
    assert.match(discovery.pathname, /^\/running-coach\//, `${coach.slug}: invalid V.O2 profile URL`);
    assertIsoDate(coach.sourceCheckedAt, `${coach.slug}.sourceCheckedAt`);
  }
});

test("coach pages keep marketplace discovery provenance out of public copy", () => {
  assert.doesNotMatch(coachPageSource, /coach\.discoveredFrom/);
  assert.doesNotMatch(coachPageSource, /discovered through/i);
});

test("coach and city routes do not collide in the sitemap", () => {
  const paths = getAllSitePaths();
  assert.equal(new Set(paths).size, paths.length, "sitemap contains duplicate paths");

  const profileRoutes = COACHES.map((coach) => `/coaching/${coach.slug}`);
  assert.equal(new Set(profileRoutes).size, profileRoutes.length, "coach profile routes collide");
  for (const route of profileRoutes) {
    assert.ok(paths.includes(route), `sitemap is missing ${route}`);
  }

  const cityRoutes = new Map();
  for (const city of availableCities()) {
    const slug = citySlug(city);
    assertNonemptyString(slug, `citySlug(${city})`);
    assert.ok(!cityRoutes.has(slug), `${city} collides with ${cityRoutes.get(slug)} at ${slug}`);
    cityRoutes.set(slug, city);
    assert.ok(paths.includes(`/running-coaches/${slug}`), `sitemap is missing city ${city}`);
  }
});

test("the V.O2 audit registry accounts for every discovered and published profile", () => {
  assert.ok(Array.isArray(registry), "V.O2 registry must be an array");
  assert.equal(registry.length, 186, "the audited V.O2 directory count changed");
  assert.equal(
    registry.filter((entry) => entry.status === "invalid-profile").length,
    1,
    "expected the single dead directory profile to remain recorded",
  );

  const profileUrls = new Set();
  for (const [index, entry] of registry.entries()) {
    const label = `registry[${index}]`;
    const profile = parsedUrl(entry.profileUrl, `${label}.profileUrl`, new Set(["https:"]));
    assert.ok(/(^|\.)vdoto2\.com$/i.test(profile.hostname), `${label}: profile is not on V.O2`);
    assertNonemptyString(entry.slug, `${label}.slug`);
    assertNonemptyString(entry.name, `${label}.name`);
    assertNonemptyString(entry.location, `${label}.location`);
    assert.ok(REGISTRY_STATUSES.has(entry.status), `${label}: unknown status ${entry.status}`);
    assert.ok(!profileUrls.has(entry.profileUrl), `${label}: duplicate discovery URL`);
    profileUrls.add(entry.profileUrl);

    if (entry.status === "ready") {
      assertNonemptyString(entry.coachSlug, `${label}.coachSlug`);
      const website = parsedUrl(
        entry.website?.url,
        `${label}.website.url`,
        new Set(["http:", "https:"]),
      );
      assert.ok(!/(^|\.)vdoto2\.com$/i.test(website.hostname), `${label}: website is not independent`);
      assertNonemptyString(entry.website.discoveryMethod, `${label}.website.discoveryMethod`);
      assertNonemptyString(entry.website.confidence, `${label}.website.confidence`);
      assertIsoDate(entry.website.checkedAt, `${label}.website.checkedAt`);
      assertStringList(entry.website.evidence, `${label}.website.evidence`);
      assertStringList(entry.website.pages, `${label}.website.pages`);
      entry.website.pages.forEach((page, pageIndex) =>
        parsedUrl(page, `${label}.website.pages[${pageIndex}]`, new Set(["http:", "https:"])),
      );
    } else {
      assertNonemptyString(entry.reason, `${label}.reason`);
    }
  }

  const readySlugs = registry
    .filter((entry) => entry.status === "ready" && entry.coachSlug)
    .map((entry) => entry.coachSlug);
  const importedSlugs = VDOT_COACHES.map((coach) => coach.slug);
  assert.equal(new Set(readySlugs).size, readySlugs.length, "ready registry rows reuse a coach slug");
  assert.deepEqual(
    [...importedSlugs].sort(),
    [...readySlugs].sort(),
    "generated coaches and ready registry rows must match",
  );
});
