'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { StravaCoachPermission, StravaSharingSnapshot } from '@/lib/strava-sharing';
const button = 'rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand disabled:opacity-40';
async function fetchSharing(signal?: AbortSignal): Promise<StravaSharingSnapshot> {
  const response = await fetch('/api/strava/sharing', { cache: 'no-store', signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load coach sharing.');
  return data;
}
export function StravaCoachSharing() {
  const [snapshot, setSnapshot] = useState<StravaSharingSnapshot | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const locked = useRef(false);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setSnapshot(await fetchSharing(signal));
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetchSharing(controller.signal).then(data => { if (!controller.signal.aborted) setSnapshot(data); }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, []);
  async function change(coach: StravaCoachPermission, enabled: boolean) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/strava/sharing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: coach.id, connection: coach.connection, enabled, version: coach.version, relationshipVersion: coach.relationshipVersion }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update sharing.');
      setSnapshot(s => s && ({ coaches: s.coaches.map(c => c.id === coach.id ? { ...c, shared: result.shared, authorized: enabled, version: result.version } : c) }));
      setConfirm(null);
      setMessage(enabled ? `Strava activities are now shared with ${coach.coachName}.` : `Strava access stopped for ${coach.coachName}. Your shared training calendar stays available.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); await refresh().catch(() => {}); }
    finally { locked.current = false; setBusy(false); }
  }
  return <section id="coach-sharing" aria-labelledby="coach-sharing-title" aria-busy={busy} className="mt-8 rounded-xl border border-border p-5 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="coach-sharing-title" className="text-xl font-semibold">Coach sharing</h2><button className={button} disabled={busy} onClick={() => { setError(''); void refresh().catch(e => setError(e.message)); }}>Refresh permissions</button></div>
    <p className="mt-3 max-w-2xl text-sm text-muted-foreground">You choose which coaches can see your synced Strava activities. Sharing includes available summaries from the past year and future syncs: activity name, date, sport, distance, duration, elevation and device. “Only You” activities are always excluded.</p>
    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Stop sharing at any time without ending coaching. Ending coach access or disconnecting Strava also stops sharing. Reconnecting requires fresh permission. Information a coach has already viewed cannot be recalled.</p>
    {!snapshot && !error && <p role="status" className="mt-4 text-sm">Loading sharing controls…</p>}
    {snapshot?.coaches.length === 0 && <p className="mt-5 text-sm">No connected coaches. Accept an invitation in <a href="/account/athletes" className="text-brand underline">Athletes & coaches</a>, then choose who can see your Strava activities here.</p>}
    <div className="mt-5 divide-y divide-border">{snapshot?.coaches.map(coach => <article key={coach.id} className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">{coach.coachName}</h3><p className="mt-1 text-sm text-muted-foreground">{coach.shared ? 'Strava activities shared' : coach.authorized ? 'Sharing paused — permission is still enabled' : 'Strava activities not shared'}</p></div>
        {coach.authorized ? <button disabled={busy} className={button} onClick={() => void change(coach,false)}>Stop sharing with {coach.coachName}</button> : <button disabled={busy || !coach.canShare} className={button} onClick={() => setConfirm(coach.id)}>Share with {coach.coachName}</button>}
      </div>
      {!coach.canShare && <p className="mt-2 text-sm text-muted-foreground">Sharing needs a connected Strava account and an approved, connected coach.</p>}
      {confirm === coach.id && !coach.authorized && <form className="mt-4 rounded-lg bg-muted/50 p-4" onSubmit={event => { event.preventDefault(); void change(coach,true); }}>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" required disabled={busy} className="mt-1 accent-brand" /><span>I authorize {coach.coachName} to view my past-year and future synced Strava activity summaries, excluding “Only You” activities.</span></label>
        <div className="mt-4 flex flex-wrap gap-3"><button disabled={busy} className={button}>Confirm sharing</button><button type="button" disabled={busy} className={button} onClick={() => setConfirm(null)}>Cancel</button></div>
      </form>}
    </article>)}</div>
    <p role="status" aria-live="polite" className="mt-3 text-sm text-brand">{message}</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </section>;
}
