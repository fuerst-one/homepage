-- The existing singleton snapshot also owns the worker's durable schedule and lease.
ALTER TABLE site_malt_mirror
  ADD COLUMN IF NOT EXISTS next_refresh_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  ADD COLUMN IF NOT EXISTS refresh_token uuid,
  ADD COLUMN IF NOT EXISTS refresh_until timestamptz NOT NULL DEFAULT '-infinity';
