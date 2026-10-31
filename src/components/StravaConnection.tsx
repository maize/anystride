'use client';
import { useRef, useState, type FormEvent } from 'react';
import { StravaCoachSharing } from './StravaCoachSharing';
import { STRAVA_LIMITS, type StravaSnapshot } from '@/lib/strava';
const button = 'rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40';
const decimal = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });
const date = (value: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(value.endsWith('Z') ? value : `${value}Z`));
const outcomes: Record<string, string> = {
  connected: 'Strava is connected. Your first sync is underway. Check status in a moment.',
  cancelled: 'Connection cancelled. No new Strava connection was added.',
  failed: 'We could not connect Strava. Check that you are signed in to Anystride, allow activity access in Strava, and try again. If the beta is full or the account is already linked elsewhere, contact support.',
};
export function StravaConnection({ initial, outcome }: { initial: StravaSnapshot; outcome?: string }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [visibleCount, setVisibleCount] = useState(50);
  const [message, setMessage] = useState(outcome ? outcomes[outcome] || '' : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const locked = useRef(false);
  async function check() {
    const response = await fetch('/api/strava/activities', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load your connection.');
    setSnapshot(result);
    return result as StravaSnapshot;
  }
  async function action(kind: 'refresh' | 'disconnect' | 'check') {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try {
      if (kind === 'check') {
        const result = await check();
        setMessage(result.pending ? 'Sync is still underway. Check again shortly.' : result.connected ? 'Connection status updated.' : 'Strava is disconnected. Synced activities have been removed.');
      } else {
        const response = await fetch('/api/strava/activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: kind }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not update your connection.');
        setMessage(result.message); setConfirmDisconnect(false);
        // Remove sensitive content immediately after deletion, even if the follow-up read fails.
        if (kind === 'disconnect') setSnapshot((s) => ({ ...s, connected: false, activities: [], pending: false, lastSync: null, reconnect: false }));
        await check();
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { locked.current = false; setBusy(false); }
  }
  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (locked.current) return;
    const data = new FormData(event.currentTarget);
    locked.current = true; setBusy(true); setError('');
    try {
      const response = await fetch('/api/strava/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consent: data.get('consent') === 'on', privateActivities: data.get('private') === 'on' }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not start the Strava connection.');
      window.location.assign(result.url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); locked.current = false; setBusy(false); }
  }
  return <div aria-busy={busy}>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-brand">Your activities</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Strava connection</h1><p className="mt-3 max-w-2xl text-muted-foreground">Sync your past year of Strava activities and manage sharing with your coaches.</p></div>
      <a href="/account/training" className={button}>Back to your training</a>
    </div>
    <section aria-labelledby="strava-connection" className="mt-8 rounded-xl border border-border bg-gradient-to-br from-muted/60 to-background p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="strava-connection" className="text-xl font-semibold">Strava</h2><span className="rounded-full border border-border px-3 py-1 text-xs font-semibold">{snapshot.reconnect ? 'Reconnect needed' : snapshot.connected ? 'Connected' : snapshot.available ? 'Ready to connect' : 'Setup in progress'}</span></div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Private until you choose to share with a named coach below. Synced activities can appear alongside your calendar workouts. Matching keeps saved plans and results unchanged.</p>
      {!snapshot.available && <p className="mt-4 text-sm">Automatic sync is not available yet. You can still use <a href="/account/training" className="text-brand underline">file import in your training calendar</a>.</p>}
      {snapshot.available && (!snapshot.connected || snapshot.reconnect) && <form onSubmit={connect} className="mt-6 max-w-2xl space-y-4">
        <label className="flex items-start gap-3 text-sm"><input name="consent" type="checkbox" required disabled={busy} className="mt-1 accent-brand" /><span>I agree to let Anystride access my recent activity summaries and keep temporary copies for up to six days. I can disconnect below to delete them. <a href="/privacy" className="text-brand underline">Privacy details</a></span></label>
        <label className="flex items-start gap-3 text-sm"><input name="private" type="checkbox" defaultChecked={snapshot.privateActivities} disabled={busy} className="mt-1 accent-brand" /><span>Also include activities set to “Only You” in Strava. They remain private here.</span></label>
        <button className={`${button} bg-brand text-brand-foreground hover:text-brand-foreground`} disabled={busy}>{snapshot.reconnect ? 'Reconnect Strava' : 'Connect with Strava'}</button>
      </form>}
      {snapshot.connected && <>
        <p className="mt-4 text-sm text-muted-foreground">{snapshot.lastSync ? `Last synced ${date(snapshot.lastSync)} UTC.` : 'Waiting for your first sync.'} {snapshot.pending ? 'An update is queued.' : ''}</p>
        {snapshot.message && <p className="mt-2 text-sm">{snapshot.message}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button className={button} disabled={busy} onClick={() => void action('check')}>Check status</button>
          <button className={button} disabled={busy || !snapshot.available || snapshot.reconnect || snapshot.pending} onClick={() => void action('refresh')}>Refresh activities</button>
          <button className={button} disabled={busy} onClick={() => setConfirmDisconnect(true)}>Disconnect</button>
        </div>
        {confirmDisconnect && <div className="mt-4 rounded-lg border border-border p-4"><p className="text-sm">Disconnect Strava and delete all synced activities from Anystride? Your training plans and manually recorded workouts will stay.</p><div className="mt-3 flex flex-wrap gap-3"><button className={button} disabled={busy} onClick={() => void action('disconnect')}>Disconnect and delete</button><button className={button} disabled={busy} onClick={() => setConfirmDisconnect(false)}>Keep connected</button></div></div>}
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">New activities update automatically. Refresh is available every 15 minutes. You can also revoke access in <a href="https://www.strava.com/settings/apps" target="_blank" rel="noopener noreferrer" className="underline">Strava settings</a>.</p>
      </>}
    </section>
    <p role="status" aria-live="polite" className="mt-4 text-sm text-brand">{busy ? 'Updating your connection…' : message}</p>
    {error && <p role="alert" className="mt-4 rounded-lg border border-red-300 p-4 text-sm text-red-700">{error}</p>}
    {!snapshot.connected && <p className="mt-4 text-xs text-muted-foreground">You can revoke Anystride’s access at any time in <a href="https://www.strava.com/settings/apps" target="_blank" rel="noopener noreferrer" className="underline">Strava settings</a>.</p>}
    <StravaCoachSharing key={`${snapshot.connected}:${snapshot.reconnect}`} />
    {snapshot.connected && <section aria-labelledby="recent-activities" className="mt-8">
      <h2 id="recent-activities" className="text-xl font-semibold">Recent activities</h2><p className="mt-2 text-sm text-muted-foreground">{snapshot.activities.length} synced activities from the past {STRAVA_LIMITS.historyDays} days. The full year loads in small batches. Activity times follow the location where you recorded them. Cached copies expire after six days; refresh to fetch them again.</p>
      {snapshot.activities.length === 0 ? <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-muted-foreground">{snapshot.pending ? 'Your first activities will appear after sync finishes. Use Check status to update this view.' : 'No activities to show yet. Refresh to check Strava, or record your next activity there.'}</p> : <ul className="mt-5 divide-y divide-border border-y border-border">{snapshot.activities.slice(0, visibleCount).map((activity) => <li key={activity.id} className="grid gap-4 py-5 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0"><p className="text-xs text-muted-foreground">{date(activity.date)} · {activity.sport.replace(/([a-z])([A-Z])/g, '$1 $2')}</p><h3 className="mt-1 break-words font-semibold">{activity.title}</h3><dl className="mt-3 flex flex-wrap gap-x-7 gap-y-2 text-sm"><div><dt className="text-xs text-muted-foreground">Distance</dt><dd>{decimal.format(activity.distance/1000)} km</dd></div><div><dt className="text-xs text-muted-foreground">Moving time</dt><dd>{decimal.format(activity.movingSeconds/60)} min</dd></div><div><dt className="text-xs text-muted-foreground">Elevation gain</dt><dd>{decimal.format(activity.elevation)} m</dd></div></dl>{activity.device && <p className="mt-2 text-xs text-muted-foreground">Recorded with {activity.device}</p>}</div>
        <a className="self-center text-sm font-semibold text-brand underline" href={`https://www.strava.com/activities/${activity.id}`} target="_blank" rel="noopener noreferrer">View on Strava</a>
      </li>)}</ul>}
      {snapshot.activities.length > visibleCount && <button className={`${button} mt-5`} onClick={() => setVisibleCount(n => n+50)}>Show more activities ({snapshot.activities.length-visibleCount} remaining)</button>}
    </section>}
  </div>;
}
