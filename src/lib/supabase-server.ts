import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { marketplaceOrigin } from "./marketplace-config";

export async function accountAuthClient(writable = false) {
  const origin = marketplaceOrigin();
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: { httpOnly: true, secure: origin.startsWith("https:"), sameSite: "lax", path: "/" },
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        // Proxy refreshes sessions for Server Components, which cannot write cookies.
        if (writable) values.forEach(({ name, value, options }) => store.set(name, value, options));
      },
    },
  });
}
