import { NextResponse, type NextRequest } from "next/server";
import { fetchWeekly, isGaConfigured } from "@/lib/ga";

// google-auth-library + GA Data API run in the Node.js runtime.
export const runtime = "nodejs";

/**
 * Token-protected weekly GA4 stats for the review agent. The agent fetches this
 * one URL instead of holding Google credentials itself.
 *
 *   GET /api/ga-weekly?token=GA_REPORT_TOKEN[&days=7]
 */
export async function GET(request: NextRequest) {
  const token = process.env.GA_REPORT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Reporting is not configured." },
      { status: 404 },
    );
  }
  const provided =
    request.nextUrl.searchParams.get("token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isGaConfigured()) {
    return NextResponse.json(
      { error: "GA credentials are not configured." },
      { status: 503 },
    );
  }

  const daysParam = Number(request.nextUrl.searchParams.get("days"));
  const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 7;

  try {
    const stats = await fetchWeekly(days);
    return NextResponse.json(stats);
  } catch (err) {
    console.error("ga-weekly: failed", err);
    return NextResponse.json(
      { error: "Failed to fetch analytics." },
      { status: 502 },
    );
  }
}
