'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { StravaCoachActivities } from '@/lib/strava-sharing';
const button = 'rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand disabled:opacity-40';
const decimal = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });
async function fetchActivities(relationship: string, cursor: string | null, signal: AbortSignal): Promise<StravaCoachActivities> {
  const params = new URLSearchParams({ relationship });
  if (cursor) params.set('cursor',cursor);
  const response = await fetch(`/api/strava/coach-activities?${params}`, { cache: 'no-store', signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load shared activities.');
  return data;
}
export function CoachStravaActivities({ relationship }: { relationship: string }) {
  const [snapshot,setSnapshot] = useState<StravaCoachActivities | null>(null);
  const [cursor,setCursor] = useState<string | null>(null);
  const [busy,setBusy] = useState(true);
  const [error,setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const load = useCallback(async (next: string | null = null) => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(''); setSnapshot(null);
    try {
      const data = await fetchActivities(relationship,next,controller.signal);
      if (!controller.signal.aborted) { setSnapshot(data); setCursor(next); }
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Could not load activities.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }, [relationship]);
  useEffect(() => {
    const controller = new AbortController(); request.current = controller;
    fetchActivities(relationship,null,controller.signal)
      .then(data => { if (!controller.signal.aborted) { setSnapshot(data); setBusy(false); } })
      .catch(e => { if (!controller.signal.aborted) { setError(e.message); setBusy(false); } });
    // Discard sensitive content when leaving the tab; recheck permission on return.
    const visibility = () => {
      if (document.visibilityState === 'hidden') { request.current?.abort(); setSnapshot(null); }
      else void load();
    };
    window.addEventListener('pageshow',visibility);
    document.addEventListener('visibilitychange',visibility);
    return () => { request.current?.abort(); window.removeEventListener('pageshow',visibility); document.removeEventListener('visibilitychange',visibility); };
  }, [load,relationship]);
  return <div aria-busy={busy}>
    <a href="/account/athletes" className="text-sm text-brand underline">← Athletes & coaches</a>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-brand">Shared by your athlete</p><h1 className="mt-2 text-3xl font-semibold">{snapshot ? `${snapshot.athleteName} · Strava activities` : 'Shared Strava activities'}</h1></div><button className={button} disabled={busy} onClick={() => void load(cursor)}>Refresh view</button></div>
    <p className="mt-3 max-w-2xl text-sm text-muted-foreground">Activity summaries from the past year, shared with the athlete’s permission. “Only You” activities are excluded. These summaries do not mark planned workouts complete.</p>
    <p className="mt-2 text-sm"><a className="text-brand underline" href={`/account/training?athlete=${relationship}`}>Open training calendar →</a></p>
    {busy && <p role="status" className="mt-6">Loading shared activities…</p>}
    {error && <p role="alert" className="mt-6 rounded-lg border border-border p-5">{error}</p>}
    {snapshot && <>
      <p className="mt-6 text-xs text-muted-foreground">{snapshot.lastSync ? `Last synced ${new Date(snapshot.lastSync).toLocaleString('en', { timeZone: 'UTC' })} UTC. ` : ''}Showing up to 50 activities per page. Refresh view checks existing synced data without requesting another Strava sync.</p>
      {!snapshot.activities.length && <p className="mt-6 rounded-lg border border-dashed border-border p-5 text-muted-foreground">No shared activities on this page. The athlete can refresh Strava in Connections if their summaries have expired. Updated activities stay hidden while privacy changes are checked.</p>}
      <ul className="mt-5 divide-y divide-border border-y border-border">{snapshot.activities.map(activity => <li key={activity.id} className="py-5">
        <p className="text-xs text-muted-foreground">{activity.date.slice(0,10)} · {activity.date.slice(11,16)} local · {activity.sport.replace(/([a-z])([A-Z])/g,'$1 $2')}</p><h2 className="mt-1 break-words font-semibold">{activity.title}</h2>
        <dl className="mt-3 flex flex-wrap gap-x-7 gap-y-2 text-sm"><div><dt className="text-xs text-muted-foreground">Distance</dt><dd>{decimal.format(activity.distance/1000)} km</dd></div><div><dt className="text-xs text-muted-foreground">Moving time</dt><dd>{decimal.format(activity.movingSeconds/60)} min</dd></div><div><dt className="text-xs text-muted-foreground">Elevation gain</dt><dd>{decimal.format(activity.elevation)} m</dd></div></dl>
        {activity.device && <p className="mt-2 text-xs text-muted-foreground">Recorded with {activity.device}</p>}
        <a href={`https://www.strava.com/activities/${activity.id}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-brand underline">View on Strava</a>
      </li>)}</ul>
      <div className="mt-5 flex flex-wrap gap-3">{cursor && <button className={button} disabled={busy} onClick={() => void load()}>Back to latest</button>}{snapshot.nextCursor && <button className={button} disabled={busy} onClick={() => void load(snapshot.nextCursor)}>Older activities</button>}</div>
    </>}
  </div>;
}
