"use client";

import { useEffect, type RefObject } from "react";
import { trackProductEvent, trackProductEventOnce } from "@/lib/analytics";
import { useFormAbandon } from "@/lib/form-abandon";
import { planActivationParameters, planExperimentEnabled, type PlanExperimentVariant } from "@/lib/plan-experiment";

const ACTIVATION_FIELDS = ["start_date", "distance_unit"] as const;
export type ActivationField = (typeof ACTIVATION_FIELDS)[number];

/** One impression per tab once any part of the start module is on screen. */
export function usePlanActivationView(
  ref: RefObject<HTMLElement | null>,
  slug: string,
  variant: PlanExperimentVariant | null,
) {
  useEffect(() => {
    if (planExperimentEnabled(slug) && !variant) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      trackProductEventOnce(
        `plan-activation-view:${slug}`,
        "plan_activation_view",
        planActivationParameters(slug, variant),
      );
      observer.disconnect();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, slug, variant]);
}

/** Start, abandon and completion for the local start-date form. The date value is never sent. */
export function usePlanActivationFunnel(slug: string, variant: PlanExperimentVariant | null, planIsActive: boolean) {
  const abandon = useFormAbandon({
    event: "plan_activation_abandon",
    fields: ACTIVATION_FIELDS,
    payload: () => {
      if (planIsActive) return null;
      return {
        ...planActivationParameters(slug, variant),
        step_name: "start_date",
        step_number: 1,
      };
    },
  });

  return {
    markActivated() {
      abandon.markSubmitted();
    },
    begin(field: ActivationField) {
      if (planIsActive) return;
      if (!abandon.noteStart(field)) return;
      trackProductEvent("plan_activation_start", {
        ...planActivationParameters(slug, variant),
        step_name: "start_date",
        step_number: 1,
        last_field: field,
      });
    },
  };
}
