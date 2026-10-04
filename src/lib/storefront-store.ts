import "server-only";
import type { MarketplaceActor } from "./marketplace-auth";
import { MarketplaceError, marketplaceEnabled } from "./marketplace-config";
import { marketplaceTransaction, type CoachingService } from "./marketplace-store";
import type { StorefrontAction } from "./storefront-input";

export interface StorefrontProfile {
  slug: string; name: string; bio: string; credentials: string; headline: string; location: string;
  photo_url: string; specialties: string[]; approach: string; published: boolean; version: number;
}
export interface StorefrontOffer extends CoachingService {
  kind: "package" | "consultation"; inclusions: string[]; delivery: string; cancellation: string; available: boolean;
}
export interface OwnStorefrontOffer extends StorefrontOffer { next_steps: string }
export interface Storefront { profile: StorefrontProfile; offers: StorefrontOffer[] }
const profileColumns = "p.slug,c.name,c.bio,c.credentials,p.headline,p.location,p.photo_url,p.specialties,p.approach,p.published,p.version";
const offerColumns = "s.id,s.title,s.description,s.amount,s.currency,s.duration_weeks,s.status,s.version,o.kind,o.inclusions,o.delivery,o.cancellation,o.available";

export async function publicStorefront(slug: string): Promise<Storefront | null> {
  if (!marketplaceEnabled()) return null;
  return marketplaceTransaction(async (db) => {
    const { rows: [profile] } = await db.query<StorefrontProfile>(`SELECT ${profileColumns} FROM marketplace_storefronts p JOIN marketplace_coaches c ON c.user_id=p.coach_id WHERE p.slug=$1 AND p.published AND c.status='approved'`, [slug]);
    if (!profile) return null;
    const { rows: offers } = await db.query<StorefrontOffer>(`SELECT ${offerColumns} FROM marketplace_services s JOIN marketplace_storefront_offers o ON o.service_id=s.id JOIN marketplace_storefronts p ON p.coach_id=s.coach_id WHERE p.slug=$1 AND s.status='approved' ORDER BY s.amount,s.id`, [slug]);
    return { profile, offers };
  });
}

export async function publicStorefronts() {
  if (!marketplaceEnabled()) return [];
  return marketplaceTransaction(async (db) => (await db.query<StorefrontProfile & { service_ids: string[] }>(`SELECT ${profileColumns},ARRAY(SELECT s.id::text FROM marketplace_services s JOIN marketplace_storefront_offers o ON o.service_id=s.id WHERE s.coach_id=c.user_id AND s.status='approved') AS service_ids FROM marketplace_storefronts p JOIN marketplace_coaches c ON c.user_id=p.coach_id WHERE p.published AND c.status='approved' ORDER BY c.name LIMIT 100`)).rows);
}

export async function ownStorefront(actor: MarketplaceActor) {
  return marketplaceTransaction(async (db) => {
    const { rows: [profile] } = await db.query<StorefrontProfile>(`SELECT ${profileColumns} FROM marketplace_storefronts p JOIN marketplace_coaches c ON c.user_id=p.coach_id WHERE p.coach_id=$1`, [actor.id]);
    const { rows: offers } = await db.query<OwnStorefrontOffer>(`SELECT ${offerColumns},o.next_steps FROM marketplace_services s LEFT JOIN marketplace_storefront_offers o ON o.service_id=s.id WHERE s.coach_id=$1 ORDER BY s.created_at DESC LIMIT 10`, [actor.id]);
    return { profile: profile ?? null, offers };
  });
}

export async function storefrontReviewOffers(actor: MarketplaceActor) {
  if (!actor.admin) throw new MarketplaceError("Review access required.", 403);
  return marketplaceTransaction(async (db) => (await db.query<OwnStorefrontOffer & { service_id: string }>(
    "SELECT service_id,kind,inclusions,delivery,next_steps,cancellation,available FROM marketplace_storefront_offers WHERE service_id IN (SELECT id FROM marketplace_services ORDER BY (status='pending') DESC,created_at DESC LIMIT 100)",
  )).rows);
}

