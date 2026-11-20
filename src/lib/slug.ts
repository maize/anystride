/**
 * Letters that do not decompose under NFKD. å, ä, ö, é and other Latin
 * letters with diacritics are handled by stripping combining marks.
 */
const LETTERS: Record<string, string> = {
  æ: "ae",
  ø: "o",
  œ: "oe",
  ß: "ss",
  ł: "l",
  đ: "d",
  ð: "d",
  þ: "th",
  ı: "i",
  ŋ: "n",
};

/**
 * City names already published under the slug that dropped non-ASCII letters.
 * Järvsö is the live page at /running-coaches/j-rvs.
 */
export const PUBLISHED_DIACRITIC_CITIES = ["Järvsö"] as const;

/** "New York" -> "new-york". "Järvsö" -> "jarvso". */
export function citySlug(city: string): string {
  const lowered = city.trim().toLocaleLowerCase("en-US");
  const mapped = [...lowered].map((char) => LETTERS[char] ?? char).join("");
  return mapped
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Previous slug: non-ASCII letters were deleted instead of transliterated. */
export function legacyCitySlug(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function runningCoachLegacyRedirects(cities: readonly string[]): { source: string; destination: string }[] {
  const byLegacy = new Map<string, string>();
  for (const city of cities) {
    const next = citySlug(city);
    const legacy = legacyCitySlug(city);
    if (!legacy || !next || legacy === next) continue;
    const existing = byLegacy.get(legacy);
    if (existing && existing !== next) continue;
    byLegacy.set(legacy, next);
  }
  return [...byLegacy].map(([legacy, next]) => ({
    source: `/running-coaches/${legacy}`,
    destination: `/running-coaches/${next}`,
  }));
}

const publishedLegacyRedirects = new Map(
  runningCoachLegacyRedirects(PUBLISHED_DIACRITIC_CITIES).map((redirect) => [redirect.source, redirect.destination]),
);

/** 301 target for a published broken city URL, or null when the path is already canonical. */
export function legacyRunningCoachRedirect(pathname: string): string | null {
  return publishedLegacyRedirects.get(pathname) ?? null;
}
