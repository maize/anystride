import { NextResponse } from "next/server";
import { accountActor } from "@/lib/account-data";
import { marketplaceOrigin } from "@/lib/marketplace-config";
import { accountViewCookie, accountViewCookieOptions, accountViewDestination } from "@/lib/account-view";

export async function GET(request: Request) {
  await accountActor();
  const origin = marketplaceOrigin();
  const next = accountViewDestination("coach", new URL(request.url).searchParams.get("next"));
  const response = NextResponse.redirect(`${origin}${next}`, { headers: { "Cache-Control": "private, no-store" } });
  response.cookies.set(accountViewCookie, "coach", accountViewCookieOptions(origin.startsWith("https:")));
  return response;
}
