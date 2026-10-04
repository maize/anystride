import { NextResponse } from "next/server";
import { accountAuthClient } from "@/lib/supabase-server";
import { marketplaceOrigin } from "@/lib/marketplace-config";
import { checkoutReturnCookie, checkoutReturnFromCookie } from "@/lib/account-return";

export async function GET(request: Request) {
  try {
    const origin = marketplaceOrigin();
    const code = new URL(request.url).searchParams.get("code");
    if (code && code.length <= 2048) {
      const supabase = await accountAuthClient(true);
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const response = NextResponse.redirect(`${origin}${checkoutReturnFromCookie(request.headers.get("cookie"))}`, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
        response.cookies.set(checkoutReturnCookie, "", { path: "/account", maxAge: 0, httpOnly: true, secure: origin.startsWith("https:"), sameSite: "lax" });
        return response;
      }
    }
  } catch { /* No provider error, token or redirect target is reflected. */ }
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Could not complete sign in · Anystride</title><main>
<h1>We could not complete your sign in.</h1>
<p>This can happen if the link was opened in a different browser, has already been used, has expired, or the sign in service is temporarily unavailable.</p>
<p>Open the newest email link in the same browser and browser profile where you requested it. For example, a link requested in the in-app browser needs to open there, not in Chrome or Safari.</p>
<p>If you already signed in successfully, <a href="/account">go to your account</a>. Otherwise, <a href="/account/sign-in">request a new sign in link</a> in the browser you want to use.</p>
</main></html>`, { status: 400, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex", "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
}