export async function saveStorefront(actor: MarketplaceActor, input: Extract<StorefrontAction, { action: "profile" | "offer" }>) {
  return marketplaceTransaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`marketplace:${actor.id}`]);
    const { rows: [coach] } = await db.query("SELECT status FROM marketplace_coaches WHERE user_id=$1 FOR UPDATE", [actor.id]);
    if (coach?.status !== "approved") throw new MarketplaceError("Your coach application must be approved first.", 403);
    if (input.action === "profile") {
      const { rows: [existing] } = await db.query("SELECT version,slug FROM marketplace_storefronts WHERE coach_id=$1 FOR UPDATE", [actor.id]);
      if ((existing?.version ?? 0) !== input.version) throw new MarketplaceError("Your profile changed. Refresh before saving again.", 409);
      if (existing && existing.slug !== input.slug) throw new MarketplaceError("Your published profile address stays the same so shared links keep working.", 409);
      const { rows: taken } = await db.query("SELECT 1 FROM marketplace_storefronts WHERE slug=$1 AND coach_id<>$2", [input.slug, actor.id]);
      if (taken.length) throw new MarketplaceError("That profile address is already in use. Choose another.", 409);
      try {
        await db.query(`INSERT INTO marketplace_storefronts (coach_id,slug,headline,location,photo_url,specialties,approach,published) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT(coach_id) DO UPDATE SET headline=$3,location=$4,photo_url=$5,specialties=$6,approach=$7,published=$8,version=marketplace_storefronts.version+1,updated_at=now()`, [actor.id,input.slug,input.headline,input.location,input.photoUrl,JSON.stringify(input.specialties),input.approach,input.published]);
      } catch (error) {
        if ((error as { code?: string }).code === "23505") throw new MarketplaceError("That profile address is already in use. Choose another.", 409);
        throw error;
      }
    } else {
      const { rows: [existing] } = await db.query("SELECT coach_id,version,status FROM marketplace_services WHERE id=$1 FOR UPDATE", [input.id]);
      if (existing && existing.coach_id !== actor.id) throw new MarketplaceError("Service not found.", 404);
      if ((existing?.version ?? 0) !== input.version) throw new MarketplaceError("This service changed. Refresh before saving again.", 409);
      if (existing?.status === "suspended") throw new MarketplaceError("This service is suspended.", 403);
      if (!existing) {
        const { rows: [count] } = await db.query("SELECT count(*)::int AS n FROM marketplace_services WHERE coach_id=$1", [actor.id]);
        if (count.n >= 10) throw new MarketplaceError("You can publish up to ten services.", 409);
        await db.query(`INSERT INTO marketplace_services(id,coach_id,title,description,amount,currency,duration_weeks) VALUES($1,$2,$3,$4,$5,$6,$7)`, [input.id,actor.id,input.title,input.description,input.amount,input.currency,input.durationWeeks]);
      } else {
        await db.query(`UPDATE marketplace_services SET title=$2,description=$3,amount=$4,currency=$5,duration_weeks=$6,status='pending',version=version+1,updated_at=now() WHERE id=$1`, [input.id,input.title,input.description,input.amount,input.currency,input.durationWeeks]);
      }
      await db.query(`INSERT INTO marketplace_storefront_offers(service_id,kind,inclusions,delivery,next_steps,cancellation,contact_email,available) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT(service_id) DO UPDATE SET kind=$2,inclusions=$3,delivery=$4,next_steps=$5,cancellation=$6,contact_email=$7,available=$8`, [input.id,input.kind,JSON.stringify(input.inclusions),input.delivery,input.nextSteps,input.cancellation,actor.email,input.available]);
    }
    await db.query("INSERT INTO marketplace_audit(actor_id,action,target_id) VALUES($1,$2,$3)", [actor.id,`storefront:${input.action}`,input.action === "profile" ? actor.id : input.id]);
    return { saved: true, ...(input.action === "offer" ? { notification: { kind: "service" as const, targetId: input.id, version: input.version + 1 } } : {}) };
  });
}

export async function checkoutOffer(serviceId: string) {
  return marketplaceTransaction(async (db) => {
    const { rows: [offer] } = await db.query<StorefrontOffer & { coach_id: string; coach_name: string; slug: string; next_steps: string; contact_email: string }>(`SELECT ${offerColumns},s.coach_id,c.name AS coach_name,p.slug,o.next_steps,o.contact_email FROM marketplace_services s
      JOIN marketplace_storefront_offers o ON o.service_id=s.id JOIN marketplace_coaches c ON c.user_id=s.coach_id JOIN marketplace_storefronts p ON p.coach_id=s.coach_id
      WHERE s.id=$1 AND s.status='approved' AND c.status='approved' AND p.published`, [serviceId]);
    return offer ?? null;
  });
}
