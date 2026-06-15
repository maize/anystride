import { NextResponse, type NextRequest } from "next/server";
import { getAllSiteUrls } from "@/lib/site-urls";

export const runtime = "nodejs";

/**
 * Submits all site URLs to IndexNow (Bing, Yandex, Seznam…) so new/updated pages
 * get crawled in hours instead of weeks. Google ignores IndexNow but is covered
 * by the sitemap.
 *
 * Triggered by a Vercel Cron (see vercel.json). When CRON_SECRET is set, Vercel
 * sends it as a bearer token and we require it; a manual `?token=` is also
 * accepted for testing.
 */
const KEY = "279484893803f2af6c77a7478ee66696";
const KEY_LOCATION = `https://anystride.com/${KEY}.txt`;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured → allow (low-risk endpoint)
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return request.nextUrl.searchParams.get("token") === secret;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const urlList = getAllSiteUrls();

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: "anystride.com",
        key: KEY,
        keyLocation: KEY_LOCATION,
        urlList,
      }),
    });
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      submitted: urlList.length,
    });
  } catch (err) {
    console.error("indexnow: submit failed", err);
    return NextResponse.json(
      { error: "Submission failed." },
      { status: 502 },
    );
  }
}
