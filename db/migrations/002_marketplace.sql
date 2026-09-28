-- Apply explicitly to the selected marketplace database. No automatic production DDL.
BEGIN;
CREATE TABLE IF NOT EXISTS marketplace_coaches (
  user_id text PRIMARY KEY,
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 100),
  bio text NOT NULL CHECK (length(bio) BETWEEN 40 AND 2000),
  credentials text NOT NULL CHECK (length(credentials) BETWEEN 10 AND 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketplace_services (
  id uuid PRIMARY KEY,
  coach_id text NOT NULL REFERENCES marketplace_coaches(user_id),
  title text NOT NULL CHECK (length(title) BETWEEN 5 AND 120),
  description text NOT NULL CHECK (length(description) BETWEEN 40 AND 2000),
  amount integer NOT NULL CHECK (amount BETWEEN 100 AND 100000),
  currency text NOT NULL CHECK (currency IN ('usd','eur','gbp')),
  duration_weeks integer NOT NULL CHECK (duration_weeks BETWEEN 1 AND 52),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marketplace_services_coach ON marketplace_services(coach_id);
CREATE TABLE IF NOT EXISTS marketplace_requests (
  id uuid PRIMARY KEY,
  runner_id text NOT NULL,
  service_id uuid NOT NULL REFERENCES marketplace_services(id),
  coach_id text NOT NULL REFERENCES marketplace_coaches(user_id),
  message text NOT NULL CHECK (length(message) BETWEEN 20 AND 1500),
  service_snapshot jsonb NOT NULL,
  sharing_version text NOT NULL DEFAULT '2026-09-12-coach-request-v1',
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','accepted','declined','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (runner_id <> coach_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_one_open_request
  ON marketplace_requests(runner_id,service_id) WHERE status IN ('requested','accepted');
CREATE INDEX IF NOT EXISTS marketplace_requests_coach ON marketplace_requests(coach_id,created_at);
CREATE INDEX IF NOT EXISTS marketplace_requests_runner ON marketplace_requests(runner_id,created_at);
CREATE TABLE IF NOT EXISTS marketplace_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id text NOT NULL,
  action text NOT NULL,
  target_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Defense in depth if this database exposes tables through Supabase's Data API.
-- No browser role receives policies: all access goes through authorized server queries.
ALTER TABLE marketplace_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_audit ENABLE ROW LEVEL SECURITY;
COMMIT;
