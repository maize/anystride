import "server-only";
import { createHash } from "node:crypto";
import { marketplaceOrigin } from "./marketplace-config";
import { marketplaceTransaction } from "./marketplace-store";

interface SignupUser { id: string; email?: string; email_confirmed_at?: string; created_at: string; is_anonymous?: boolean }

/** Best-effort owner alert, durably claimed once. Email failure never blocks sign-in. */
export async function notifyVerifiedSignup(user: SignupUser): Promise<void> {
  if (process.env.MARKETPLACE_SIGNUP_NOTIFICATIONS !== "email" || process.env.VERCEL_ENV !== "production") return;
  const since = Date.parse(process.env.MARKETPLACE_SIGNUP_NOTIFICATIONS_SINCE ?? "");
  const created = Date.parse(user.created_at);
  if (!user.id || !user.email_confirmed_at || user.is_anonymous || !Number.isFinite(since) || !Number.isFinite(created) || created < since) return;
  const key = process.env.MARKETPLACE_RESEND_API_KEY || process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM?.trim();
  const to = process.env.NOTIFY_EMAIL?.trim() || "matthias.e.link@gmail.com";
  const email = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
  if (!key || !from || /[\r\n]/.test(from) || !email.test(to) || !user.email || !email.test(user.email)) return;
  try {
    const reviewUrl = `${marketplaceOrigin()}/account/review`;
    const claimed = await marketplaceTransaction(async (db) => {
      await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`signup-alert:${user.id}`]);
      const existing = await db.query("SELECT 1 FROM marketplace_audit WHERE actor_id=$1 AND action='signup:notification-attempted' LIMIT 1", [user.id]);
      if (existing.rows.length) return false;
      await db.query("INSERT INTO marketplace_audit(actor_id,action,target_id) VALUES($1,'signup:notification-attempted',$1)", [user.id]);
      return true;
    });
    if (!claimed) return;
    const reference = createHash("sha256").update(user.id).digest("hex");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(5000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `verified-signup-v1/${reference}` },
      body: JSON.stringify({ from, to, subject: "New verified signup · Anystride", text: [
        "Someone has created and verified an Anystride account.", "", `Email: ${user.email}`, "",
        "They have not necessarily applied as a coach. Coach applications are reviewed separately; signup does not approve a coach or enable sales.",
        "", "Review coach applications:", reviewUrl,
      ].join("\n") }),
    });
    if (!response.ok || typeof (await response.json())?.id !== "string") throw new Error("Email not acknowledged");
  } catch { console.error("Signup notification could not be delivered. Check the notification audit and email provider."); }
}
