import { NextResponse } from "next/server";
import { accountAuthClient } from "@/lib/supabase-server";
import { MarketplaceError, marketplaceInvited, marketplaceOrigin } from "@/lib/marketplace-config";
import { paymentBody } from "@/lib/payment-http";
import { PaymentError } from "@/lib/payment-config";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" };

export async function POST(request: Request) {
  try {
    const origin = marketplaceOrigin();
    if (request.headers.get("origin") !== origin) throw new MarketplaceError("Use the Anystride account page.", 403);
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new MarketplaceError("Use the Anystride account form.", 415);
    let body;
    try { body = JSON.parse(await paymentBody(request, 2048)); }
    catch (error) { if (error instanceof PaymentError) throw error; throw new MarketplaceError("Invalid account request.", 400); }
    if (!body || typeof body !== "object" || Array.isArray(body) || !["sign-in", "sign-up", "sign-out"].includes(body.action) || Object.keys(body).some((key) => !["action", "email"].includes(key))) throw new MarketplaceError("Invalid account request.", 400);
    if (body.action !== "sign-out" && (typeof body.email !== "string" || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))) throw new MarketplaceError("Enter a valid email address.", 400);
    // Same neutral acknowledgement: never expose an invitation list or send mail
    // for an uninvited address. Verified-session access is checked independently.
    if (body.action !== "sign-out" && !marketplaceInvited(body.email)) return NextResponse.json({ requested: true }, { headers });
    const supabase = await accountAuthClient(true);
    if (body.action === "sign-out") {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw new MarketplaceError("Could not sign out. Try again.");
    } else {
      const { error } = await supabase.auth.signInWithOtp({ email: body.email.toLowerCase(), options: { shouldCreateUser: body.action === "sign-up", emailRedirectTo: `${origin}/account/callback` } });
      // Do not reveal whether the address belongs to an existing user.
      const hiddenAccountFailure = error && (["user_not_found", "signup_disabled", "otp_disabled"].includes(error.code ?? "") || error.status === 400 || error.status === 422);
      if (error && !hiddenAccountFailure) throw new MarketplaceError("Could not request a sign in email. Try again shortly.", error.status === 429 ? 429 : 503);
    }
    return NextResponse.json({ requested: true }, { headers });
  } catch (error) {
    const known = error instanceof MarketplaceError || error instanceof PaymentError;
    return NextResponse.json({ error: known ? error.message : "Account service unavailable." }, { status: known ? error.status : 503, headers });
  }
}
