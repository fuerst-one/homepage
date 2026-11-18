-- Visitor-derived data is kept separately from permanent public-content embeddings.
CREATE TABLE IF NOT EXISTS knowledge_query_cache (
  key text PRIMARY KEY,
  embedding vector(1536) NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
CREATE INDEX IF NOT EXISTS knowledge_query_cache_expiry ON knowledge_query_cache(expires_at);
CREATE TABLE IF NOT EXISTS knowledge_response_cache (
  scope text NOT NULL,
  key text NOT NULL,
  guard text NOT NULL,
  embedding vector(1536) NOT NULL,
  response jsonb NOT NULL,
  evidence jsonb NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  PRIMARY KEY(scope,key)
);
CREATE INDEX IF NOT EXISTS knowledge_response_cache_expiry ON knowledge_response_cache(expires_at);
CREATE INDEX IF NOT EXISTS knowledge_response_cache_guard ON knowledge_response_cache(scope,guard);
-- Local development may have only the owner role. Production roles are optional here.
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='homepage_app') THEN
    GRANT SELECT,INSERT,UPDATE,DELETE ON knowledge_query_cache,knowledge_response_cache TO homepage_app;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='homepage_indexer') THEN
    GRANT SELECT,INSERT,UPDATE,DELETE ON knowledge_query_cache,knowledge_response_cache TO homepage_indexer;
  END IF;
END $$;
