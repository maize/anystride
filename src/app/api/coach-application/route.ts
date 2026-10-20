import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Coach applications now use your Anystride account. Sign up or sign in at /coaching/apply.", next: "/coaching/apply" }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
