-- Explicit, connection-bound consent. Never copy provider data into coach calendars.
BEGIN;
CREATE TABLE IF NOT EXISTS strava_coach_sharing (
  relationship_id uuid PRIMARY KEY REFERENCES training_relationships(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES strava_connections(user_id) ON DELETE CASCADE,
  generation uuid NOT NULL,
  relationship_version integer NOT NULL,
  enabled boolean NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE strava_coach_sharing ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON strava_coach_sharing FROM PUBLIC;
DO $$ DECLARE role_name text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
      EXECUTE format('REVOKE ALL ON strava_coach_sharing FROM %I',role_name);
    END IF;
  END LOOP;
END $$;
-- Unknown privacy is never shared. Existing read-only scopes excluded Only You.
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='strava_activity_cache' AND column_name='coach_visible') THEN
    ALTER TABLE strava_activity_cache ADD COLUMN coach_visible boolean NOT NULL DEFAULT false;
    UPDATE strava_activity_cache a SET coach_visible=true FROM strava_connections c
      WHERE c.user_id=a.user_id AND c.scopes='activity:read';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS strava_coach_activity_page ON strava_activity_cache(user_id,(summary->>'date') DESC,activity_id DESC) WHERE coach_visible;
COMMIT;
