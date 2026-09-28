-- Apply AFTER 001 to the ISOLATED Stripe test database, never production enquiries.
BEGIN;
CREATE TABLE IF NOT EXISTS stripe_test_workspaces (
  request_id UUID PRIMARY KEY,
  runner_id TEXT NOT NULL,
  coach_id TEXT NOT NULL CHECK (coach_id <> runner_id),
  payment_hash TEXT NOT NULL,
  service_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- The binding is committed BEFORE Stripe checkout creation, so it deliberately
-- has no booking FK. An orphaned binding cannot grant access and is safe to retry.
CREATE TABLE IF NOT EXISTS stripe_test_workspace_messages (
  id UUID PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES stripe_test_workspaces(request_id),
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stripe_test_workspace_message_order ON stripe_test_workspace_messages(request_id, created_at, id);
ALTER TABLE stripe_test_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_test_workspace_messages ENABLE ROW LEVEL SECURITY;
COMMIT;
