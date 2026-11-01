-- Apply after 002 and 008 in the selected marketplace database.
BEGIN;
CREATE TABLE IF NOT EXISTS training_relationships (
  id uuid PRIMARY KEY,
  coach_id text NOT NULL REFERENCES marketplace_coaches(user_id),
  athlete_email text NOT NULL CHECK(length(athlete_email) <= 254 AND athlete_email=lower(athlete_email)),
  athlete_name text NOT NULL CHECK(length(athlete_name) BETWEEN 1 AND 80),
  athlete_id text,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','declined','revoked')),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '14 days',
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coach_id,athlete_email),
  CHECK(athlete_id IS NULL OR athlete_id<>coach_id),
  CHECK(status<>'active' OR athlete_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS training_roster ON training_relationships(coach_id,status,updated_at DESC,id);
CREATE INDEX IF NOT EXISTS training_invites ON training_relationships(athlete_email,status);
CREATE INDEX IF NOT EXISTS training_grants ON training_relationships(athlete_id,status);
ALTER TABLE training_entries ADD COLUMN IF NOT EXISTS assigned_by text;
ALTER TABLE training_entries ADD COLUMN IF NOT EXISTS source_id text;
-- Only summary fields from user-selected export rows are stored, not raw files/GPS.
CREATE UNIQUE INDEX IF NOT EXISTS training_import_dedup ON training_entries(user_id,source_id) WHERE source_id IS NOT NULL;
ALTER TABLE training_relationships ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON training_relationships FROM PUBLIC;
DO $$
DECLARE browser_role text;
BEGIN
  FOREACH browser_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=browser_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON public.training_relationships FROM %I',browser_role);
    END IF;
  END LOOP;
END $$;
COMMIT;
