import { NextResponse, type NextRequest } from "next/server";
import { BASE, getAllSitePaths } from "@/lib/site-urls";
import { changedPagePaths } from "@/lib/indexnow";

export const runtime = "nodejs";
const KEY = "279484893803f2af6c77a7478ee66696";

/** Submit an explicit published batch, never the whole sitemap. See ROADMAP.md. */
export async function POST(request: NextRequest) {
  const secret = process.env.INDEXNOW_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Submission is not configured." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let paths: string[] | null;
  try {
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: "A JSON paths array is required." }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16_384) {
        await reader.cancel();
        return NextResponse.json({ error: "Batch is too large." }, { status: 413 });
      }
      chunks.push(value);
    }
    paths = changedPagePaths(JSON.parse(Buffer.concat(chunks).toString("utf8")), getAllSitePaths());
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!paths) {
    return NextResponse.json({ error: "Provide 1–100 canonical site paths, without queries or fragments." }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: "anystride.com", key: KEY,
        keyLocation: `${BASE}/${KEY}.txt`,
        urlList: paths.map((path) => `${BASE}${path}`),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, upstreamStatus: res.status, submitted: 0 }, { status: 502 });
    }
    return NextResponse.json({ ok: true, upstreamStatus: res.status, submitted: paths.length });
  } catch {
    return NextResponse.json({ error: "Submission failed. Retry this batch later." }, { status: 502 });
  }
}
