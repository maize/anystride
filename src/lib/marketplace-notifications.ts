import "server-only";
import { createHash } from "node:crypto";
import { marketplaceOrigin } from "./marketplace-config";

export interface ReviewNotification { kind: "coach" | "service"; targetId: string }

/** Best-effort alert, not a durable mail queue. The review queue is authoritative. */
export async function notifyMarketplaceReview(notification: ReviewNotification): Promise<void> {
  if (process.env.MARKETPLACE_REVIEW_NOTIFICATIONS !== "email") return;
  // Preview builds must never email the production reviewer.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return;
  try {
    const key = process.env.MARKETPLACE_RESEND_API_KEY || process.env.RESEND_API_KEY;
    const to = process.env.NOTIFY_EMAIL?.trim() || "matthias.e.link@gmail.com";
    const from = process.env.NOTIFY_FROM?.trim();
    if (!key || !from || /[\r\n]/.test(from) || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(to)) {
      console.error("Marketplace review notification: configuration incomplete.");
      return;
    }
    const reviewUrl = `${marketplaceOrigin()}/account#review-heading`;
    const subject = notification.kind === "coach" ? "New coach application · Anystride" : "New coaching service proposal · Anystride";
    const text = [
      notification.kind === "coach" ? "A coach has submitted an application for your review." : "A coach has submitted a service proposal for your review.",
      "", "Sign in to your administrator account to review it:", reviewUrl,
      "", "Application details stay in Anystride. This alert does not approve the submission or enable payments.",
    ].join("\n");
    const reference = createHash("sha256").update(`${notification.kind}:${notification.targetId}`).digest("hex");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(5000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `marketplace-review-v1/${reference}` },
      body: JSON.stringify({ from, to, subject, text }),
    });
    // Never log the provider body, email address, credentials or application data.
    if (!response.ok) {
      console.error("Marketplace review notification: provider rejected email.");
      return;
    }
    const result = await response.json();
    if (!result || typeof result.id !== "string" || !result.id) {
      console.error("Marketplace review notification: invalid provider acknowledgement.");
    }
  } catch {
    console.error("Marketplace review notification: send failed.");
  }
}
