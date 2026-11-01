import { EMPTY_TRAINING, isTrainingDate, type TrainingEntry, type TrainingSport } from "./training";
export interface StravaActivity { sourceId: string; date: string; title: string; sport: TrainingSport; minutes: number; km: number | null }
export const STRAVA_FILE_LIMIT = 5 * 1024 * 1024;

/** Parse locally: the original export (including routes and private fields) never leaves the browser. */
export function parseStravaExport(text: string, distanceUnit: "km" | "miles") {
  if (new TextEncoder().encode(text).length > STRAVA_FILE_LIMIT) throw new Error("Choose an activities.csv file smaller than 5 MB.");
  const rows: string[][] = []; let row: string[] = []; let value = ""; let quoted = false; let closed = false;
  const cell = () => { row.push(value); value = ""; closed = false; };
  const line = () => { cell(); if (row.some((v) => v.trim())) rows.push(row); row = []; if (rows.length > 5001) throw new Error("Import up to 5,000 activities per file. Split larger exports first."); };
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"') { if (text[i + 1] === '"') { value += '"'; i++; } else { quoted = false; closed = true; } } else value += c; }
    else if (c === ",") cell();
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; line(); }
    else if (c === '"' && !value && !closed) quoted = true;
    else { if (closed || c === '"') throw new Error("This CSV contains malformed quoted fields. Choose the original Strava export."); value += c; }
  }
  if (quoted) throw new Error("This CSV ends inside a quoted field.");
  if (value || row.length || closed) line();
  const headers = rows.shift()?.map((h) => h.trim());
  const required = ["Activity ID", "Activity Date", "Activity Name", "Activity Type", "Elapsed Time", "Distance"];
  if (!headers || required.some((h) => !headers.includes(h))) throw new Error("Choose activities.csv from a Strava bulk export with English column names.");
  // Strava repeats Distance later with raw metres. The FIRST column uses the export account's display units.
  const indexes = required.map((h) => headers.indexOf(h));
  const activities: StravaActivity[] = []; const warnings: string[] = []; const seen = new Set<string>();
  for (let i = 0; i < rows.length; i++) {
    const [id, rawDate, title, type, elapsed, distance] = indexes.map((index) => rows[i][index]?.trim() ?? "");
    try {
      if (rows[i].length !== headers.length) throw new Error("column count does not match the header");
      if (!/^\d{1,20}$/.test(id)) throw new Error("invalid activity ID");
      if (seen.has(id)) throw new Error("duplicate activity ID in this file");
      const date = stravaDate(rawDate);
      if (!title || title.length > 120 || /[\x00-\x1f]/.test(title)) throw new Error("activity title must be 1–120 characters");
      if (!/^\d+(\.\d+)?$/.test(elapsed) || (distance !== "" && !/^\d+(\.\d+)?$/.test(distance))) throw new Error("elapsed time and distance must be numeric");
      const minutes = Math.round(Number(elapsed) / 60 * 100) / 100;
      const km = distance === "" ? null : Math.round(Number(distance) * (distanceUnit === "miles" ? 1.609344 : 1) * 100) / 100;
      if (minutes <= 0 || minutes > 10080 || (km !== null && km > 2000)) throw new Error("duration or distance is outside supported limits");
      const normalized = type.toLowerCase().replace(/[^a-z]/g, "");
      const sport: TrainingSport = ["run", "trailrun", "virtualrun"].includes(normalized) ? "run" : ["ride", "virtualride", "ebikeride", "mountainbikeride", "gravelride", "handcycle", "velomobile"].includes(normalized) ? "bike" : normalized === "swim" ? "swim" : ["weighttraining", "workout", "crossfit"].includes(normalized) ? "strength" : "other";
      activities.push({ sourceId: `strava-file:${id}`, date, title, sport, minutes, km }); seen.add(id);
    } catch (e) { warnings.push(`Row ${i + 2}: ${e instanceof Error ? e.message : "invalid activity"}.`); }
  }
  return { activities, warnings };
}
function stravaDate(raw: string) {
  let date = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[ T]|$)/)?.[1];
  if (!date) {
    const parts = raw.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})(?:,|\s|$)/);
    if (parts) {
      const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(parts[1].toLowerCase()) + 1;
      date = `${parts[3]}-${String(month).padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    }
  }
  if (!isTrainingDate(date)) throw new Error("unrecognized activity date; use an English or ISO-formatted export");
  return date;
}
export function stravaEntry(activity: StravaActivity, id: string): TrainingEntry {
  return { ...EMPTY_TRAINING, id, kind: "workout", version: 0, date: activity.date, title: activity.title, sport: activity.sport, actualMinutes: activity.minutes, actualKm: activity.km, status: "completed" };
}
