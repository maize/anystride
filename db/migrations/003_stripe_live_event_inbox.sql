-- Apply explicitly to the selected Anystride production database, NOT the test DB.
-- Minimal event references only. No fulfilment, raw payloads or customer details.
BEGIN;
CREATE TABLE IF NOT EXISTS stripe_live_event_inbox (
  platform_account_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  object_type TEXT NOT NULL,
  stripe_created_at TIMESTAMPTZ NOT NULL,
  api_version TEXT,
  livemode BOOLEAN NOT NULL DEFAULT true CHECK (livemode = true),
  status TEXT NOT NULL DEFAULT 'received' CHECK (status = 'received'),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (platform_account_id, event_id)
);
ALTER TABLE stripe_live_event_inbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON stripe_live_event_inbox FROM PUBLIC;
-- No browser-role policies: use a trusted server database role only.
CREATE INDEX IF NOT EXISTS stripe_live_event_inbox_received_idx
  ON stripe_live_event_inbox (received_at);
COMMIT;
