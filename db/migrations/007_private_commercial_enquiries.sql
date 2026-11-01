-- Apply to Anystride's enquiries database (POSTGRES_URL / DATABASE_URL).
-- Keep the existing server owner/service role; do not expose browser policies.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

ALTER TABLE public.commercial_enquiries ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.commercial_enquiries
  FROM anon, authenticated, PUBLIC;

COMMIT;
