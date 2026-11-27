"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  PLAN_EXPERIMENT_COOKIE,
  PLAN_EXPERIMENT_MAX_AGE,
  PLAN_EXPERIMENT_STORAGE_KEY,
  planExperimentEnabled,
  randomUnitInterval,
  resolvePlanExperimentVariant,
  type PlanExperimentVariant,
} from "@/lib/plan-experiment";

const listeners = new Set<() => void>();
let memory: PlanExperimentVariant | null = null;

function readCookie() {
  const prefix = `${PLAN_EXPERIMENT_COOKIE}=`;
  const raw = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  if (!raw) return null;
  try {
    return decodeURIComponent(raw.slice(prefix.length));
  } catch {
    return null;
  }
}

function browserStorage() {
  return {
    getLocal() {
      try {
        return window.localStorage.getItem(PLAN_EXPERIMENT_STORAGE_KEY);
      } catch {
        return null;
      }
    },
    setLocal(value: string) {
      try {
        window.localStorage.setItem(PLAN_EXPERIMENT_STORAGE_KEY, value);
      } catch {
        // The in-memory variant still keeps this visit stable.
      }
    },
    getCookie() {
      return readCookie();
    },
    setCookie(value: string) {
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${PLAN_EXPERIMENT_COOKIE}=${value}; Path=/; Max-Age=${PLAN_EXPERIMENT_MAX_AGE}; SameSite=Lax${secure}`;
    },
  };
}

function readSnapshot() {
  if (typeof window === "undefined") return memory;
  return memory;
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribePlanExperiment(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPlanExperimentSnapshot() {
  return readSnapshot();
}

export function getPlanExperimentServerSnapshot(): PlanExperimentVariant | null {
  return null;
}

export function ensurePlanExperimentAssigned() {
  if (typeof window === "undefined") return memory;
  const next = resolvePlanExperimentVariant(browserStorage(), randomUnitInterval());
  if (next === memory) return next;
  memory = next;
  notify();
  return next;
}

export function usePlanExperiment(slug: string) {
  const enabled = planExperimentEnabled(slug);
  const variant = useSyncExternalStore(
    subscribePlanExperiment,
    getPlanExperimentSnapshot,
    getPlanExperimentServerSnapshot,
  );
  useEffect(() => {
    if (!enabled) return;
    ensurePlanExperimentAssigned();
  }, [enabled]);
  return enabled ? variant : null;
}
