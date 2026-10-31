-- Private Strava beta. Never join these tables into coach calendars or exports.
BEGIN;
CREATE TABLE IF NOT EXISTS strava_connections (
  user_id text PRIMARY KEY,
  athlete_id bigint NOT NULL UNIQUE,
  generation uuid NOT NULL UNIQUE,
  tokens text NOT NULL,
  scopes text NOT NULL,
  status text NOT NULL DEFAULT 'connected' CHECK(status IN ('connected','reconnect')),
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_sync timestamptz,
  next_refresh timestamptz NOT NULL DEFAULT now(),
  message text
);
CREATE TABLE IF NOT EXISTS strava_oauth_states (
  user_id text PRIMARY KEY,
  state_hash text NOT NULL,
  private_activities boolean NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS strava_activity_cache (
  user_id text NOT NULL REFERENCES strava_connections(user_id) ON DELETE CASCADE,
  activity_id bigint NOT NULL,
  summary jsonb NOT NULL CHECK(octet_length(summary::text)<=2048),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY(user_id,activity_id)
);
CREATE INDEX IF NOT EXISTS strava_cache_expiry ON strava_activity_cache(expires_at);
CREATE TABLE IF NOT EXISTS strava_deleted_activities (
  user_id text NOT NULL REFERENCES strava_connections(user_id) ON DELETE CASCADE,
  activity_id bigint NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY(user_id,activity_id)
);
ALTER TABLE strava_deleted_activities ADD COLUMN IF NOT EXISTS event_time bigint NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS strava_sync_jobs (
  user_id text PRIMARY KEY REFERENCES strava_connections(user_id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '6 days'
);
CREATE TABLE IF NOT EXISTS strava_revocations (
  user_id text PRIMARY KEY,
  tokens text NOT NULL,
  generation uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now()+interval '6 days'
);
CREATE TABLE IF NOT EXISTS strava_runtime (
  id integer PRIMARY KEY CHECK(id=1),
  lease uuid,
  leased_until timestamptz NOT NULL DEFAULT now(),
  window_start timestamptz NOT NULL DEFAULT now(),
  day_start date NOT NULL DEFAULT CURRENT_DATE,
  window_calls integer NOT NULL DEFAULT 0,
  day_calls integer NOT NULL DEFAULT 0,
  blocked_until timestamptz NOT NULL DEFAULT now(),
  last_cleanup timestamptz
);
INSERT INTO strava_runtime(id) VALUES(1) ON CONFLICT DO NOTHING;
ALTER TABLE strava_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_activity_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_deleted_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_revocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_runtime ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON strava_connections,strava_oauth_states,strava_activity_cache,strava_deleted_activities,strava_sync_jobs,strava_revocations,strava_runtime FROM PUBLIC;
DO $$ DECLARE role_name text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
      EXECUTE format('REVOKE ALL ON strava_connections,strava_oauth_states,strava_activity_cache,strava_deleted_activities,strava_sync_jobs,strava_revocations,strava_runtime FROM %I',role_name);
    END IF;
  END LOOP;
END $$;
COMMIT;
