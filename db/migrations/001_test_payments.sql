-- Apply manually to an ISOLATED test database. Never run against the enquiries DB.
BEGIN;
CREATE TABLE IF NOT EXISTS stripe_test_bookings (
  id UUID PRIMARY KEY,
  request_hash TEXT NOT NULL,
  offer_id TEXT NOT NULL,
  coach_account TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 100),
  currency TEXT NOT NULL CHECK (currency IN ('usd', 'eur', 'gbp')),
  fee INTEGER NOT NULL CHECK (fee >= 0 AND fee < amount),
  test_email TEXT NOT NULL,
  checkout_params JSONB NOT NULL,
  checkout_session_id TEXT UNIQUE,
  payment_intent_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'failed', 'review', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS stripe_test_events (
  id TEXT PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES stripe_test_bookings(id),
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMIT;
