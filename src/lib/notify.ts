import type { CoachApplication } from "./interest-store";

/**
 * Best-effort email notification when a coach applies, via Resend.
 *
 * Env:
 *   - RESEND_API_KEY : Resend API key. If unset, notifications are skipped.
 *   - NOTIFY_EMAIL   : where to send (default: the owner's email).
 *   - NOTIFY_FROM    : verified sender (default: Resend's onboarding sender,
 *                      which can deliver to your own account email for testing).
 *
 * Never throws — email problems must not break the application submission.
 */
export async function notifyCoachApplication(
  app: CoachApplication,
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  const to = process.env.NOTIFY_EMAIL ?? "matthias.e.link@gmail.com";
  const from = process.env.NOTIFY_FROM ?? "AnyStride <onboarding@resend.dev>";
  const subject = app.claimSlug
    ? `Coach profile claim: ${app.name}`
    : `New coach application: ${app.name}`;

  const text = [
    app.claimSlug ? `Claiming listing: ${app.claimSlug}` : "New coach application",
    "",
    `Name:       ${app.name}`,
    `Email:      ${app.email}`,
    `Location:   ${app.location || "—"}`,
    `Website:    ${app.website || "—"}`,
    `Coaches:    ${app.focus || "—"}`,
    `Experience: ${app.experience || "—"}`,
    "",
    app.message || "(no message)",
  ].join("\n");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text, reply_to: app.email }),
  });
}
