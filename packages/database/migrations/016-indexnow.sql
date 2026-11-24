-- Worker-only record of which sitemap URLs (and lastmods) were already pushed to IndexNow.
CREATE TABLE IF NOT EXISTS indexnow_submissions (
  url text PRIMARY KEY,
  lastmod text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON indexnow_submissions FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='homepage_app') THEN
    REVOKE ALL ON indexnow_submissions FROM homepage_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='homepage_indexer') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON indexnow_submissions TO homepage_indexer;
  END IF;
END $$;
