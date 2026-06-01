import {
  DISTANCE_LABELS,
  INTENSITY_LABELS,
  LEVEL_LABELS,
  type Distance,
  type Intensity,
  type Level,
} from "@/data/types";

const LEVEL_STYLES: Record<Level, string> = {
  beginner: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  intermediate: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  advanced: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
};

export function DistanceBadge({ distance }: { distance: Distance }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      {DISTANCE_LABELS[distance]}
    </span>
  );
}

export function LevelBadge({ level }: { level: Level }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${LEVEL_STYLES[level]}`}
    >
      {LEVEL_LABELS[level]}
    </span>
  );
}

const INTENSITY_FILLED: Record<Intensity, number> = {
  low: 1,
  moderate: 2,
  high: 3,
};

export function IntensityMeter({ intensity }: { intensity: Intensity }) {
  const filled = INTENSITY_FILLED[intensity];
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={`Intensity: ${INTENSITY_LABELS[intensity]}`}
    >
      <span className="flex gap-0.5">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-1.5 w-4 rounded-full ${n <= filled ? "bg-brand" : "bg-border"}`}
          />
        ))}
      </span>
      <span className="text-xs text-muted-foreground">
        {INTENSITY_LABELS[intensity]}
      </span>
    </span>
  );
}
