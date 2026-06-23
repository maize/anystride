import { NextResponse, type NextRequest } from "next/server";
import { isDbConfigured, pingDb } from "@/lib/interest-store";

export const runtime = "nodejs";

/**
 * Runs a trivial `SELECT 1` to register database activity, preventing the
 * Supabase free-tier project from auto-pausing after ~7 days of inactivity.
 * Triggered by a daily Vercel Cron (see vercel.json).
 */
function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured → allow (harmless endpoint)
  const auth = request.headers.get("authorization");
  return (
    auth === `Bearer ${secret}` ||
    request.nextUrl.searchParams.get("token") === secret
  );
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ ok: false, reason: "no database configured" });
  }
  try {
    await pingDb();
    return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
  } catch (err) {
    console.error("db-keepalive: query failed", err);
    return NextResponse.json({ ok: false, error: "query failed" }, { status: 502 });
  }
}
