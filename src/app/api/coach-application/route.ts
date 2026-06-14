import { NextResponse, type NextRequest } from "next/server";
import { isDbConfigured, saveCoachApplication } from "@/lib/interest-store";

// pg uses TCP sockets — requires the Node.js runtime.
export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v: unknown, max = 500) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const name = str(b.name, 120);
  const email = str(b.email, 200).toLowerCase();

  if (!name) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const application = {
    name,
    email,
    location: str(b.location, 120),
    website: str(b.website, 300),
    focus: str(b.focus, 200),
    experience: str(b.experience, 120),
    message: str(b.message, 2000),
    claimSlug: str(b.claimSlug, 120),
  };

  try {
    if (isDbConfigured()) {
      await saveCoachApplication(application);
    } else {
      console.log("coach-application (no DB configured):", application);
    }
  } catch (err) {
    console.error("coach-application: failed to record", err);
    return NextResponse.json(
      { error: "Could not submit. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
