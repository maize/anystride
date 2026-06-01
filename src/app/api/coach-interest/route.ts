import { NextResponse, type NextRequest } from "next/server";
import { isDbConfigured, listInterest, saveInterest } from "@/lib/interest-store";

/**
 * Captures interest in the (not-yet-built) coaching marketplace.
 *
 * POST: store a signup. Primary store is Vercel Postgres (when a database is
 * attached). If no DB is configured it falls back to an optional webhook
 * (`COACH_INTEREST_WEBHOOK_URL`), then to a server log — so the form still works
 * locally with zero infrastructure.
 *
 * GET: export all signups as JSON or CSV. Protected by `ADMIN_EXPORT_TOKEN`.
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
    role: (role === "coach" ? "coach" : "runner") as "coach" | "runner",
    submittedAt: new Date().toISOString(),
  };

  try {
    if (isDbConfigured()) {
      await saveInterest({
        email: submission.email,
        goal: submission.goal,
        role: submission.role,
      });
    } else if (process.env.COACH_INTEREST_WEBHOOK_URL) {
      await fetch(process.env.COACH_INTEREST_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });
    } else {
      console.log("coach-interest (no store configured):", submission);
    }
  } catch (err) {
    console.error("coach-interest: failed to record submission", err);
    const debug = request.headers.get("x-debug") === "anystride";
    return NextResponse.json(
      {
        error: "Could not record your interest. Please try again.",
        ...(debug ? { detail: err instanceof Error ? err.message : String(err) } : {}),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

function toCsv(rows: Awaited<ReturnType<typeof listInterest>>): string {
  const header = ["email", "goal", "role", "created_at", "updated_at"];
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.email, r.goal, r.role, r.created_at, r.updated_at].map(escape).join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export async function GET(request: NextRequest) {
  const token = process.env.ADMIN_EXPORT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Export is not configured." },
      { status: 404 },
    );
  }
  const provided =
    request.nextUrl.searchParams.get("token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "No database configured." },
      { status: 503 },
    );
  }

  const rows = await listInterest();
  if (request.nextUrl.searchParams.get("format") === "csv") {
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="coach-interest.csv"',
      },
    });
  }
  return NextResponse.json({ count: rows.length, signups: rows });
}
