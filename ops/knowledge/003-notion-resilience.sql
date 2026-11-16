-- Additive migration. Run as the database owner before deploying web/worker code.
CREATE TABLE IF NOT EXISTS notion_request_gate (
  key text PRIMARY KEY,
  next_at timestamptz NOT NULL DEFAULT now(),
  cooldown_until timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notion_snapshots (
  key text PRIMARY KEY,
  payload jsonb,
  refreshed_at timestamptz,
  lease_token uuid,
  lease_until timestamptz NOT NULL DEFAULT now(),
  retry_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notion_enquiry_outbox (
  id uuid PRIMARY KEY,
  fingerprint text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid,
  lease_until timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS notion_outbox_pending ON notion_enquiry_outbox(available_at)
  WHERE delivered_at IS NULL;
CREATE TABLE IF NOT EXISTS notion_assets (
  key text PRIMARY KEY,
  content bytea NOT NULL,
  content_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS site_malt_mirror (
  id integer PRIMARY KEY CHECK (id=1),
  payload jsonb NOT NULL
);
