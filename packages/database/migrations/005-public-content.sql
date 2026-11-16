-- New public contract alongside the deployed source snapshot; no table renames or data removal.
CREATE TABLE IF NOT EXISTS public_content (
  key text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (payload->>'version' = '2'),
  refreshed_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE VIEW public_content_assets AS
  SELECT a.key, a.content, a.content_type FROM notion_assets a
  WHERE EXISTS (
    SELECT 1 FROM public_content p, LATERAL jsonb_each_text(p.payload->'assets') m
    WHERE p.key='website-v2' AND m.value=a.key
  );
