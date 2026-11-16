-- Apply as administrator after 005, before deploying the split worker/web.
GRANT SELECT ON public_content, public_content_assets TO homepage_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public_content TO homepage_indexer;
GRANT SELECT ON public_content_assets TO homepage_indexer;
-- Preserve legacy SELECT grants until the website cutover and rollback window end.
