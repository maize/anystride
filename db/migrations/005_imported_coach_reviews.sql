-- Apply explicitly to the marketplace database before deploying the review UI.
BEGIN;
CREATE TABLE IF NOT EXISTS imported_coach_reviews (
  entry_key text PRIMARY KEY CHECK (entry_key ~ '^vdot:[a-z0-9]+(-[a-z0-9]+)*$'),
  status text NOT NULL CHECK (status IN ('draft','published','hidden')),
  profile jsonb,
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 1000),
  version integer NOT NULL CHECK (version > 0),
  source_revision text NOT NULL,
  last_request_hash text NOT NULL,
  reviewed_by text NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'published' OR jsonb_typeof(profile) = 'object' AND profile IS NOT NULL)
);
ALTER TABLE imported_coach_reviews ENABLE ROW LEVEL SECURITY;
COMMIT;
