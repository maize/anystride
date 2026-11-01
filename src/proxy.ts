import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { accountViewCookie, accountViewHeader, accountViewForPath, accountViewCookieOptions } from "@/lib/account-view";
import { marketplaceEnabled, marketplaceOrigin } from "@/lib/marketplace-config";

export default async function proxy(request: NextRequest) {
  // Public plans and the signed Stripe webhook do not depend on authentication.
  if (!marketplaceEnabled()) return NextResponse.next();
  const view = accountViewForPath(request.nextUrl.pathname, Boolean(request.nextUrl.searchParams.get("athlete")));
  function nextResponse() {
    const forwarded = new Headers(request.headers);
    // The browser cannot select a role by forging an internal request header.
    forwarded.delete(accountViewHeader);
    if (view) forwarded.set(accountViewHeader, view);
    return NextResponse.next({ request: { headers: forwarded } });
  }
  let response = nextResponse();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: { httpOnly: true, secure: marketplaceOrigin().startsWith("https:"), sameSite: "lax", path: "/" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = nextResponse();
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getClaims();
  if (view) response.cookies.set(accountViewCookie, view, accountViewCookieOptions(marketplaceOrigin().startsWith("https:")));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/account/:path*", "/api/marketplace/:path*", "/api/strava/connect", "/api/strava/callback", "/api/strava/activities"] };
