"use client";
import { useRef, useState } from "react";
import { accountInput } from "./AccountUI";
import { STRAVA_FILE_LIMIT, parseStravaExport, stravaEntry, type StravaActivity } from "@/lib/training-strava";
import { TRAINING_LIMITS, type TrainingEntry } from "@/lib/training";
const button = "rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:border-brand disabled:opacity-40";
type Preview = StravaActivity & { id: string };
export function TrainingImport({ entries, disabled, onImported, onBusy }: { entries: TrainingEntry[]; disabled: boolean; onImported: (entries: TrainingEntry[]) => void; onBusy: (busy: boolean) => void }) {
  const [unit, setUnit] = useState<"km" | "miles">("km");
  const [rows, setRows] = useState<Preview[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  const original = useRef("");
  const fileInput = useRef<HTMLInputElement>(null);
  function preview(text: string, nextUnit: "km" | "miles") {
    const result = parseStravaExport(text, nextUnit);
    setRows(result.activities.map((a) => ({ ...a, id: crypto.randomUUID() }))); setWarnings(result.warnings); setSelected([]); setMatches({}); setPage(0);
    setMessage(`${result.activities.length} activities ready to review. Select up to 20 at a time. Check distances and dates before importing.`);
  }
  async function choose(file?: File) {
    if (!file || lock.current) return;
    setError(""); setMessage(""); setRows([]); setSelected([]); setWarnings([]); original.current = "";
    if (file.size > STRAVA_FILE_LIMIT) { setError("Choose an activities.csv file smaller than 5 MB."); return; }
    lock.current = true; setBusy(true); onBusy(true);
    try { const text = await file.text(); preview(text, unit); original.current = text; }
    catch (e) { setError(e instanceof Error ? e.message : "Could not read this file."); }
    finally { lock.current = false; setBusy(false); onBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  }
  async function importSelected() {
    if (lock.current || !selected.length) return;
    lock.current = true; setBusy(true); onBusy(true); setError(""); setMessage("");
    try {
      const activities = rows.filter((a) => selected.includes(a.sourceId)).map((a) => {
        const match = entries.find((entry) => entry.id === matches[a.sourceId]);
        if (matches[a.sourceId] && !match) throw new Error("A selected match is no longer in this week. Review your matches.");
        return { sourceId: a.sourceId, entry: stravaEntry(a, a.id), match: match ? { id: match.id, version: match.version } : null };
      });
      const response = await fetch("/api/marketplace/training/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activities }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not import activities.");
      onImported(result.entries);
      setRows((current) => current.filter((a) => !selected.includes(a.sourceId))); setSelected([]); setMatches({}); setPage(0);
      setMessage(`${result.imported} activities imported. ${result.duplicates} already imported and left unchanged. Open the activity’s week to see its results.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not import. Your selection is still here."); }
    finally { lock.current = false; setBusy(false); onBusy(false); }
  }
  const visible = rows.slice(page * 20, (page + 1) * 20);
  return <section aria-labelledby="strava-import" className="mt-10 border-t border-border pt-7">
    <h2 id="strava-import" className="text-2xl font-semibold tracking-tight">Bring in Strava activities</h2>
    <p className="mt-3 max-w-2xl text-sm text-muted-foreground">Choose <strong>activities.csv</strong> from your <a className="text-brand underline" href="https://support.strava.com/hc/en-us/articles/216918437-Exporting-your-Data-and-Bulk-Export" target="_blank" rel="noreferrer">Strava bulk export</a>. Review the summaries, then add them as completed workouts or match them to a planned session in the open week.</p>
    <p className="mt-2 text-sm text-muted-foreground">File import, without automatic sync. Only selected dates, titles, sports, elapsed durations, distances and activity IDs are saved. Your original file and routes stay on your device. Connected coaches can see imported results.</p>
    <fieldset disabled={busy || disabled} className="mt-5 flex flex-wrap items-end gap-4"><label className="text-sm font-medium">Distance units used in this export<select value={unit} onChange={(e) => { const next = e.target.value as "km" | "miles"; setUnit(next); setError(""); if (original.current) { try { preview(original.current, next); } catch (err) { setError(err instanceof Error ? err.message : "Could not read export."); } } }} className={accountInput}><option value="km">Kilometres</option><option value="miles">Miles</option></select></label><label className="text-sm font-medium">Strava activities.csv<input ref={fileInput} type="file" accept=".csv,text/csv" onChange={(e) => void choose(e.target.files?.[0])} className={accountInput} /></label></fieldset>
    <p className="mt-2 text-xs text-muted-foreground">English column names · up to 5 MB / 5,000 rows · dates kept as written in the export · elapsed time includes stops</p>
    <p role="status" aria-live="polite" className="mt-4 text-sm text-brand">{busy ? "Reading or importing activities…" : message}</p>
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    {warnings.length > 0 && <details className="mt-4 text-sm"><summary>{warnings.length} rows could not be imported</summary><ul className="mt-2 list-disc pl-5">{warnings.slice(0, 30).map((warning) => <li key={warning}>{warning}</li>)}</ul>{warnings.length > 30 && <p>Showing the first 30 issues. Correct these in a copy of the export before trying again.</p>}</details>}
    {rows.length > 0 && <><div className="mt-5 divide-y divide-border border-y border-border">{visible.map((a) => {
      const duplicate = entries.some((entry) => entry.sourceId === a.sourceId);
      const candidates = entries.filter((entry) => entry.date === a.date && entry.sport === a.sport && entry.status === "planned" && !entry.sourceId);
      return <div key={a.sourceId} className="flex flex-wrap items-center justify-between gap-3 py-4"><label className="flex min-w-0 items-start gap-3"><input type="checkbox" className="mt-1 size-4 accent-brand" checked={selected.includes(a.sourceId)} disabled={busy || disabled || duplicate || (!selected.includes(a.sourceId) && selected.length >= TRAINING_LIMITS.batch)} onChange={(e) => setSelected((ids) => e.target.checked ? [...ids, a.sourceId] : ids.filter((id) => id !== a.sourceId))} /><span className="min-w-0"><span className="block break-words font-medium">{a.title}</span><span className="text-sm text-muted-foreground">{a.date} · {a.sport} · {a.minutes} min · {a.km === null ? "distance not recorded" : `${a.km} km`}{duplicate ? " · Already imported" : ""}</span></span></label><label className="text-sm">Save as<select className={accountInput} disabled={busy || disabled || duplicate} value={matches[a.sourceId] ?? ""} onChange={(e) => setMatches((current) => ({ ...current, [a.sourceId]: e.target.value }))}><option value="">New completed workout</option>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id} disabled={Object.entries(matches).some(([source, id]) => source !== a.sourceId && selected.includes(source) && id === candidate.id)}>{candidate.title} — record results</option>)}</select></label></div>;
    })}</div><div className="mt-4 flex flex-wrap items-center gap-3"><button className={`${button} bg-brand text-brand-foreground`} disabled={busy || disabled || !selected.length} onClick={() => void importSelected()}>Import {selected.length} selected</button><button className={button} disabled={busy || disabled || page === 0} onClick={() => setPage(page - 1)}>Previous</button><span className="text-sm">Page {page + 1} of {Math.ceil(rows.length / 20)}</span><button className={button} disabled={busy || disabled || (page + 1) * 20 >= rows.length} onClick={() => setPage(page + 1)}>Next</button></div></>}
  </section>;
}
