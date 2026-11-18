-- Only requests admitted under the renewed notice may enter long-term storage.
-- Legacy rows keep their existing expiry and remain ineligible until replaced.
ALTER TABLE knowledge_query_cache ADD COLUMN IF NOT EXISTS request_text text;
ALTER TABLE knowledge_query_cache ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE knowledge_query_cache ALTER COLUMN expires_at SET DEFAULT now() + interval '1 year';
ALTER TABLE knowledge_response_cache ADD COLUMN IF NOT EXISTS request_text text;
ALTER TABLE knowledge_response_cache ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE knowledge_response_cache ALTER COLUMN expires_at SET DEFAULT now() + interval '1 year';
