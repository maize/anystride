import "server-only";
import { Pool, type PoolClient } from "pg";
import type { MarketplaceActor } from "./marketplace-auth";
import type { MarketplaceAction } from "./marketplace-input";
import { marketplaceEnabled, MarketplaceError, marketplaceOrigin } from "./marketplace-config";
import { marketplaceDatabaseConfig } from "./marketplace-database";
import type { ReviewNotification } from "./marketplace-notifications";

let pool: Pool | undefined;
function marketplacePool() {
  marketplaceOrigin();
  if (!pool) {
    pool = new Pool({ ...marketplaceDatabaseConfig(), max: 3, connectionTimeoutMillis: 5000,
      statement_timeout: 5000, idleTimeoutMillis: 10000 });
    pool.on("error", () => { console.error("Coaching database connection failed."); });
  }
  return pool;
}

export async function marketplaceTransaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await marketplacePool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '5s'");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export type ReviewStatus = "pending" | "approved" | "rejected" | "suspended";
export interface CoachApplication { name: string; bio: string; credentials: string; status: ReviewStatus }
export interface CoachingService { id: string; title: string; description: string; amount: number; currency: string; duration_weeks: number; status: ReviewStatus; version: number }
export interface CoachingRequest {
  id: string; service_id: string; message: string; status: "requested" | "accepted" | "declined" | "cancelled"; is_runner: boolean; created_at: Date;
  service_snapshot: { title: string; description: string; amount: number; currency: string; durationWeeks: number; coachName: string; serviceVersion: number };
}
export interface CatalogService extends Omit<CoachingService, "status" | "version"> { coach_name: string }

export async function marketplaceReviews(actor: MarketplaceActor) {
  if (!actor.admin) throw new MarketplaceError("Administrator access required.", 403);
  const client = marketplacePool();
  const [coaches, services] = await Promise.all([
    client.query<CoachApplication & { id: string; version: number }>("SELECT user_id AS id,name,bio,credentials,status,version FROM marketplace_coaches ORDER BY (status='pending') DESC,created_at DESC LIMIT 100"),
    client.query<CoachingService & { coach_name: string; coach_status: ReviewStatus }>(`SELECT s.id,s.title,s.description,s.amount,s.currency,s.duration_weeks,s.status,s.version,c.name AS coach_name,c.status AS coach_status
      FROM marketplace_services s JOIN marketplace_coaches c ON c.user_id=s.coach_id ORDER BY (s.status='pending') DESC,s.created_at DESC LIMIT 100`),
  ]);
  return { reviewCoaches: coaches.rows, reviewServices: services.rows };
}

export async function marketplaceDashboard(actor: MarketplaceActor, { includeReviews = true } = {}) {
  const client = marketplacePool();
  const [coach, services, requests, catalog, reviews] = await Promise.all([
    client.query<CoachApplication>("SELECT name,bio,credentials,status FROM marketplace_coaches WHERE user_id=$1", [actor.id]),
    client.query<CoachingService>("SELECT id,title,description,amount,currency,duration_weeks,status,version FROM marketplace_services WHERE coach_id=$1 ORDER BY created_at DESC LIMIT 10", [actor.id]),
    client.query<CoachingRequest>(`SELECT id,service_id,message,service_snapshot,status,created_at,runner_id=$1 AS is_runner FROM marketplace_requests
      WHERE runner_id=$1 OR coach_id=$1 ORDER BY created_at DESC LIMIT 100`, [actor.id]),
    client.query<CatalogService>(`SELECT s.id,s.title,s.description,s.amount,s.currency,s.duration_weeks,c.name AS coach_name
      FROM marketplace_services s JOIN marketplace_coaches c ON c.user_id=s.coach_id
      WHERE s.status='approved' AND c.status='approved' AND c.user_id<>$1 ORDER BY s.created_at DESC LIMIT 100`, [actor.id]),
    actor.admin && includeReviews ? marketplaceReviews(actor) : { reviewCoaches: [], reviewServices: [] },
  ]);
  return { coach: coach.rows[0] ?? null, services: services.rows, requests: requests.rows, catalog: catalog.rows, ...reviews };
}

export type PublicMarketplaceService = {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  durationWeeks: number;
  coachName: string;
};

export async function marketplacePublicCatalog(): Promise<PublicMarketplaceService[]> {
  if (!marketplaceEnabled()) return [];
  const result = await marketplacePool().query<{
    id: string;
    title: string;
    description: string;
    amount: number;
    currency: string;
    duration_weeks: number;
    coach_name: string;
  }>(`SELECT s.id,s.title,s.description,s.amount,s.currency,s.duration_weeks,c.name AS coach_name
    FROM marketplace_services s JOIN marketplace_coaches c ON c.user_id=s.coach_id
    WHERE s.status='approved' AND c.status='approved'
    ORDER BY s.created_at DESC LIMIT 100`);
  return result.rows.map((service) => ({
    id: service.id,
    title: service.title,
    description: service.description,
    amount: service.amount,
    currency: service.currency,
    durationWeeks: service.duration_weeks,
    coachName: service.coach_name,
  }));
}

