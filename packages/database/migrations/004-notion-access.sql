-- Run as the administrator after 003; grants do not alter existing knowledge access.
GRANT SELECT ON notion_snapshots, notion_assets TO homepage_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON notion_enquiry_outbox, site_malt_mirror TO homepage_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON notion_request_gate, notion_snapshots, notion_enquiry_outbox, notion_assets, site_malt_mirror
  TO homepage_indexer;
