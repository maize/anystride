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
      if (link.origin === window.location.origin && (link.pathname === "/coaching/apply" || (link.pathname === "/account/sign-up" && new URL(link.href).searchParams.get("as") === "coach"))) {
        trackProductEvent("coach_application_open");
      }
      if (link.pathname === "/coaching/match" && link.origin === window.location.origin) trackProductEvent("coach_match_open");
      if (link.dataset.coachSlug) trackProductEvent("coach_contact_click", { coach_slug: link.dataset.coachSlug });
      if (link.origin === window.location.origin && link.pathname.startsWith("/coaching/focus/")) trackProductEvent("coaching_category_open", { coaching_focus: link.pathname.split("/")[3] });
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
