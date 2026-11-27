"use client";

import { sendGAEvent } from "@next/third-parties/google";
import { GA_MEASUREMENT_ID, isGaMeasurementId } from "./ga-id";
import {
  ENGAGED_TIME_MSEC,
  PRODUCT_EVENTS,
  isEngagementPath,
  productEventParameters,
  publicPagePath,
  type AnalyticsValue,
  type ProductEvent,
} from "./product-events";
import { capturePostHogProductEvent } from "./posthog";

const COLLECT_URL = "https://www.google-analytics.com/g/collect";
const seen = new Set<string>();
let lastPagePath = "";
let initialPageViewConsumed = false;

export function canTrackAnalytics() {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "production") return false;
  if (!["anystride.com", "www.anystride.com"].includes(window.location.hostname)) return false;
  if (navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return false;
  return true;
}

function accountPath() {
  const path = window.location.pathname ?? "";
  return path === "/account" || path.startsWith("/account/");
}

function gaScriptPresent() {
  if (typeof document === "undefined") return false;
  const gtag = (window as Window & { gtag?: unknown }).gtag;
  return typeof gtag === "function" || Boolean(document.getElementById("_next-ga") || document.getElementById("_next-ga-init"));
}

function clientId() {
  const existing = document.cookie.match(/(?:^|; )_ga=GA\d+\.\d+\.(\d+\.\d+)(?:;|$)/);
  if (existing) return existing[1];
  const key = "anystride_cid";
  try {
    const stored = sessionStorage.getItem(key);
    if (stored && /^\d{1,20}\.\d{1,12}$/.test(stored)) return stored;
    const created = `${Math.floor(Math.random() * 1e10)}.${Math.floor(Date.now() / 1000)}`;
    sessionStorage.setItem(key, created);
    return created;
  } catch {
    return `${Math.floor(Math.random() * 1e10)}.${Math.floor(Date.now() / 1000)}`;
  }
}

function sessionParams() {
  const measurementId = isGaMeasurementId(GA_MEASUREMENT_ID) ? GA_MEASUREMENT_ID : "";
  if (!measurementId) return null;
  const prefix = `_ga_${measurementId.slice(2)}=`;
  const raw = document.cookie.split("; ").find((part) => part.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return null;
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch { return null; }
  const current = decoded.match(/^GS1\.1\.(\d+)\.(\d+)/) ?? decoded.match(/^GS2\.1\.s(\d+)\$o(\d+)/);
  if (!current) return null;
  return { sid: current[1], sct: current[2] };
}

/** One gtag collect hit, used where the analytics script is intentionally not loaded. */
function sendCollect(event: string, params: Record<string, AnalyticsValue>) {
  const measurementId = isGaMeasurementId(GA_MEASUREMENT_ID) ? GA_MEASUREMENT_ID : null;
  if (!measurementId || typeof document === "undefined") return;
  const body = new URLSearchParams();
  body.set("v", "2");
  body.set("tid", measurementId);
  body.set("cid", clientId());
  body.set("en", event);
  body.set("_s", "1");
  const session = sessionParams();
  if (session) {
    body.set("sid", session.sid);
    body.set("sct", session.sct);
    body.set("seg", "1");
  }
  for (const [key, value] of Object.entries(params)) {
    if (key === "items" && Array.isArray(value)) {
      value.forEach((item, index) => {
        if (!item || typeof item.item_id !== "string" || typeof item.item_category !== "string" || typeof item.price !== "number") return;
        body.set(`pr${index + 1}`, `id${item.item_id}~ca${item.item_category}~pr${item.price}~qt${item.quantity}`);
      });
    } else if (typeof value === "number") body.set(`epn.${key}`, String(value));
    else if (typeof value === "string") body.set(`ep.${key}`, value);
  }
  const payload = body.toString();
  try {
    if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon(COLLECT_URL, payload)) return;
  } catch { /* Fall through to fetch. */ }
  try {
    void fetch(COLLECT_URL, { method: "POST", body: payload, keepalive: true, mode: "no-cors" }).catch(() => {});
  } catch { /* Analytics is best-effort. */ }
}

function deliver(event: string, params: Record<string, AnalyticsValue>) {
  // Account documents do not load gtag. Queue on public pages so the tag flushes one hit.
  if (accountPath() && !gaScriptPresent()) sendCollect(event, params);
  else sendGAEvent("event", event, params);
}

export function claimAnalyticsOnce(key: string, persistence: "session" | "local" = "session") {
  if (!canTrackAnalytics()) return false;
  const id = `anystride:event:${key}`;
  if (seen.has(id)) return false;
  try {
    const box = persistence === "local" ? window.localStorage : window.sessionStorage;
    if (box.getItem(id)) {
      seen.add(id);
      return false;
    }
    box.setItem(id, "1");
  } catch { /* A blocked store still counts once in this document. */ }
  seen.add(id);
  return true;
}

export function trackProductEvent(event: ProductEvent, parameters: Record<string, unknown> = {}) {
  if (!canTrackAnalytics() || !PRODUCT_EVENTS.includes(event)) return;
  // A blocked/unavailable analytics provider must never interrupt training.
  try { deliver(event, productEventParameters(parameters)); } catch { /* Analytics is best-effort. */ }
  capturePostHogProductEvent(event, parameters);
}

export function trackProductEventOnce(key: string, event: ProductEvent, parameters: Record<string, unknown> = {}, persistence: "session" | "local" = "session") {
  if (!claimAnalyticsOnce(key, persistence)) return;
  trackProductEvent(event, parameters);
}

export function trackPageView(pathname: string) {
  if (!canTrackAnalytics()) return;
  const path = publicPagePath(pathname);
  const origin = window.location.origin;
  if (!path || (origin !== "https://anystride.com" && origin !== "https://www.anystride.com")) return;
  // The Google tag already sends the document's first page view. Later App Router
  // pathnames send one more, without the query string, and never repeat a path.
  if (!initialPageViewConsumed) {
    initialPageViewConsumed = true;
    lastPagePath = path;
    return;
  }
  if (path === lastPagePath) return;
  lastPagePath = path;
  try { deliver("page_view", { page_path: path, page_location: `${origin}${path}` }); } catch { /* Analytics is best-effort. */ }
}

export function trackScrollDepth(pathname: string, percent: number) {
  if (!canTrackAnalytics() || !isEngagementPath(pathname)) return;
  if (percent !== 25 && percent !== 50 && percent !== 75 && percent !== 90) return;
  const path = publicPagePath(pathname);
  if (!path) return;
  try { deliver("scroll_depth", { page_path: path, percent_scrolled: percent }); } catch { /* Analytics is best-effort. */ }
}

export function trackEngagedTime(pathname: string) {
  if (!canTrackAnalytics() || !isEngagementPath(pathname)) return;
  const path = publicPagePath(pathname);
  if (!path) return;
  try { deliver("engaged_time", { page_path: path, engagement_time_msec: ENGAGED_TIME_MSEC }); } catch { /* Analytics is best-effort. */ }
}
