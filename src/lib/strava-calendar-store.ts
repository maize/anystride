import 'server-only';
import { randomUUID } from 'node:crypto';
import type { MarketplaceActor } from './marketplace-auth';
import { MarketplaceError } from './marketplace-config';
import { marketplaceTransaction } from './marketplace-store';
import { requireTraining, trainingScope } from './training-access';
import { trainingMeter } from './training-store';
import type { stravaCalendarQuery, stravaMatchInput } from './strava-calendar-input';
import type { StravaCalendarSnapshot, StravaCalendarActivity } from './strava-calendar';

export async function readStravaCalendar(actor: MarketplaceActor,q: ReturnType<typeof stravaCalendarQuery>): Promise<StravaCalendarSnapshot> {
  requireTraining();
  return marketplaceTransaction(async db=>{
    const scope=await trainingScope(db,actor,q.relationship);
    await trainingMeter(db,actor,'reads');
    const empty: StravaCalendarSnapshot={access:q.relationship ? 'not-shared':'not-connected',connection:null,activities:[],nextCursor:null};
    const c=(await db.query("SELECT generation FROM strava_connections WHERE user_id=$1 AND status='connected' FOR SHARE",[scope.owner])).rows[0];
    if(!c) return empty;
    if(q.relationship && !(await db.query(`SELECT 1 FROM strava_coach_sharing s JOIN training_relationships r ON r.id=s.relationship_id
      WHERE r.id=$1 AND r.coach_id=$2 AND r.athlete_id=$3 AND r.status='active' AND s.user_id=$3
      AND s.generation=$4 AND s.relationship_version=r.version AND s.enabled FOR SHARE OF s`,[q.relationship,actor.id,scope.owner,c.generation])).rowCount) return empty;
    const {rows}=await db.query(`SELECT a.summary,coalesce(e.scheduled_date::text,substring(a.summary->>'date',1,10)) AS calendar_date,
      m.id AS match_id,e.id AS workout_id,e.details->>'title' AS workout_title,e.scheduled_date::text AS workout_date
      FROM strava_activity_cache a LEFT JOIN strava_workout_matches m ON m.user_id=a.user_id AND m.activity_id=a.activity_id
      LEFT JOIN training_entries e ON e.user_id=m.user_id AND e.id=m.workout_id
      WHERE a.user_id=$1 AND a.expires_at>now() AND ($4::boolean=false OR a.coach_visible)
      AND coalesce(a.started_at,(a.summary->>'date')::timestamp AT TIME ZONE 'UTC')>now()-interval '365 days'
      AND NOT EXISTS(SELECT 1 FROM strava_activity_jobs j WHERE j.user_id=a.user_id AND j.activity_id=a.activity_id)
      AND coalesce(e.scheduled_date::text,substring(a.summary->>'date',1,10)) BETWEEN $2 AND $3
      AND ($5::bigint IS NULL OR a.activity_id<$5) ORDER BY a.activity_id DESC LIMIT 51`,[scope.owner,q.from,q.to,Boolean(q.relationship),q.cursor]);
    const activities: StravaCalendarActivity[]=rows.slice(0,50).map(r=>({...r.summary,calendarDate:r.calendar_date,match:r.match_id?{id:r.match_id,workoutId:r.workout_id,title:r.workout_title,date:r.workout_date}:null}));
    return {access:'ready',connection:q.relationship?null:c.generation,activities,nextCursor:rows.length>50?String(activities.at(-1)!.id):null};
  });
}
export async function matchStravaWorkout(actor: MarketplaceActor,input: ReturnType<typeof stravaMatchInput>) {
  requireTraining();
  return marketplaceTransaction(async db=>{
    await trainingScope(db,actor);
    if(input.action==='unmatch') {
      // Stable match ids stop an old undo request removing a newer match.
      await db.query('DELETE FROM strava_workout_matches WHERE user_id=$1 AND activity_id=$2 AND id=$3',[actor.id,input.activityId,input.matchId]);
      return {saved:true};
    }
    await trainingMeter(db,actor,'writes');
    const connection=(await db.query("SELECT generation FROM strava_connections WHERE user_id=$1 AND status='connected' FOR SHARE",[actor.id])).rows[0];
    if(!connection || connection.generation!==input.connection) throw new MarketplaceError('Your Strava connection changed. Refresh the calendar.',409);
    const activity=(await db.query(`SELECT 1 FROM strava_activity_cache a WHERE user_id=$1 AND activity_id=$2 AND expires_at>now()
      AND coalesce(started_at,(summary->>'date')::timestamp AT TIME ZONE 'UTC')>now()-interval '365 days'
      AND NOT EXISTS(SELECT 1 FROM strava_activity_jobs j WHERE j.user_id=a.user_id AND j.activity_id=a.activity_id) FOR SHARE`,[actor.id,input.activityId])).rows[0];
    if(!activity) throw new MarketplaceError('This activity expired or is being updated. Refresh your Strava connection and try again.',409);
    const workout=(await db.query("SELECT version,kind FROM training_entries WHERE user_id=$1 AND id=$2 FOR SHARE",[actor.id,input.workoutId])).rows[0];
    if(!workout || workout.kind!=='workout') throw new MarketplaceError('Choose a workout from your own calendar.',403);
    if(workout.version!==input.workoutVersion) throw new MarketplaceError('This workout changed. Refresh the calendar before matching.',409);
    const existing=await db.query('SELECT activity_id::text,workout_id FROM strava_workout_matches WHERE user_id=$1 AND (activity_id=$2 OR workout_id=$3)',[actor.id,input.activityId,input.workoutId]);
    if(existing.rows.length) {
      if(existing.rows.length===1 && existing.rows[0].activity_id===String(input.activityId) && existing.rows[0].workout_id===input.workoutId) return {saved:true};
      throw new MarketplaceError('This activity or workout already has a match. Remove that match first.',409);
    }
    await db.query('INSERT INTO strava_workout_matches(user_id,activity_id,workout_id,id) VALUES($1,$2,$3,$4)',[actor.id,input.activityId,input.workoutId,randomUUID()]);
    return {saved:true};
  });
}
