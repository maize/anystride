-- Additive: apply after 009 in the selected marketplace database.
BEGIN;
CREATE TABLE IF NOT EXISTS training_plans (
  coach_id text NOT NULL REFERENCES marketplace_coaches(user_id),
  id uuid NOT NULL,
  title text NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
  description text NOT NULL CHECK(length(description)<=1000),
  weeks integer NOT NULL CHECK(weeks BETWEEN 1 AND 24),
  sessions jsonb NOT NULL CHECK(jsonb_typeof(sessions)='array' AND jsonb_array_length(sessions)<=168 AND octet_length(sessions::text)<=327680),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(coach_id,id)
);
CREATE TABLE IF NOT EXISTS training_plan_assignments (
  id uuid PRIMARY KEY,
  coach_id text NOT NULL,
  batch_id uuid NOT NULL,
  athlete_id text NOT NULL,
  relationship_id uuid NOT NULL REFERENCES training_relationships(id),
  plan_id uuid NOT NULL,
  plan_version integer NOT NULL,
  plan_title text NOT NULL,
  start_date date NOT NULL,
  weeks integer NOT NULL,
  workout_count integer NOT NULL CHECK(workout_count BETWEEN 1 AND 168),
  request_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coach_id,batch_id,athlete_id),
  -- Durable deduplication survives template edits and individual workout deletions.
  UNIQUE(coach_id,plan_id,athlete_id,start_date)
);
CREATE INDEX IF NOT EXISTS training_plan_history ON training_plan_assignments(coach_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS training_plan_batch ON training_plan_assignments(coach_id,batch_id);
ALTER TABLE training_entries ADD COLUMN IF NOT EXISTS plan_title text;
ALTER TABLE training_entries ADD COLUMN IF NOT EXISTS plan_assignment_id uuid;
CREATE INDEX IF NOT EXISTS training_assigned_entries ON training_entries(user_id,plan_assignment_id) WHERE plan_assignment_id IS NOT NULL;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plan_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON training_plans,training_plan_assignments FROM PUBLIC;
DO $$
DECLARE browser_role text;
BEGIN
  FOREACH browser_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON public.training_plans,public.training_plan_assignments FROM %I',browser_role);
    END IF;
  END LOOP;
END $$;
COMMIT;
