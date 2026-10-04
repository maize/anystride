-- Apply after 002 to the selected marketplace database, not the payments database.
BEGIN;
CREATE TABLE IF NOT EXISTS marketplace_storefronts (
  coach_id text PRIMARY KEY REFERENCES marketplace_coaches(user_id),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 3 AND 70),
  headline text NOT NULL,
  location text NOT NULL,
  photo_url text NOT NULL DEFAULT '',
  specialties jsonb NOT NULL DEFAULT '[]',
  approach text NOT NULL,
  published boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketplace_storefront_offers (
  service_id uuid PRIMARY KEY REFERENCES marketplace_services(id),
  kind text NOT NULL CHECK (kind IN ('package','consultation')),
  inclusions jsonb NOT NULL,
  delivery text NOT NULL,
  next_steps text NOT NULL,
  cancellation text NOT NULL,
  contact_email text NOT NULL,
  available boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS marketplace_storefront_sellers (
  coach_id text NOT NULL REFERENCES marketplace_coaches(user_id),
  platform text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('test','live')),
  onboarding_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  stripe_account text,
  PRIMARY KEY(coach_id,platform,mode),
  UNIQUE(platform,mode,stripe_account)
);
CREATE TABLE IF NOT EXISTS marketplace_storefront_orders (
  id uuid PRIMARY KEY,
  buyer_id text NOT NULL,
  coach_id text NOT NULL REFERENCES marketplace_coaches(user_id),
  service_id uuid NOT NULL REFERENCES marketplace_services(id),
  service_version integer NOT NULL,
  snapshot jsonb NOT NULL,
  amount integer NOT NULL CHECK(amount >= 100),
  currency text NOT NULL CHECK(currency IN ('usd','eur','gbp')),
  fee integer NOT NULL CHECK(fee >= 0 AND fee < amount),
  refunded integer NOT NULL DEFAULT 0 CHECK(refunded >= 0 AND refunded <= amount),
  platform text NOT NULL,
  mode text NOT NULL CHECK(mode IN ('test','live')),
  stripe_account text NOT NULL,
  checkout_params jsonb NOT NULL,
  stripe_session text UNIQUE,
  stripe_payment_intent text UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','partially_refunded','refunded','disputed','expired','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(buyer_id <> coach_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS storefront_pending_order ON marketplace_storefront_orders(buyer_id,service_id,platform,mode) WHERE status='pending';
CREATE INDEX IF NOT EXISTS storefront_buyer_orders ON marketplace_storefront_orders(buyer_id,created_at DESC);
CREATE INDEX IF NOT EXISTS storefront_coach_orders ON marketplace_storefront_orders(coach_id,created_at DESC);
CREATE TABLE IF NOT EXISTS marketplace_storefront_events (
  platform text NOT NULL,
  event_id text NOT NULL,
  order_id uuid NOT NULL REFERENCES marketplace_storefront_orders(id),
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(platform,event_id)
);
ALTER TABLE marketplace_storefronts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_storefront_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_storefront_sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_storefront_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_storefront_events ENABLE ROW LEVEL SECURITY;
COMMIT;
