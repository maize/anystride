import "server-only";
import { cache } from "react";
import { COACHES } from "@/data/coaches";
import { getAllCoachesWithDiscovered } from "./coaches";
import type { MarketplaceActor } from "./marketplace-auth";
import { marketplaceEnabled, MarketplaceError } from "./marketplace-config";
import { marketplaceTransaction } from "./marketplace-store";
import { directoryContactEmail, normalizeCoachEmail, type CoachProfileMergeInput } from "./coach-profile-merge-input";

export const coachProfileMergeMatches = cache(async (actor: MarketplaceActor) => {
  const email = normalizeCoachEmail(actor.email);
  if (!email || !marketplaceEnabled()) return [];
  const potential = await marketplaceTransaction(async (db) => {
    const { rows: contacts } = await db.query<{ directory_slug: string; email: string }>("SELECT directory_slug,email FROM coach_profile_contacts WHERE email=$1 OR directory_slug=ANY($2::text[])", [email, COACHES.filter((c) => directoryContactEmail(c.link) === email).map((c) => c.slug)]);
    const known = new Map(contacts.map((row) => [row.directory_slug, row.email]));
    const slugs = new Set(contacts.filter((row) => row.email === email).map((row) => row.directory_slug));
    for (const coach of COACHES) if ((known.get(coach.slug) ?? directoryContactEmail(coach.link)) === email) slugs.add(coach.slug);
    if (!slugs.size) return [];
    const { rows: linked } = await db.query<{ directory_slug: string }>("SELECT directory_slug FROM coach_profile_merges WHERE directory_slug=ANY($1::text[])", [[...slugs]]);
    for (const row of linked) slugs.delete(row.directory_slug);
    return [...slugs];
  });
  if (!potential.length) return [];
  const catalog = await getAllCoachesWithDiscovered();
  return catalog.filter((coach) => potential.includes(coach.slug));
});

/** Public linkage contains no emails, user IDs, private notes or account data. */
export const publicCoachProfileMerges = cache(async () => {
  if (!marketplaceEnabled()) return [];
  return marketplaceTransaction(async (db) => (await db.query<{ directory_slug: string; storefront_slug: string | null; status: string }>(`SELECT m.directory_slug,p.slug AS storefront_slug,c.status FROM coach_profile_merges m
    JOIN marketplace_coaches c ON c.user_id=m.coach_id LEFT JOIN marketplace_storefronts p ON p.coach_id=c.user_id AND p.published
    WHERE c.status IN ('approved','suspended') LIMIT 1000`)).rows);
});

export async function mergeCoachProfile(actor: MarketplaceActor, input: CoachProfileMergeInput) {
  // Eligibility is recomputed for POST. A guessed slug or client-provided email is not proof.
  const candidate = (await coachProfileMergeMatches(actor)).find((coach) => coach.slug === input.slug);
  return marketplaceTransaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`marketplace:${actor.id}`]);
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`coach-profile-merge:${input.slug}`]);
    const { rows: [linked] } = await db.query("SELECT coach_id FROM coach_profile_merges WHERE directory_slug=$1", [input.slug]);
    if (linked?.coach_id === actor.id) return { saved: true };
    if (linked || !candidate) throw new MarketplaceError("No matching coach profile is available for this account.", 404);
    // Lock the private contact row so an admin correction cannot race with ownership verification.
    const { rows: [contact] } = await db.query("SELECT email FROM coach_profile_contacts WHERE directory_slug=$1 FOR SHARE", [input.slug]);
    if ((contact?.email ?? directoryContactEmail(candidate.link)) !== normalizeCoachEmail(actor.email)) throw new MarketplaceError("No matching coach profile is available for this account.", 404);
    const { rows: [coach] } = await db.query("SELECT status FROM marketplace_coaches WHERE user_id=$1 FOR UPDATE", [actor.id]);
    if (coach && !["pending", "approved"].includes(coach.status)) throw new MarketplaceError("Your coach account needs review before you can merge a profile.", 403);
    if (!coach && !input.application) throw new MarketplaceError("Complete your coaching details to request a merge.", 400);
    if (coach && input.application) throw new MarketplaceError("Your application already exists. Refresh before merging.", 409);
    if (!coach && input.application) {
      const a = input.application;
      await db.query("INSERT INTO marketplace_coaches(user_id,name,bio,credentials) VALUES($1,$2,$3,$4)", [actor.id, a.name, a.bio, a.credentials]);
      await db.query("INSERT INTO marketplace_audit(actor_id,action,target_id) VALUES($1,'apply',$1)", [actor.id]);
    }
    // Preserve imported public details as a private draft without overwriting an existing storefront.
    const approach = candidate.bio.join("\n\n");
    if (candidate.slug.length <= 70 && approach.length >= 40) {
      await db.query(`INSERT INTO marketplace_storefronts(coach_id,slug,headline,location,photo_url,specialties,approach,published)
        VALUES($1,$2,$3,$4,'',$5,$6,false) ON CONFLICT DO NOTHING`,
      [actor.id, candidate.slug, candidate.blurb.slice(0, 140), candidate.location.slice(0, 100), JSON.stringify(candidate.specialties), approach.slice(0, 3000)]);
    }
    await db.query("INSERT INTO coach_profile_merges(directory_slug,coach_id) VALUES($1,$2)", [input.slug, actor.id]);
    await db.query("INSERT INTO marketplace_audit(actor_id,action,target_id) VALUES($1,'coach-profile:merge',$2)", [actor.id, input.slug]);
    return { saved: true, ...(!coach ? { notification: { kind: "coach" as const, targetId: actor.id } } : {}) };
  });
}
