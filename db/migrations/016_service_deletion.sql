-- Apply explicitly to the selected marketplace database before deploying service deletion.
-- Keep referenced rows so enquiries, purchases and payment reconciliation retain their history.
BEGIN;
ALTER TABLE marketplace_services ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS marketplace_services_active_coach
  ON marketplace_services(coach_id,created_at DESC) WHERE deleted_at IS NULL;
COMMIT;
