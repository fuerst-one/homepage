-- Administrator-owned controls. Application roles have read access only.
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY CHECK (length(key) BETWEEN 1 AND 100),
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION settings_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE OR REPLACE TRIGGER settings_updated_at BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION settings_touch_updated_at();
INSERT INTO settings(key,value) VALUES
  ('ai.enabled','false'), ('ai.rollout_percent','25'), ('ai.lottery_hours','24'),
  ('ai.daily_budget_usd','1'), ('ai.monthly_budget_usd','10'),
  ('ai.visitor_per_minute','3'), ('ai.visitor_per_day','20'),
  ('ai.global_per_minute','20'), ('ai.global_per_day','200'),
  ('ai.concurrency','3'), ('ai.probe_per_minute','1'), ('ai.probe_per_day','24'),
  ('ai.block_bots','true'), ('ai.block_suspicious','true')
ON CONFLICT(key) DO NOTHING;
ALTER TABLE knowledge_usage ADD COLUMN IF NOT EXISTS consent jsonb;
ALTER TABLE knowledge_usage ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'chat'
  CHECK(kind IN ('chat','indexer','probe'));
UPDATE knowledge_usage SET kind=CASE WHEN visitor='indexer' THEN 'indexer' ELSE 'probe' END
WHERE kind='chat' AND visitor IN ('indexer','availability-probe');
CREATE TABLE IF NOT EXISTS knowledge_admission_counts (
  hour timestamptz NOT NULL,
  reason text NOT NULL CHECK(reason IN ('selected','excluded','paused','bot','suspicious','quota')),
  count bigint NOT NULL CHECK(count>=0),
  PRIMARY KEY(hour,reason)
);
REVOKE ALL ON settings,knowledge_admission_counts FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='homepage_app') THEN
    REVOKE ALL ON settings FROM homepage_app;
    GRANT SELECT ON settings TO homepage_app;
    GRANT SELECT,INSERT,UPDATE ON knowledge_admission_counts TO homepage_app;
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='homepage_indexer') THEN
    REVOKE ALL ON settings FROM homepage_indexer;
    GRANT SELECT ON settings TO homepage_indexer;
    GRANT SELECT,INSERT,UPDATE,DELETE ON knowledge_admission_counts TO homepage_indexer;
  END IF;
END $$;
