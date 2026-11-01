import assert from "node:assert/strict";
import test from "node:test";
import { load } from "./support/load-module.mjs";

const { raceStructuredData } = load("src/lib/race-structured-data.ts");
const { getRaceBySlug, getRacerBySlug } = load("src/lib/races.ts");
const { getAllSitePaths } = load("src/lib/site-urls.ts");

test("Search Console's missing racer exists and all sitemap racer URLs resolve", () => {
  assert.equal(getRacerBySlug("amane-beriso")?.name, "Amane Beriso");
  for (const path of getAllSitePaths().filter((path) => path.startsWith("/racers/"))) {
    assert.ok(getRacerBySlug(path.slice("/racers/".length)), path);
  }
});

test("Monaco markup retains status and visible athletes after the race", () => {
  const data = raceStructuredData(getRaceBySlug("monaco-diamond-league-2026"));
  assert.equal(data.eventStatus, "https://schema.org/EventScheduled");
  assert.equal(data.startDate, "2026-07-10");
  assert.equal(data.endDate, "2026-07-10");
  assert.deepEqual(Array.from(data.performer, (person) => person.name), ["Emmanuel Wanyonyi", "Jake Wightman", "Agnes Jebet Ngetich"]);
  for (const field of ["offers", "image", "organizer"]) assert.equal(field in data, false);
});

test("precise race schedules retain the confirmed time and timezone", () => {
  const race = getRaceBySlug("tokyo-marathon-2026");
  assert.equal(raceStructuredData(race).startDate, race.startsAt);
});
