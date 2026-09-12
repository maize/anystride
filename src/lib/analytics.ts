"use client";

import { sendGAEvent } from "@next/third-parties/google";
import { PRODUCT_EVENTS, productEventParameters, type ProductEvent } from "./product-events";

export function trackProductEvent(event: ProductEvent, parameters: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "production") return;
  if (!["anystride.com", "www.anystride.com"].includes(window.location.hostname)) return;
  if (navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
  if (!PRODUCT_EVENTS.includes(event)) return;
  // A blocked/unavailable analytics provider must never interrupt training.
  try {
    sendGAEvent("event", event, productEventParameters(parameters));
  } catch {
    // Analytics is best-effort.
  }
}
