import { NextResponse, type NextRequest } from "next/server";
import { isDbConfigured } from "@/lib/interest-store";
import { listEnquiries, saveEnquiry } from "@/lib/enquiry-store";
import { parseEnquiry } from "@/lib/enquiries";

export const runtime = "nodejs";
const privateHeaders = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
function reply(body: object, status = 200, headers = {}) {
  return NextResponse.json(body, { status, headers: { ...privateHeaders, ...headers } });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "Submit this form from Anystride." }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return reply({ error: "Expected a JSON enquiry." }, 415);
  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Complete the enquiry form." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        return reply({ error: "Your enquiry is too long." }, 413);
      }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return reply({ error: "Invalid request body." }, 400);
  }
  const parsed = parseEnquiry(body);
  if ("error" in parsed) return reply(parsed, 400);
  if (!isDbConfigured()) return reply({ error: "Online enquiries are unavailable. Email hello@anystride.com instead." }, 503);
  try {
    const result = await saveEnquiry(parsed.enquiry);
    if (result === "conflict") return reply({ error: "This request identifier was already used. Reload the form and try again." }, 409);
    if (result === "limited") return reply({ error: "Too many enquiries. Please try again later or email hello@anystride.com." }, 429, { "Retry-After": "3600" });
    return reply({ ok: true, created: result === "created" }, result === "created" ? 201 : 200);
  } catch {
    // Never log contact details or acknowledge a request that was not durably saved.
    return reply({ error: "We could not save your enquiry. Please retry or email hello@anystride.com." }, 503);
  }
}

/** Operator-only inbox export. Does not email, publish or share a request. */
export async function GET(request: NextRequest) {
  const token = process.env.ADMIN_EXPORT_TOKEN;
  if (!token) return reply({ error: "Export is not configured." }, 404);
  if (request.headers.get("authorization") !== `Bearer ${token}`) return reply({ error: "Unauthorized." }, 401);
  if (!isDbConfigured()) return reply({ error: "No database configured." }, 503);
  try {
    const enquiries = await listEnquiries();
    return reply({ enquiries, count: enquiries.length, limit: 100 });
  } catch {
    return reply({ error: "Could not retrieve enquiries." }, 503);
  }
}
