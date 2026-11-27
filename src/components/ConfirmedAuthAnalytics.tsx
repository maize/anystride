"use client";

import { useEffect } from "react";
import { AUTH_ANALYTICS_COOKIE, parseAuthAnalyticsCookie } from "@/lib/auth-analytics";
import { trackProductEventOnce } from "@/lib/analytics";

/** Reads the one-time cookie set after a verified magic link. The cookie holds no account details. */
export function ConfirmedAuthAnalytics() {
  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${AUTH_ANALYTICS_COOKIE}=([^;]*)`));
    if (!match) return;
    let parsed: ReturnType<typeof parseAuthAnalyticsCookie> = null;
    try { parsed = parseAuthAnalyticsCookie(decodeURIComponent(match[1])); } catch { parsed = null; }
    document.cookie = `${AUTH_ANALYTICS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    if (!parsed) return;
    trackProductEventOnce(`auth:${parsed.nonce}`, parsed.event, { method: "email", entry: parsed.entry });
  }, []);
  return null;
}
