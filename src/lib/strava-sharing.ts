import type { StravaActivity } from './strava';
export interface StravaCoachPermission {
  id: string; connection: string | null; coachName: string; authorized: boolean; shared: boolean; canShare: boolean;
  version: number; relationshipVersion: number;
}
export interface StravaSharingSnapshot { coaches: StravaCoachPermission[] }
export interface StravaCoachActivities {
  athleteName: string; lastSync: string | null;
  activities: StravaActivity[]; nextCursor: string | null;
}
