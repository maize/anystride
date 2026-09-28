import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { marketplaceEnabled, marketplaceOrigin } from "@/lib/marketplace-config";

export default async function proxy(request: NextRequest) {
  // Public plans and the signed Stripe webhook do not depend on authentication.
  if (!marketplaceEnabled()) return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: { httpOnly: true, secure: marketplaceOrigin().startsWith("https:"), sameSite: "lax", path: "/" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/account/:path*", "/api/marketplace/:path*"] };
