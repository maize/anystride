export interface StravaActivity {
  id: number; title: string; sport: string; date: string;
  distance: number; movingSeconds: number; elapsedSeconds: number;
  elevation: number; device: string | null;
}
export interface StravaSnapshot {
  available: boolean; connected: boolean; reconnect: boolean;
  lastSync: string | null; pending: boolean; message: string | null;
  privateActivities: boolean; activities: StravaActivity[];
}
export const STRAVA_LIMITS = { athletes: 10, pageSize: 100, historyDays: 365, cacheDays: 6, refreshMinutes: 15, callsPerWindow: 80, callsPerDay: 800 } as const;

/** Whitelist summaries only: never persist raw responses, GPS, profiles or streams. */
export function stravaSummary(value: unknown): StravaActivity | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const finite = (key: string, max: number) => typeof row[key] === 'number' && Number.isFinite(row[key]) && row[key] >= 0 && row[key] <= max;
  if (!Number.isSafeInteger(row.id) || Number(row.id) <= 0 || typeof row.start_date_local !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(row.start_date_local) || !Number.isFinite(Date.parse(row.start_date_local)) ||
      !finite('distance', 10_000_000) || !finite('moving_time', 10_000_000) || !finite('elapsed_time', 10_000_000)) return null;
  const clean = (v: unknown, max: number) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max) : '';
  return {
    id: Number(row.id), title: clean(row.name, 120) || 'Untitled activity', sport: clean(row.sport_type || row.type, 40) || 'Activity',
    date: row.start_date_local.slice(0, 19), distance: Number(row.distance), movingSeconds: Number(row.moving_time), elapsedSeconds: Number(row.elapsed_time),
    elevation: finite('total_elevation_gain', 100_000) ? Number(row.total_elevation_gain) : 0,
    device: clean(row.device_name, 80) || null,
  };
}
