"use client";

import posthog from "posthog-js";
import { PRODUCT_EVENTS, productEventParameters, type ProductEvent } from "./product-events";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
let initialized = false;

function isPublicPath(pathname: string) {
  return pathname !== "/account" && !pathname.startsWith("/account/") && pathname !== "/coaching/payment-return";
}

function canCapture() {
  if (typeof window === "undefined" || !projectToken || !host || process.env.NODE_ENV !== "production") return false;
  if (!["anystride.com", "www.anystride.com"].includes(window.location.hostname)) return false;
  if (!isPublicPath(window.location.pathname)) return false;
  if (navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return false;
  return true;
}

function initialize() {
  if (!canCapture()) return false;
  if (initialized) return true;
  try {
    posthog.init(projectToken!, {
      api_host: host,
      defaults: "2026-05-30",
      advanced_disable_flags: true,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_dead_clicks: false,
      capture_exceptions: false,
      capture_heatmaps: false,
      capture_performance: false,
      rageclick: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_persistence: true,
      person_profiles: "never",
      respect_dnt: true,
      before_send: (event) => {
        if (!event || !canCapture()) return null;
        if (event.event !== "$pageview" && !PRODUCT_EVENTS.includes(event.event as ProductEvent)) return null;
        const pathname = window.location.pathname;
        const properties = {
          token: event.properties.token,
          distinct_id: event.properties.distinct_id,
          $process_person_profile: false,
          $current_url: `${window.location.origin}${pathname}`,
          $pathname: pathname,
          ...(event.event === "$pageview" ? {} : productEventParameters(event.properties)),
        };
        return { uuid: event.uuid, event: event.event, timestamp: event.timestamp, properties };
      },
    });
    initialized = true;
  } catch {
    // Analytics must never interrupt the site.
  }
  return initialized;
}

export function capturePostHogPageview(pathname: string) {
  if (!isPublicPath(pathname) || !canCapture() || pathname !== window.location.pathname || !initialize()) return;
  try {
    posthog.capture("$pageview", { $current_url: `${window.location.origin}${pathname}`, $pathname: pathname });
  } catch {
    // Analytics is best-effort.
  }
}

export function capturePostHogProductEvent(event: ProductEvent, parameters: Record<string, unknown>) {
  if (!PRODUCT_EVENTS.includes(event) || !initialize()) return;
  try {
    posthog.capture(event, productEventParameters(parameters));
  } catch {
    // Analytics is best-effort.
  }
}
