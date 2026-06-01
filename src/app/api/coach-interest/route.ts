import { NextResponse, type NextRequest } from "next/server";

/**
 * Captures interest in the (not-yet-built) coaching marketplace so we can gauge
 * demand before building it.
 *
 * Storage is intentionally pluggable: set `COACH_INTEREST_WEBHOOK_URL` in the
 * environment (e.g. a Zapier/Make/Airtable/Google-Sheet webhook) and submissions
 * are forwarded there. With no webhook configured we just log — so the form works
 * out of the box in development without any infrastructure.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, goal, role } = (body ?? {}) as {
    email?: string;
    goal?: string;
    role?: string;
  };

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const submission = {
    email: email.trim().toLowerCase(),
    goal: typeof goal === "string" ? goal.slice(0, 200) : "",
    role: role === "coach" ? "coach" : "runner",
    submittedAt: new Date().toISOString(),
  };

  const webhook = process.env.COACH_INTEREST_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });
    } catch (err) {
      console.error("coach-interest: webhook forward failed", err);
      return NextResponse.json(
        { error: "Could not record your interest. Please try again." },
        { status: 502 },
      );
    }
  } else {
    console.log("coach-interest (no webhook configured):", submission);
  }

  return NextResponse.json({ ok: true });
}
