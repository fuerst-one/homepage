CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS knowledge_embedding_cache (
  key text PRIMARY KEY,
  embedding vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id text PRIMARY KEY,
  project_id text NOT NULL,
  title text NOT NULL,
  locale text NOT NULL CHECK (locale IN ('en', 'de')),
  href text NOT NULL CHECK (href ~ '^/(en|de)/projects/'),
  hash text NOT NULL,
  embedding_model text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id text PRIMARY KEY,
  document_id text NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding vector(1536) NOT NULL,
  search tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED
);
CREATE INDEX IF NOT EXISTS knowledge_chunks_search ON knowledge_chunks USING gin(search);
CREATE TABLE IF NOT EXISTS knowledge_sync (
  id integer PRIMARY KEY CHECK (id = 1),
  synced_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS knowledge_usage (
  id uuid PRIMARY KEY,
  visitor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  amount_micro_usd bigint NOT NULL CHECK (amount_micro_usd >= 0),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','complete','failed'))
);
CREATE INDEX IF NOT EXISTS knowledge_usage_time ON knowledge_usage(created_at);
ALTER TABLE knowledge_usage ADD COLUMN IF NOT EXISTS consent jsonb;
