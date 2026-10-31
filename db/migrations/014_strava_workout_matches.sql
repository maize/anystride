BEGIN;
CREATE TABLE IF NOT EXISTS strava_workout_matches (
  user_id text NOT NULL,
  activity_id bigint NOT NULL,
  workout_id uuid NOT NULL,
  id uuid NOT NULL UNIQUE,
  PRIMARY KEY(user_id,activity_id),
  UNIQUE(user_id,workout_id),
  FOREIGN KEY(user_id,activity_id) REFERENCES strava_activity_cache(user_id,activity_id) ON DELETE CASCADE,
  FOREIGN KEY(user_id,workout_id) REFERENCES training_entries(user_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS strava_calendar_date ON strava_activity_cache(user_id,(substring(summary->>'date',1,10)),activity_id);
ALTER TABLE strava_workout_matches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON strava_workout_matches FROM PUBLIC;
DO $$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN
      EXECUTE format('REVOKE ALL ON strava_workout_matches FROM %I',r);
    END IF;
  END LOOP;
END $$;
COMMIT;
