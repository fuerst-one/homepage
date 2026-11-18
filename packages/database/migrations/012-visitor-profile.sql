CREATE TABLE IF NOT EXISTS visitor_profile_events (
  event_id uuid PRIMARY KEY,
  session_hash text NOT NULL CHECK (length(session_hash)=64),
  rule_version integer NOT NULL CHECK (rule_version=1),
  consent_at timestamptz NOT NULL,
  kind text NOT NULL CHECK (kind IN ('project_opened','project_read','filter_selected','service_viewed','enquiry_started','enquiry_submitted','recommendation_shown','recommendation_opened','preference_changed')),
  subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 250),
  preference text CHECK (preference IN ('exclude','interested','priority','auto')),
  previous text CHECK (previous IN ('exclude','interested','priority','auto')),
  inferred_score double precision CHECK (inferred_score BETWEEN 0 AND 12),
  basis jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS visitor_profile_events_session ON visitor_profile_events(session_hash);
CREATE INDEX IF NOT EXISTS visitor_profile_events_received ON visitor_profile_events(received_at);
-- A deletion tombstone prevents an in-flight POST from recreating erased data.
CREATE TABLE IF NOT EXISTS visitor_profile_revocations (
  session_hash text PRIMARY KEY,
  revoked_at timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='homepage_app') THEN
    GRANT SELECT,INSERT,DELETE ON visitor_profile_events,visitor_profile_revocations TO homepage_app;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='homepage_indexer') THEN
    GRANT SELECT,DELETE ON visitor_profile_events,visitor_profile_revocations TO homepage_indexer;
  END IF;
END $$;

ALTER TABLE visitor_profile_events ADD COLUMN IF NOT EXISTS basis jsonb NOT NULL DEFAULT '{}'::jsonb;
