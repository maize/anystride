-- Resumable, temporary year-long activity cache. No new browser permissions.
BEGIN;
ALTER TABLE strava_connections ADD COLUMN IF NOT EXISTS last_full_sync timestamptz;
ALTER TABLE strava_sync_jobs ADD COLUMN IF NOT EXISTS scan_id uuid;
ALTER TABLE strava_sync_jobs ADD COLUMN IF NOT EXISTS scan_before bigint;
ALTER TABLE strava_sync_jobs ADD COLUMN IF NOT EXISTS scan_after bigint;
ALTER TABLE strava_sync_jobs ADD COLUMN IF NOT EXISTS full_history boolean;
ALTER TABLE strava_sync_jobs ADD COLUMN IF NOT EXISTS page integer NOT NULL DEFAULT 1;
ALTER TABLE strava_activity_cache ADD COLUMN IF NOT EXISTS scan_id uuid;
ALTER TABLE strava_activity_cache ADD COLUMN IF NOT EXISTS fetched_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE strava_activity_cache ADD COLUMN IF NOT EXISTS started_at timestamptz;
CREATE TABLE IF NOT EXISTS strava_activity_jobs (
  user_id text NOT NULL REFERENCES strava_connections(user_id) ON DELETE CASCADE,
  activity_id bigint NOT NULL,
  version integer NOT NULL DEFAULT 1,
  available_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '6 days',
  PRIMARY KEY(user_id,activity_id)
);
ALTER TABLE strava_activity_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON strava_activity_jobs FROM PUBLIC;
DO $$ DECLARE role_name text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
      EXECUTE format('REVOKE ALL ON strava_activity_jobs FROM %I',role_name);
    END IF;
  END LOOP;
END $$;
COMMIT;
