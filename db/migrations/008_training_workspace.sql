-- Apply to MARKETPLACE_DATABASE_SOURCE, never the payments database.
BEGIN;
CREATE TABLE IF NOT EXISTS training_entries (
  user_id text NOT NULL,
  id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('workout','template')),
  scheduled_date date,
  details jsonb NOT NULL CHECK (jsonb_typeof(details)='object' AND octet_length(details::text) <= 8192),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,id),
  CHECK ((kind='workout' AND scheduled_date BETWEEN DATE '2000-01-01' AND DATE '2100-12-31') OR (kind='template' AND scheduled_date IS NULL)),
  CHECK (kind <> 'workout' OR scheduled_date IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS training_calendar ON training_entries(user_id,kind,scheduled_date,id);
-- One aggregate row per user: no unbounded request-event log.
CREATE TABLE IF NOT EXISTS training_usage (
  user_id text PRIMARY KEY,
  month date NOT NULL,
  reads integer NOT NULL DEFAULT 0 CHECK (reads >= 0),
  writes integer NOT NULL DEFAULT 0 CHECK (writes >= 0),
  minute timestamptz NOT NULL,
  requests integer NOT NULL DEFAULT 0 CHECK (requests >= 0)
);
ALTER TABLE training_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON training_entries,training_usage FROM PUBLIC;
DO $$
DECLARE browser_role text;
BEGIN
  FOREACH browser_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=browser_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON public.training_entries, public.training_usage FROM %I',browser_role);
    END IF;
  END LOOP;
END $$;
COMMIT;
