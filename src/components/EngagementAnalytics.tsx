"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackEngagedTime, trackPageView, trackScrollDepth } from "@/lib/analytics";
import { ENGAGED_TIME_MSEC, isEngagementPath, newlyReachedScrollDepths } from "@/lib/product-events";

/** One page view per public pathname, plus scroll depth and 10s visible time on landing sections. */
export function EngagementAnalytics() {
  const pathname = usePathname() ?? "";
  useEffect(() => { trackPageView(pathname); }, [pathname]);
  useEffect(() => {
    if (!isEngagementPath(pathname)) return;
    const seen: number[] = [];
    function measure() {
      const root = document.documentElement;
      if (root.scrollHeight <= window.innerHeight + 16) return;
      const percent = ((window.scrollY + window.innerHeight) / root.scrollHeight) * 100;
      for (const depth of newlyReachedScrollDepths(percent, seen)) {
        seen.push(depth);
        trackScrollDepth(pathname, depth);
      }
    }
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    return () => window.removeEventListener("scroll", measure);
  }, [pathname]);
  useEffect(() => {
    if (!isEngagementPath(pathname)) return;
    let accumulated = 0;
    let visibleAt = document.visibilityState === "visible" ? performance.now() : 0;
    let fired = false;
    function elapsed() {
      return accumulated + (visibleAt ? performance.now() - visibleAt : 0);
    }
    const timer = window.setInterval(() => {
      if (fired || elapsed() < ENGAGED_TIME_MSEC) return;
      fired = true;
      trackEngagedTime(pathname);
      window.clearInterval(timer);
    }, 1000);
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        if (visibleAt) accumulated += performance.now() - visibleAt;
        visibleAt = 0;
      } else if (!visibleAt) visibleAt = performance.now();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname]);
  return null;
}
