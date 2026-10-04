import "server-only";
import { createHash } from "node:crypto";
import registry from "@/data/vdot-coach-registry.generated.json";
import { LEGACY_IMPORTED_SLUGS } from "@/data/imported-coach-legacy";
import type { Coach } from "@/data/coaches";

export interface ImportedCoachCandidate {
  key: string;
  slug: string;
  name: string;
  location: string;
  sourceUrl: string;
  importStatus: string;
  reason: string;
  profile: Coach | null;
  legacyVisible: boolean;
  sourceRevision: string;
}

// The full registry is server-only. Only the selected editor's data goes to the client.
export const importedCoachCandidates: ImportedCoachCandidate[] = registry.map((entry) => {
  const profile = "coach" in entry ? entry.coach as Coach : null;
  const slug = profile?.slug ?? `coach-${entry.slug}`;
  return {
    key: `vdot:${entry.slug}`, slug, name: entry.name, location: entry.location,
    sourceUrl: entry.profileUrl, importStatus: entry.status,
    reason: "reason" in entry ? entry.reason ?? "" : "",
    profile,
    legacyVisible: entry.status === "ready" && LEGACY_IMPORTED_SLUGS.has(slug),
    sourceRevision: createHash("sha256").update(JSON.stringify(entry)).digest("hex"),
  };
});

export function importedCoachCandidate(key: string) {
  return importedCoachCandidates.find((entry) => entry.key === key);
}
