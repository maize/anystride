import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { load } from "./support/load-module.mjs";

const {
  PUBLISHED_DIACRITIC_CITIES,
  citySlug,
  legacyCitySlug,
  legacyRunningCoachRedirect,
  runningCoachLegacyRedirects,
} = load("src/lib/slug.ts");
const { availableCities, getCityByLegacySlugFor } = load("src/lib/coaches.ts");

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("city slugs transliterate Latin letters instead of dropping them", () => {
  assert.equal(citySlug("Järvsö"), "jarvso");
  assert.equal(legacyCitySlug("Järvsö"), "j-rvs");
  assert.equal(citySlug("Malmö"), "malmo");
  assert.equal(legacyCitySlug("Malmö"), "malm");
  assert.equal(citySlug("Fürth"), "furth");
  assert.equal(citySlug("São Paulo"), "sao-paulo");
  assert.equal(legacyCitySlug("São Paulo"), "s-o-paulo");
  assert.equal(citySlug("Montréal"), "montreal");
  assert.equal(citySlug("Zürich"), "zurich");
  assert.equal(citySlug("Åland"), "aland");
  assert.equal(legacyCitySlug("Åland"), "land");
  assert.equal(citySlug("Évry"), "evry");
  assert.equal(citySlug("Ærø"), "aero");
  assert.equal(citySlug("Straße"), "strasse");
  assert.equal(citySlug("New York"), "new-york");
  assert.equal(legacyCitySlug("New York"), "new-york");
  assert.equal(citySlug("San Francisco"), "san-francisco");
});

test("published diacritic cities redirect from the slug that dropped letters", () => {
  assert.deepEqual([...PUBLISHED_DIACRITIC_CITIES], ["Järvsö"]);
  assert.deepEqual(plain(runningCoachLegacyRedirects(["Järvsö", "New York"])), [
    { source: "/running-coaches/j-rvs", destination: "/running-coaches/jarvso" },
  ]);
  assert.equal(legacyRunningCoachRedirect("/running-coaches/j-rvs"), "/running-coaches/jarvso");
  assert.equal(legacyRunningCoachRedirect("/running-coaches/jarvso"), null);
  assert.deepEqual(plain(runningCoachLegacyRedirects(availableCities())), []);
  assert.deepEqual(plain(runningCoachLegacyRedirects(["Järvsö", "J-rvsö"])), [
    { source: "/running-coaches/j-rvs", destination: "/running-coaches/jarvso" },
  ]);
});

test("legacy city lookup ignores slugs that did not change", () => {
  assert.equal(getCityByLegacySlugFor([{ city: "Järvsö" }], "j-rvs"), "Järvsö");
  assert.equal(getCityByLegacySlugFor([{ city: "Järvsö" }], "jarvso"), undefined);
  assert.equal(getCityByLegacySlugFor([{ city: "Boston" }], "boston"), undefined);
  assert.equal(getCityByLegacySlugFor([{ city: "Järvsö" }], ""), undefined);
});

test("the broken Järvsö URL is a 301 and city canonicals use the transliterated slug", async () => {
  const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(config, /runningCoachLegacyRedirects\(PUBLISHED_DIACRITIC_CITIES\)/);
  assert.match(config, /statusCode:\s*301/);

  const page = readFileSync(new URL("../src/app/running-coaches/[city]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /canonical: `\/running-coaches\/\$\{citySlug\(city\)\}`/);
  assert.match(page, /permanentRedirect\(`\/running-coaches\/\$\{citySlug\(legacy\)\}`\)/);

  const { NextResponse } = await import("next/server.js");
  const { default: proxy } = load(
    "src/proxy.ts",
    {
      "next/server": { NextResponse },
      "@supabase/ssr": { createServerClient: () => ({ auth: { getClaims: async () => ({}) } }) },
      "@/lib/marketplace-config": {
        marketplaceEnabled: () => false,
        marketplaceOrigin: () => "https://anystride.test",
      },
    },
    { Headers, URL },
  );
  const nextUrl = new URL("https://anystride.test/running-coaches/j-rvs");
  nextUrl.clone = () => new URL(nextUrl.href);
  const response = await proxy({ nextUrl });
  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://anystride.test/running-coaches/jarvso");
});

test("sitemap pages that had no canonical now declare one", () => {
  for (const [file, path] of [
    ["src/app/compare/page.tsx", "/compare"],
    ["src/app/calculator/page.tsx", "/calculator"],
  ]) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(source, new RegExp(`canonical: "${path}"`));
  }
});
