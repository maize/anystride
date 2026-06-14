import { COACHES, FOCUS_ORDER, type Coach, type CoachFocus, type CoachFormat } from "@/data/coaches";

export function getAllCoaches(): Coach[] {
  // Verified coaches first, then by name.
  return [...COACHES].sort(
    (a, b) => Number(b.verified) - Number(a.verified) || a.name.localeCompare(b.name),
  );
}

export function getCoachBySlug(slug: string): Coach | undefined {
  return COACHES.find((c) => c.slug === slug);
}

export function filterCoaches(opts: {
  focus?: CoachFocus;
  format?: CoachFormat;
}): Coach[] {
  return getAllCoaches().filter(
    (c) =>
      (!opts.focus || c.focus.includes(opts.focus)) &&
      (!opts.format || c.format === opts.format),
  );
}

/** Focus tags that at least one coach offers, in display order. */
export function availableFocuses(): CoachFocus[] {
  const present = new Set(COACHES.flatMap((c) => c.focus));
  return FOCUS_ORDER.filter((f) => present.has(f));
}
