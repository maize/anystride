-- Explicit marketplace migration. Contact emails and ownership links are server-only.
BEGIN;
CREATE TABLE IF NOT EXISTS coach_profile_contacts (
  directory_slug text PRIMARY KEY CHECK(directory_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  email text NOT NULL CHECK(email=lower(btrim(email)) AND length(email) BETWEEN 3 AND 254),
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coach_profile_contacts_email ON coach_profile_contacts(email);
CREATE TABLE IF NOT EXISTS coach_profile_merges (
  directory_slug text PRIMARY KEY CHECK(directory_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  coach_id text NOT NULL REFERENCES marketplace_coaches(user_id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coach_profile_merges_coach ON coach_profile_merges(coach_id);
ALTER TABLE coach_profile_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_profile_merges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON coach_profile_contacts,coach_profile_merges FROM PUBLIC;
DO $$ DECLARE browser_role text; BEGIN
  FOREACH browser_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser_role) THEN
      EXECUTE format('REVOKE ALL ON coach_profile_contacts,coach_profile_merges FROM %I',browser_role);
    END IF;
  END LOOP;
END $$;
COMMIT;
