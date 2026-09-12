"use client";

import { useEffect } from "react";
import { trackProductEvent } from "@/lib/analytics";

/** One delegated listener keeps editorial pages server-rendered. */
export function ProductAnalytics() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link) return;
      const race = link.dataset.raceSlug;
      if (race) {
        trackProductEvent("race_source_click", { race_slug: race, link_kind: link.dataset.linkKind });
      }
      const guide = link.closest<HTMLElement>("[data-guide-plans]")?.dataset.guidePlans;
      if (guide && link.pathname.startsWith("/plans/")) {
        trackProductEvent("guide_plan_click", { guide_slug: guide, plan_slug: link.pathname.split("/")[2] });
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);
  return null;
}
