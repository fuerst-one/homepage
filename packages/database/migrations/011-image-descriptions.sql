-- Apply before worker/web code. Paid public-image checkpoints are separate from visitor caches.
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS provenance jsonb NOT NULL DEFAULT '{"kind":"project"}'::jsonb;
CREATE TABLE IF NOT EXISTS knowledge_image_descriptions (
  key text PRIMARY KEY,
  content_hash text NOT NULL,
  model text NOT NULL,
  version text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','complete','failed')),
  description text,
  alt_text text,
  cost_usd numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'complete' OR length(description) BETWEEN 1 AND 4000)
);
-- Idempotent upgrade for existing local image-description previews.
ALTER TABLE knowledge_image_descriptions ADD COLUMN IF NOT EXISTS alt_text text;
CREATE OR REPLACE VIEW public_image_descriptions AS
 SELECT DISTINCT d.project_id,d.locale,d.provenance->>'href' AS href,c.description,c.alt_text
 FROM knowledge_documents d
 JOIN knowledge_image_descriptions c ON c.key=d.provenance->>'descriptionKey' AND c.status='complete'
 JOIN public_content p ON p.key='website-v3' AND p.payload->'assets'->>(d.provenance->>'assetKey')=d.provenance->>'assetId'
 WHERE d.provenance->>'kind'='image'
 AND EXISTS(SELECT 1 FROM jsonb_array_elements(p.payload->'locales'->d.locale->'projects') project WHERE project->>'id'=d.project_id AND project->'availableLocales' ? d.locale);
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='homepage_app') THEN
    GRANT SELECT ON public_image_descriptions TO homepage_app;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='homepage_indexer') THEN
    GRANT SELECT,INSERT,UPDATE,DELETE ON knowledge_image_descriptions TO homepage_indexer;
  END IF;
END $$;
