/**
 * Pace + race-time prediction engine.
 *
 * Built entirely on publicly-documented formulas (no copyrighted lookup tables):
 *  - Race-time equivalence: Pete Riegel's endurance formula
 *    (T2 = T1 * (D2/D1)^1.06).
 *  - Training paces: the Daniels–Gilbert VDOT model. The *formulas* relating
 *    velocity, VO2, and %VO2max are public; only Daniels' printed tables are
 *    copyrighted. Zone intensities below are calibrated so output matches the
 *    well-known VDOT paces within a few seconds.
 *
 * All internal math is metric (meters, minutes); helpers format to min/km and
 * min/mile.
 */

export const RIEGEL_EXPONENT = 1.06;

export const DISTANCES_M = {
  "1mi": 1609.34,
  "5k": 5000,
  "10k": 10000,
  "half-marathon": 21097.5,
  marathon: 42195,
} as const;

export type RaceKey = keyof typeof DISTANCES_M;

export const RACE_LABELS: Record<RaceKey, string> = {
  "1mi": "1 mile",
  "5k": "5K",
  "10k": "10K",
  "half-marathon": "Half Marathon",
  marathon: "Marathon",
};

/** Predict the equivalent time (seconds) at distance d2 from a result at d1. */
export function riegelPredict(
  knownDistanceM: number,
  knownTimeSec: number,
  targetDistanceM: number,
): number {
  return knownTimeSec * Math.pow(targetDistanceM / knownDistanceM, RIEGEL_EXPONENT);
}

/** Daniels %VO2max sustained for a race of the given duration (minutes). */
function pctMax(timeMin: number): number {
  return (
    0.8 +
    0.1894393 * Math.exp(-0.012778 * timeMin) +
    0.2989558 * Math.exp(-0.1932605 * timeMin)
  );
}

/** VO2 cost (ml/kg/min) of running at velocity v (meters/minute). */
function vo2OfVelocity(v: number): number {
  return -4.6 + 0.182258 * v + 0.000104 * v * v;
}

/** Invert vo2OfVelocity: velocity (m/min) that costs a given VO2. */
function velocityOfVo2(vo2: number): number {
  // 0.000104 v^2 + 0.182258 v - (4.6 + vo2) = 0
  const a = 0.000104;
  const b = 0.182258;
  const c = -(4.6 + vo2);
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

/** Estimate VDOT (Daniels' VO2max proxy) from a race performance. */
export function vdotFromRace(distanceM: number, timeSec: number): number {
  const timeMin = timeSec / 60;
  const v = distanceM / timeMin; // m/min
  return vo2OfVelocity(v) / pctMax(timeMin);
}

export type ZoneKey = "easy" | "marathon" | "threshold" | "interval" | "rep";

/**
 * Fraction of VDOT (≈ %VO2max) used for each training zone. Calibrated against
 * Daniels' published paces (e.g. a VDOT-50 runner: T ≈ 4:16/km, E ≈ 5:10/km).
 */
const ZONE_INTENSITY: Record<Exclude<ZoneKey, "rep">, number> = {
  easy: 0.68,
  marathon: 0.79,
  threshold: 0.88,
  interval: 0.97,
};

export const ZONE_LABELS: Record<ZoneKey, string> = {
  easy: "Easy / Long",
  marathon: "Marathon",
  threshold: "Threshold (Tempo)",
  interval: "Interval",
  rep: "Reps / Strides",
};

export const ZONE_BLURB: Record<ZoneKey, string> = {
  easy: "Conversational. Most of your weekly miles, including the long run.",
  marathon: "Steady goal-marathon effort — controlled, not hard.",
  threshold: "Comfortably hard, ~1-hour race effort. Tempo runs & cruise intervals.",
  interval: "Hard, ~3–5K effort. 3–5 min reps to build VO2max.",
  rep: "Fast & smooth, ~mile effort. Short strides/reps for speed & economy.",
};

/** Seconds per kilometer for a zone, given VDOT (and predicted mile for reps). */
export function zonePaceSecPerKm(
  zone: ZoneKey,
  vdot: number,
  predictedMileSec: number,
): number {
  if (zone === "rep") {
    // Reps ≈ current mile race pace.
    return predictedMileSec / (DISTANCES_M["1mi"] / 1000);
  }
  const vo2 = ZONE_INTENSITY[zone] * vdot;
  const v = velocityOfVo2(vo2); // m/min
  return 60 / (v / 1000); // sec per km
}

// ---- formatting helpers ----

const KM_PER_MILE = 1.609344;

/** "H:MM:SS" or "MM:SS" for a duration in seconds. */
export function formatTime(totalSec: number): string {
  const s = Math.round(totalSec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm(m)}:${mm(sec)}` : `${m}:${mm(sec)}`;
}

/** "M:SS" pace from seconds-per-unit. */
export function formatPace(secPerUnit: number): string {
  const s = Math.round(secPerUnit);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export const secPerKmToSecPerMile = (secPerKm: number) => secPerKm * KM_PER_MILE;

/** Parse "MM:SS" or "H:MM:SS" (or "HH:MM:SS") into seconds. Returns null if invalid. */
export function parseTime(input: string): number | null {
  const parts = input.trim().split(":").map((p) => p.trim());
  if (parts.length < 2 || parts.length > 3) return null;
  if (parts.some((p) => p === "" || !/^\d+$/.test(p))) return null;
  const nums = parts.map(Number);
  const [h, m, s] = parts.length === 3 ? nums : [0, nums[0], nums[1]];
  if (m >= 60 || s >= 60) return null;
  return h * 3600 + m * 60 + s;
}

export interface PaceResult {
  vdot: number;
  predictions: { race: RaceKey; timeSec: number }[];
  zones: { zone: ZoneKey; secPerKm: number; secPerMile: number }[];
}

/** Full computation from a single race/goal performance. */
export function computePaces(distanceM: number, timeSec: number): PaceResult {
  const vdot = vdotFromRace(distanceM, timeSec);
  const predictions = (Object.keys(DISTANCES_M) as RaceKey[]).map((race) => ({
    race,
    timeSec: riegelPredict(distanceM, timeSec, DISTANCES_M[race]),
  }));
  const predictedMileSec = riegelPredict(distanceM, timeSec, DISTANCES_M["1mi"]);
  const zones = (Object.keys(ZONE_LABELS) as ZoneKey[]).map((zone) => {
    const secPerKm = zonePaceSecPerKm(zone, vdot, predictedMileSec);
    return { zone, secPerKm, secPerMile: secPerKmToSecPerMile(secPerKm) };
  });
  return { vdot, predictions, zones };
}
