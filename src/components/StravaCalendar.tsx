'use client';
import { createContext,useContext,useEffect,useRef,useState,type ReactNode } from 'react';
import type { TrainingEntry } from '@/lib/training';
import { shiftTrainingDate } from '@/lib/training';
import type { StravaCalendarSnapshot } from '@/lib/strava-calendar';
const button='rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:border-brand hover:text-brand disabled:opacity-40';
const decimal=new Intl.NumberFormat('en',{maximumFractionDigits:1});
const Context=createContext<{data:StravaCalendarSnapshot|null;entries:TrainingEntry[];coach:boolean;busy:boolean;mutate:(body:unknown)=>Promise<void>} | null>(null);
async function fetchCalendar(week:string,relationship?:string,cursor?:string|null,signal?:AbortSignal):Promise<StravaCalendarSnapshot> {
  const q=new URLSearchParams({from:week,to:shiftTrainingDate(week,6)});
  if(relationship)q.set('relationship',relationship);
  if(cursor)q.set('cursor',cursor);
  const r=await fetch(`/api/strava/calendar?${q}`,{cache:'no-store',signal}); const data=await r.json();
  if(!r.ok)throw new Error(data.error||'Could not load Strava activities.'); return data;
}
export function StravaCalendarProvider({week,relationship,entries,disabled,children}:{week:string;relationship?:string;entries:TrainingEntry[];disabled:boolean;children:ReactNode}) {
  const [loaded,setLoaded]=useState<{key:string;data:StravaCalendarSnapshot}|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [cursor,setCursor]=useState<string|null>(null);
  const request=useRef<AbortController|null>(null),lock=useRef(false);
  const revision=entries.map(e=>`${e.id}:${e.version}`).join(',');
  const key=`${week}:${relationship||''}:${revision}`;
  const data=loaded?.key===key?loaded.data:null;
  useEffect(()=>{
    const load=()=>{request.current?.abort();const controller=new AbortController();request.current=controller;return fetchCalendar(week,relationship,null,controller.signal).then(result=>{if(!controller.signal.aborted){setLoaded({key,data:result});setCursor(null);setError('');}}).catch(e=>{if(!controller.signal.aborted){setLoaded(null);setError(e.message);}});};
    void load();
    const visibility=()=>{if(document.visibilityState==='hidden'){request.current?.abort();setLoaded(null);}else void load();};
    document.addEventListener('visibilitychange',visibility);
    return()=>{request.current?.abort();document.removeEventListener('visibilitychange',visibility);};
  },[week,relationship,key]);
  async function refresh(next:string|null=null){
    request.current?.abort();const controller=new AbortController();request.current=controller;
    setLoaded(null);setError('');
    try { const result=await fetchCalendar(week,relationship,next,controller.signal);if(!controller.signal.aborted){setLoaded({key,data:result});setCursor(next);} }
    catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Could not load activities.');}
  }
  async function mutate(body:unknown){
    if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');
    try {const r=await fetch('/api/strava/calendar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await r.json();if(!r.ok)throw new Error(result.error||'Could not update the match.');setMessage('Match updated. Your plan and saved results are unchanged.');await refresh(cursor);}
    catch(e){setLoaded(null);setError(e instanceof Error?e.message:'Could not update the match. Refresh to try again.');}
    finally{lock.current=false;setBusy(false);}
  }
  return <Context.Provider value={{data,entries,coach:Boolean(relationship),busy:busy||disabled,mutate}}>
    <section className="mt-6 rounded-xl border border-border bg-muted/40 p-4" aria-label="Strava calendar controls">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Strava alongside your plan</h2><div className="flex gap-2"><button className={button} disabled={busy||disabled} onClick={()=>void refresh()}>Refresh activities view</button>{data?.nextCursor&&<button className={button} disabled={busy||disabled} onClick={()=>void refresh(data.nextCursor)}>Next 50 activities</button>}{cursor&&<button className={button} disabled={busy||disabled} onClick={()=>void refresh()}>First page</button>}</div></div>
      <p className="mt-2 text-sm text-muted-foreground">{relationship?'Your athlete chooses which Strava activities to share and match.':'Choose a workout beneath a synced activity to match it. One activity per workout; you can undo a match.'} Matches show Strava results alongside the plan without changing saved results or CSV exports. Expired or deleted activities and their matches disappear.</p>
      {data?.access==='not-shared'&&<p className="mt-3 text-sm">Strava sharing is off or the athlete needs to reconnect. Their planned workouts are still available.</p>}
      {data?.access==='not-connected'&&<p className="mt-3 text-sm"><a href="/account/connections" className="text-brand underline">Connect or reconnect Strava</a> to see synced activities here.</p>}
      {data?.access==='ready'&&<p className="mt-3 text-xs text-muted-foreground">{data.activities.length} activities on this page · matched activities appear on their workout’s day · dates follow the activity’s local time.</p>}
      {!data&&!error&&<p role="status" className="mt-3 text-sm">Loading Strava activities…</p>}
      <p role="status" className="mt-2 text-sm text-brand">{message}</p>{error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </section>{children}
  </Context.Provider>;
}
export function StravaCalendarDay({date}:{date:string}){
  const context=useContext(Context);if(!context?.data)return null;
  const {data,entries,coach,busy,mutate}=context;
  return <>{data.activities.filter(a=>a.calendarDate===date).map(activity=><article key={activity.id} className="rounded-xl border border-brand/30 bg-muted/40 p-4">
    <p className="text-xs font-semibold text-brand">Strava · {activity.match?'Matched to a workout':'Unmatched activity'}</p>
    <h4 className="mt-2 break-words font-semibold">{activity.title}</h4>
    <p className="mt-2 text-sm">{decimal.format(activity.distance/1000)} km · {decimal.format(activity.movingSeconds/60)} min moving · {activity.sport}</p>
    <p className="mt-1 text-xs text-muted-foreground">Recorded {activity.date.slice(0,10)} at {activity.date.slice(11,16)} local</p>
    {activity.match&&<p className="mt-3 text-sm"><strong>Workout:</strong> {activity.match.title} · {activity.match.date}</p>}
    {!coach&&(activity.match?<button disabled={busy} className={`${button} mt-3`} onClick={()=>void mutate({action:'unmatch',activityId:activity.id,matchId:activity.match!.id})}>Undo match</button>:<form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={event=>{event.preventDefault();const id=new FormData(event.currentTarget).get('workout');const workout=entries.find(e=>e.id===id);if(workout)void mutate({action:'match',activityId:activity.id,workoutId:workout.id,workoutVersion:workout.version,connection:data.connection});}}>
      <label className="min-w-0 flex-1 text-sm">Match to a workout this week<select name="workout" required disabled={busy} defaultValue="" className="mt-2 block w-full rounded-lg border border-border bg-background p-2"><option value="">Choose a workout</option>{entries.filter(e=>e.kind==='workout'&&!data.activities.some(a=>a.match?.workoutId===e.id)).map(e=><option key={e.id} value={e.id}>{e.date} · {e.title}</option>)}</select></label><button disabled={busy||!entries.length} className={button}>Match activity</button>
    </form>)}
    <a className="mt-3 inline-block text-sm text-brand underline" href={`https://www.strava.com/activities/${activity.id}`} target="_blank" rel="noopener noreferrer">View on Strava</a>
  </article>)}</>;
}
