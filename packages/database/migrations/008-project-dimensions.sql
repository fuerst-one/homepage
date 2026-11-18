-- A separate publication lets the independently deployed web and worker cut over safely.
-- Keep the previous publication intact until its readers have finished deploying.
ALTER TABLE public_content DROP CONSTRAINT IF EXISTS public_content_payload_check;
ALTER TABLE public_content ADD CONSTRAINT public_content_payload_check
  CHECK ((key='website-v2' AND payload->>'version'='2')
      OR (key='website-v3' AND payload->>'version'='3'));

CREATE OR REPLACE VIEW public_content_assets AS
  SELECT a.key, a.content, a.content_type FROM notion_assets a
  WHERE EXISTS (
    SELECT 1 FROM public_content p, LATERAL jsonb_each_text(p.payload->'assets') m
    WHERE m.value=a.key
  );
