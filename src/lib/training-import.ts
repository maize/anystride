import "server-only";
import type { MarketplaceActor } from "./marketplace-auth";
import { MarketplaceError } from "./marketplace-config";
import { marketplaceTransaction } from "./marketplace-store";
import { requireTraining, trainingScope } from "./training-access";
import { parseTrainingAction, trainingReference } from "./training-input";
import { saveTrainingEntry, trainingColumns, trainingEntry, trainingMeter, type TrainingRow } from "./training-store";
import { TRAINING_LIMITS, trainingInputEntry, type TrainingEntry } from "./training";
interface ImportItem { sourceId: string; entry: TrainingEntry; match: { id: string; version: number } | null }
export function parseTrainingImport(input: unknown): ImportItem[] {
  const invalid = (message = "Choose up to 20 valid Strava activities to import."): never => { throw new MarketplaceError(message, 400); };
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).join() !== "activities") return invalid();
  const items = (input as { activities: unknown }).activities;
  if (!Array.isArray(items) || !items.length || items.length > TRAINING_LIMITS.batch) return invalid();
  const sources = new Set<string>(); const ids = new Set<string>();
  return items.map((item) => {
    if (!item || typeof item !== "object" || Object.keys(item).length !== 3 || Object.keys(item).some((k) => !["sourceId", "entry", "match"].includes(k))) return invalid();
    if (typeof item.sourceId !== "string" || !/^strava-file:\d{1,20}$/.test(item.sourceId) || sources.has(item.sourceId)) return invalid();
    const action = parseTrainingAction({ action: "save", entry: item.entry });
    if (action.action !== "save") return invalid();
    const entry = action.entry;
    if ((entry.structure?.length ?? 0) > 0 || entry.kind !== "workout" || entry.version !== 0 || entry.status !== "completed" || entry.plannedMinutes !== null || entry.plannedKm !== null || entry.notes !== "" || entry.effort !== null || entry.actualMinutes === null || entry.actualMinutes <= 0) return invalid();
    let match = null;
    if (item.match !== null) {
      if (!item.match || typeof item.match !== "object" || Object.keys(item.match).length !== 2 || Object.keys(item.match).some((k) => !["id", "version"].includes(k)) || !Number.isSafeInteger(item.match.version) || item.match.version < 1 || item.match.version > 1000000) return invalid();
      match = { id: trainingReference(item.match.id), version: item.match.version as number };
    }
    const target = match?.id ?? entry.id;
    if (ids.has(target)) return invalid("Choose a different planned workout for each activity.");
    sources.add(item.sourceId); ids.add(target);
    return { sourceId: item.sourceId, entry, match };
  });
}
export async function importTraining(actor: MarketplaceActor, items: ImportItem[]) {
  requireTraining();
  return marketplaceTransaction(async (client) => {
    await trainingScope(client, actor);
    const duplicates = await client.query<{ source_id: string }>("SELECT source_id FROM training_entries WHERE user_id=$1 AND source_id=ANY($2::text[])", [actor.id, items.map((item) => item.sourceId)]);
    const known = new Set(duplicates.rows.map((r) => r.source_id));
    const pending = items.filter((item) => !known.has(item.sourceId));
    await trainingMeter(client, actor, "writes", Math.max(1, pending.length));
    const entries: TrainingEntry[] = [];
    for (const item of pending) {
      let entry = item.entry;
      if (item.match) {
        const { rows: [row] } = await client.query<TrainingRow>(`SELECT ${trainingColumns} FROM training_entries WHERE user_id=$1 AND id=$2 FOR UPDATE`, [actor.id, item.match.id]);
        if (!row || row.kind !== "workout" || row.version !== item.match.version || row.details.status !== "planned" || row.date !== entry.date || row.details.sport !== entry.sport || row.source_id) throw new MarketplaceError("A matching workout changed or is no longer planned. Reload the week and review the match.", 409);
        entry = { ...trainingInputEntry(trainingEntry(row)), status: "completed", actualMinutes: entry.actualMinutes, actualKm: entry.actualKm };
      }
      await saveTrainingEntry(client, actor.id, { action: "save", entry });
      const { rows: [saved] } = await client.query<TrainingRow>(`UPDATE training_entries SET source_id=$3 WHERE user_id=$1 AND id=$2 RETURNING ${trainingColumns}`, [actor.id, entry.id, item.sourceId]);
      entries.push(trainingEntry(saved));
    }
    return { saved: true, imported: pending.length, duplicates: known.size, entries };
  });
}
