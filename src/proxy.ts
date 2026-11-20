import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { accountViewCookie, accountViewHeader, accountViewForPath, accountViewCookieOptions } from "@/lib/account-view";
import { marketplaceEnabled, marketplaceOrigin } from "@/lib/marketplace-config";
import { legacyRunningCoachRedirect } from "@/lib/slug";

async function legacyCoachDestination(pathname: string): Promise<string | null> {
  const known = legacyRunningCoachRedirect(pathname);
  if (known) return known;
  if (!pathname.startsWith("/running-coaches/")) return null;
  const slug = decodeURIComponent(pathname.slice("/running-coaches/".length));
  if (!slug || slug.includes("/")) return null;
  try {
    const { availableCities, getAllCoachesWithDiscovered, getCityByLegacySlugFor } = await import("@/lib/coaches");
    const { citySlug } = await import("@/lib/slug");
    if (availableCities().some((city) => citySlug(city) === slug)) return null;
    const city = getCityByLegacySlugFor(await getAllCoachesWithDiscovered(), slug);
    return city ? `/running-coaches/${citySlug(city)}` : null;
  } catch {
    return null;
  }
}

export default async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/running-coaches/")) {
    const legacyCoach = await legacyCoachDestination(request.nextUrl.pathname);
    if (legacyCoach) {
      const url = request.nextUrl.clone();
      url.pathname = legacyCoach;
      return NextResponse.redirect(url, 301);
    }
    return NextResponse.next();
  }
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

export const config = { matcher: ["/account/:path*", "/api/marketplace/:path*", "/api/strava/connect", "/api/strava/callback", "/api/strava/activities", "/running-coaches/:city"] };
