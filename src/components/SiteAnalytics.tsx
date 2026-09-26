"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { ProductAnalytics } from "./ProductAnalytics";
import { capturePostHogPageview } from "@/lib/posthog";

export function SiteAnalytics({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) capturePostHogPageview(pathname);
  }, [pathname]);
  // Account entry links use full document navigation, so a public-page analytics
  // script cannot survive into the private account/authentication document.
  if (!pathname || pathname === "/account" || pathname.startsWith("/account/") || pathname === "/coaching/payment-return") return null;
  return <><ProductAnalytics /><Analytics /><SpeedInsights />{gaId && <GoogleAnalytics gaId={gaId} />}</>;
}
