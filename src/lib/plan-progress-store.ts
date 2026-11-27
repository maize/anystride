import {
  EMPTY_PLAN_PROGRESS,
  type SavedPlanProgress,
} from "@/lib/plan-progress";

export interface ProgressStore {
  getSnapshot: () => SavedPlanProgress;
  getServerSnapshot: () => SavedPlanProgress;
  subscribe: (listener: () => void) => () => void;
  update: (
    updateProgress: (current: SavedPlanProgress) => SavedPlanProgress,
  ) => void;
}

const progressStores = new Map<string, ProgressStore>();

export function readSavedProgress(value: string | null): SavedPlanProgress {
  if (!value) return EMPTY_PLAN_PROGRESS;

  try {
    const parsed = JSON.parse(value) as Partial<SavedPlanProgress>;
    if (
      typeof parsed.active !== "boolean" ||
      typeof parsed.startDate !== "string" ||
      (parsed.unit !== "mi" && parsed.unit !== "km") ||
      !Array.isArray(parsed.completedWorkoutIds)
    ) {
      return EMPTY_PLAN_PROGRESS;
    }

    return {
      active: parsed.active,
      startDate: parsed.startDate,
      unit: parsed.unit,
      completedWorkoutIds: parsed.completedWorkoutIds.filter(
        (id): id is string => typeof id === "string",
      ),
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return EMPTY_PLAN_PROGRESS;
  }
}

export function getProgressStore(slug: string): ProgressStore {
  const existingStore = progressStores.get(slug);
  if (existingStore) return existingStore;

  const storageKey = `anystride:plan:${slug}:v1`;
  const listeners = new Set<() => void>();
  let current = EMPTY_PLAN_PROGRESS;
  let initialized = false;

  function getSnapshot() {
    if (!initialized && typeof window !== "undefined") {
      try {
        current = readSavedProgress(window.localStorage.getItem(storageKey));
      } catch {
        current = EMPTY_PLAN_PROGRESS;
      }
      initialized = true;
    }
    return current;
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);

    function handleStorage(event: StorageEvent) {
      if (event.key !== storageKey) return;
      current = readSavedProgress(event.newValue);
      initialized = true;
      listeners.forEach((notify) => notify());
    }

    window.addEventListener("storage", handleStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", handleStorage);
    };
  }

  const store: ProgressStore = {
    getSnapshot,
    getServerSnapshot: () => EMPTY_PLAN_PROGRESS,
    subscribe,
    update(updateProgress) {
      const next = updateProgress(getSnapshot());
      current = next;
      initialized = true;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // The plan still works for this visit when storage is unavailable.
      }
      listeners.forEach((listener) => listener());
    },
  };

  progressStores.set(slug, store);
  return store;
}
