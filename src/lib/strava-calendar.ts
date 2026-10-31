import type { StravaActivity } from './strava';
export interface StravaCalendarActivity extends StravaActivity {
  calendarDate: string;
  match: { id: string; workoutId: string; title: string; date: string } | null;
}
export interface StravaCalendarSnapshot {
  access: 'ready' | 'not-connected' | 'not-shared';
  connection: string | null;
  activities: StravaCalendarActivity[];
  nextCursor: string | null;
}
