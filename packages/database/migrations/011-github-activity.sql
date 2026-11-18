-- Raw repository identifiers/history are worker-only, even during legacy rollback.
CREATE TABLE IF NOT EXISTS github_worker_snapshots (
  key text PRIMARY KEY,
  payload jsonb,
  refreshed_at timestamptz,
  lease_token uuid,
  lease_until timestamptz NOT NULL DEFAULT '-infinity',
  retry_at timestamptz NOT NULL DEFAULT '-infinity'
);
CREATE TABLE IF NOT EXISTS public_github_activity (
  key text PRIMARY KEY CHECK (key='github-activity-v1'),
  payload jsonb NOT NULL CHECK (payload->>'version'='1' AND payload->>'scope'='authored-default-branches'),
  refreshed_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON github_worker_snapshots FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='homepage_app') THEN
    REVOKE ALL ON github_worker_snapshots FROM homepage_app;
    GRANT SELECT ON public_github_activity TO homepage_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='homepage_indexer') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON github_worker_snapshots, public_github_activity TO homepage_indexer;
  END IF;
END $$;
