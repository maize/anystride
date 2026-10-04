import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import { COACHES, type Coach } from "@/data/coaches";
import type { MarketplaceActor } from "./marketplace-auth";
import { marketplaceEnabled, MarketplaceError } from "./marketplace-config";
import { marketplaceTransaction } from "./marketplace-store";
import { importedCoachCandidate, importedCoachCandidates, type ImportedCoachCandidate } from "./imported-coach-catalog";
import { parseImportedCoachDetails, type ImportedCoachAction, type ImportedCoachDetails } from "./imported-coach-input";

interface ReviewRow {
  entry_key: string; status: "draft" | "published" | "hidden"; profile: Coach | null;
  notes: string; version: number; source_revision: string; last_request_hash: string;
  reviewed_by: string; reviewed_at: Date;
}
export interface ImportedCoachReview extends ImportedCoachCandidate {
  status: "unreviewed" | "draft" | "published" | "hidden";
  version: number; notes: string; reviewedAt: string | null; sourceChanged: boolean;
  visible: boolean;
}
function requireAdmin(actor: MarketplaceActor) {
  if (!actor.admin) throw new MarketplaceError("Administrator access required.", 403);
}
function excluded(entry: ImportedCoachCandidate) {
  return ["duplicate", "invalid-profile"].includes(entry.importStatus);
}
function profileFromDetails(entry: ImportedCoachCandidate, details: ImportedCoachDetails, checkedAt?: string): Coach {
  return {
    ...details, slug: entry.slug, verified: false,
    source: { name: new URL(details.link).hostname.replace(/^www\./, ""), url: details.link },
    discoveredFrom: { name: "V.O2 coach marketplace", url: entry.sourceUrl },
    ...(checkedAt ? { sourceCheckedAt: checkedAt } : {}),
  };
}
function publicProfile(entry: ImportedCoachCandidate, profile: Coach): Coach {
  // Copy only public fields, and never turn editorial approval into ownership verification.
  const { name, city, location, format, focus, specialties, experience, blurb, bio, link } = profile;
  const details = parseImportedCoachDetails({ name, city, location, format, focus, specialties, experience, blurb, bio, link });
  const checkedAt = /^\d{4}-\d{2}-\d{2}$/.test(profile.sourceCheckedAt ?? "") ? profile.sourceCheckedAt : undefined;
  return { ...profileFromDetails(entry, details, checkedAt), editoriallyReviewed: true };
}
async function rows() {
  try {
    return await marketplaceTransaction(async (client) => (await client.query<ReviewRow>("SELECT entry_key,status,profile,notes,version,source_revision,last_request_hash,reviewed_by,reviewed_at FROM imported_coach_reviews")).rows);
  } catch (error) {
    if ((error as { code?: string })?.code === "42P01") throw new MarketplaceError("Imported coach reviews need database migration 005 before they can be used.", 503);
    throw error;
  }
}

export async function importedCoachReviews(actor: MarketplaceActor): Promise<ImportedCoachReview[]> {
  requireAdmin(actor);
  const saved = new Map((await rows()).map((row) => [row.entry_key, row]));
  return importedCoachCandidates.map((entry) => {
    const row = saved.get(entry.key);
    return {
      ...entry, profile: row?.profile ?? entry.profile,
      status: row?.status ?? "unreviewed", version: row?.version ?? 0, notes: row?.notes ?? "",
      reviewedAt: row ? new Date(row.reviewed_at).toISOString() : null,
      sourceChanged: Boolean(row && row.source_revision !== entry.sourceRevision),
      visible: !excluded(entry) && (row ? row.status === "published" : entry.legacyVisible),
    };
  });
}

export function applyImportedCoachReviews(saved: ReviewRow[]): Coach[] {
  const byKey = new Map(saved.map((row) => [row.entry_key, row]));
  return importedCoachCandidates.flatMap((entry) => {
    if (excluded(entry)) return [];
    const row = byKey.get(entry.key);
    if (!row) return entry.legacyVisible && entry.profile ? [entry.profile] : [];
    if (row.status !== "published" || !row.profile) return [];
    try { return [publicProfile(entry, row.profile)]; } catch { return []; }
  });
}

// Request-scoped only. Hidden decisions must never be bypassed by stale public caches
// or by falling back to the generated directory when storage cannot be read.
export const publicImportedCoaches = cache(async (): Promise<Coach[]> => {
  if (!marketplaceEnabled()) return [];
  try { return applyImportedCoachReviews(await rows()); }
  catch { console.error("Imported coach publication status could not be loaded."); return []; }
});

export async function reviewImportedCoach(actor: MarketplaceActor, input: ImportedCoachAction) {
  requireAdmin(actor);
  const entry = importedCoachCandidate(input.key);
  if (!entry) throw new MarketplaceError("Imported coach not found.", 404);
  if (entry.sourceRevision !== input.sourceRevision) throw new MarketplaceError("The import changed. Reload this review before saving.", 409);
  if (excluded(entry) && input.status === "published") throw new MarketplaceError("This import was excluded as a duplicate or invalid profile. It cannot be published.", 409);
  const hash = createHash("sha256").update(JSON.stringify({ actor: actor.id, ...input })).digest("hex");
  return marketplaceTransaction(async (client) => {
    // Serialize all editorial publications, including first writes and duplicate checks.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('imported-coach-review', 0))");
    const { rows: [current] } = await client.query<ReviewRow>("SELECT * FROM imported_coach_reviews WHERE entry_key=$1 FOR UPDATE", [input.key]);
    if (current?.last_request_hash === hash && current.version === input.version + 1) return { saved: true };
    if ((current?.version ?? 0) !== input.version) throw new MarketplaceError("Another review changed this listing. Reload before saving; your edits are still in this form.", 409);
    const profile = input.profile ? profileFromDetails(entry, input.profile,
      input.status === "published" ? new Date().toISOString().slice(0, 10) : undefined) : current?.profile ?? entry.profile;
    if (input.status === "published" && profile) {
      const normalize = (name: string) => name.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const others = (await client.query<ReviewRow>("SELECT * FROM imported_coach_reviews WHERE entry_key<>$1", [input.key])).rows;
      const catalog = [...COACHES.filter((coach) => !coach.discoveredFrom), ...applyImportedCoachReviews(others)].filter((coach) => coach.slug !== entry.slug);
      if (catalog.some((coach) => normalize(coach.name) === normalize(profile.name))) throw new MarketplaceError("A directory profile with this name already exists. Check for a duplicate before publishing.", 409);
    }
    await client.query(`INSERT INTO imported_coach_reviews (entry_key,status,profile,notes,version,source_revision,last_request_hash,reviewed_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (entry_key) DO UPDATE SET status=EXCLUDED.status,profile=EXCLUDED.profile,notes=EXCLUDED.notes,
      version=EXCLUDED.version,source_revision=EXCLUDED.source_revision,last_request_hash=EXCLUDED.last_request_hash,
      reviewed_by=EXCLUDED.reviewed_by,reviewed_at=now()`,
    [input.key, input.status, profile ? JSON.stringify(profile) : null, input.notes, input.version + 1, input.sourceRevision, hash, actor.id]);
    await client.query("INSERT INTO marketplace_audit (actor_id,action,target_id) VALUES ($1,$2,$3)", [actor.id, `imported-coach:${input.status}`, input.key]);
    return { saved: true };
  });
}