export async function actOnMarketplace(actor: MarketplaceActor, input: MarketplaceAction): Promise<{ saved: boolean; notification?: ReviewNotification }> {
  return marketplaceTransaction(async (client) => {
    // Durable per-user serialization protects quotas and concurrent retry handling.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`marketplace:${actor.id}`]);
    let target: string = actor.id;
    if (input.action === "apply") {
      const existing = await client.query("SELECT name,bio,credentials FROM marketplace_coaches WHERE user_id=$1 FOR UPDATE", [actor.id]);
      if (existing.rows[0]) {
        const c = existing.rows[0];
        if (c.name === input.name && c.bio === input.bio && c.credentials === input.credentials) return { saved: true };
        throw new MarketplaceError("An application already exists. Contact Anystride to amend it.", 409);
      }
      await client.query("INSERT INTO marketplace_coaches (user_id,name,bio,credentials) VALUES ($1,$2,$3,$4)", [actor.id, input.name, input.bio, input.credentials]);
    } else if (input.action === "service") {
      target = input.id;
      const existing = await client.query("SELECT * FROM marketplace_services WHERE id=$1", [input.id]);
      if (existing.rows[0]) {
        const s = existing.rows[0];
        if (s.coach_id === actor.id && s.title === input.title && s.description === input.description && s.amount === input.amount && s.currency === input.currency && s.duration_weeks === input.durationWeeks) return { saved: true };
        throw new MarketplaceError("This service reference is already in use.", 409);
      }
      const coach = await client.query("SELECT status FROM marketplace_coaches WHERE user_id=$1 FOR UPDATE", [actor.id]);
      if (coach.rows[0]?.status !== "approved") throw new MarketplaceError("Your coach application must be approved first.", 403);
      const count = await client.query("SELECT count(*)::int AS count FROM marketplace_services WHERE coach_id=$1", [actor.id]);
      if (count.rows[0].count >= 10) throw new MarketplaceError("The pilot allows ten service proposals per coach. Contact Anystride for help.", 429);
      await client.query(`INSERT INTO marketplace_services (id,coach_id,title,description,amount,currency,duration_weeks)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`, [input.id, actor.id, input.title, input.description, input.amount, input.currency, input.durationWeeks]);
    } else if (input.action === "edit-service") {
      target = input.id;
      // Match review/inquiry lock order. Ownership is checked even for admins.
      const coach = await client.query("SELECT status FROM marketplace_coaches WHERE user_id=$1 FOR UPDATE", [actor.id]);
      const { rows: [service] } = await client.query("SELECT * FROM marketplace_services WHERE id=$1 AND coach_id=$2 FOR UPDATE", [input.id, actor.id]);
      if (!service) throw new MarketplaceError("Service not found.", 404);
      if (coach.rows[0]?.status !== "approved") throw new MarketplaceError("Your coach application must be approved before editing services.", 403);
      if (service.status === "suspended") throw new MarketplaceError("This service is suspended. Contact Anystride before making changes.", 403);
      const unchanged = service.title === input.title && service.description === input.description && service.amount === input.amount && service.currency === input.currency && service.duration_weeks === input.durationWeeks;
      if (unchanged && service.status === "pending" && service.version === input.version + 1) return { saved: true };
      if (service.version !== input.version) throw new MarketplaceError("This service changed. Refresh before editing it again.", 409);
      if (unchanged && service.status !== "rejected") return { saved: true };
      await client.query(`UPDATE marketplace_services SET title=$2,description=$3,amount=$4,currency=$5,duration_weeks=$6,
        status='pending',version=version+1,updated_at=now() WHERE id=$1`, [input.id, input.title, input.description, input.amount, input.currency, input.durationWeeks]);
    } else if (input.action === "inquire") {
      target = input.id;
      const existing = await client.query("SELECT runner_id,service_id,message FROM marketplace_requests WHERE id=$1", [input.id]);
      if (existing.rows[0]) {
        const r = existing.rows[0];
        if (r.runner_id === actor.id && r.service_id === input.serviceId && r.message === input.message) return { saved: true };
        throw new MarketplaceError("This request reference is already in use.", 409);
      }
      // Lock coach before service everywhere to avoid approval/inquiry deadlocks.
      const owner = await client.query("SELECT coach_id FROM marketplace_services WHERE id=$1", [input.serviceId]);
      if (!owner.rows[0]) throw new MarketplaceError("This service is not available.", 404);
      const coach = await client.query("SELECT name,status FROM marketplace_coaches WHERE user_id=$1 FOR UPDATE", [owner.rows[0].coach_id]);
      const service = await client.query("SELECT * FROM marketplace_services WHERE id=$1 FOR UPDATE", [input.serviceId]);
      const s = service.rows[0];
      if (s.status !== "approved" || coach.rows[0]?.status !== "approved") throw new MarketplaceError("This service is not available.", 404);
      if (s.coach_id === actor.id) throw new MarketplaceError("You cannot request your own service.", 400);
      const duplicate = await client.query("SELECT id FROM marketplace_requests WHERE runner_id=$1 AND service_id=$2 AND status IN ('requested','accepted')", [actor.id, input.serviceId]);
      if (duplicate.rows.length) throw new MarketplaceError("You already have an open request for this service.", 409);
      const count = await client.query("SELECT count(*)::int AS count FROM marketplace_requests WHERE runner_id=$1 AND created_at > now() - interval '1 day'", [actor.id]);
      if (count.rows[0].count >= 10) throw new MarketplaceError("You have reached today's request limit. Try again tomorrow.", 429);
      const snapshot = { title: s.title, description: s.description, amount: s.amount, currency: s.currency, durationWeeks: s.duration_weeks, coachName: coach.rows[0].name, serviceVersion: s.version };
      await client.query(`INSERT INTO marketplace_requests (id,runner_id,service_id,coach_id,message,service_snapshot)
        VALUES ($1,$2,$3,$4,$5,$6)`, [input.id, actor.id, s.id, s.coach_id, input.message, JSON.stringify(snapshot)]);
    } else if (input.action === "respond") {
      target = input.id;
      const request = await client.query("SELECT * FROM marketplace_requests WHERE id=$1 FOR UPDATE", [input.id]);
      const r = request.rows[0];
      if (!r || (input.status === "cancelled" ? r.runner_id !== actor.id : r.coach_id !== actor.id)) throw new MarketplaceError("Request not found.", 404);
      if (r.status === input.status) return { saved: true };
      if (input.status === "cancelled" ? !["requested", "accepted"].includes(r.status) : r.status !== "requested") throw new MarketplaceError("This request has already been answered.", 409);
      if (input.status === "accepted") {
        const availability = await client.query(`SELECT s.id FROM marketplace_services s JOIN marketplace_coaches c ON c.user_id=s.coach_id
          WHERE s.id=$1 AND s.status='approved' AND c.status='approved' FOR SHARE OF c,s`, [r.service_id]);
        if (!availability.rows.length) throw new MarketplaceError("This service is no longer available.", 409);
      }
      await client.query("UPDATE marketplace_requests SET status=$2,updated_at=now() WHERE id=$1", [input.id, input.status]);
    } else if (input.action === "review") {
      if (!actor.admin) throw new MarketplaceError("Administrator access required.", 403);
      target = input.id;
      const table = input.target === "coach" ? "marketplace_coaches" : "marketplace_services";
      const key = input.target === "coach" ? "user_id" : "id";
      const owner = input.target === "coach" ? input.id : (await client.query("SELECT coach_id FROM marketplace_services WHERE id=$1", [input.id])).rows[0]?.coach_id;
      if (!owner) throw new MarketplaceError("Review item not found.", 404);
      const coach = await client.query("SELECT status FROM marketplace_coaches WHERE user_id=$1 FOR UPDATE", [owner]);
      if (input.target === "service" && input.status === "approved" && coach.rows[0]?.status !== "approved") throw new MarketplaceError("Approve the coach before approving their service.", 409);
      const updated = await client.query(`UPDATE ${table} SET status=$2,version=version+1,updated_at=now() WHERE ${key}=$1 AND version=$3 RETURNING ${key}`, [input.id, input.status, input.version]);
      if (!updated.rows.length) throw new MarketplaceError("This review changed. Refresh before trying again.", 409);
    }
    await client.query("INSERT INTO marketplace_audit (actor_id,action,target_id) VALUES ($1,$2,$3)", [actor.id, input.action === "review" || input.action === "respond" ? `${input.action}:${input.status}` : input.action, target]);
    // Only a newly saved review item produces an alert. Exact replays above do not.
    // The caller receives this only after both the item and audit entry commit.
    const notification: ReviewNotification | undefined = input.action === "apply"
      ? { kind: "coach", targetId: actor.id }
      : input.action === "service" || input.action === "edit-service" ? { kind: "service", targetId: input.id, ...(input.action === "edit-service" ? { version: input.version + 1 } : {}) } : undefined;
    return { saved: true, notification };
  });
}
