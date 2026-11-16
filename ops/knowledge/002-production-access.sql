-- Run as the database administrator after creating the app/indexer login roles.
-- Passwords are configured separately through the private deployment environment.
REVOKE ALL ON DATABASE homepage_knowledge FROM PUBLIC;
GRANT CONNECT ON DATABASE homepage_knowledge TO homepage_app, homepage_indexer;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO homepage_app, homepage_indexer;
GRANT SELECT ON knowledge_documents, knowledge_chunks, knowledge_sync TO homepage_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_usage TO homepage_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO homepage_indexer;
ALTER ROLE homepage_app CONNECTION LIMIT 30;
ALTER ROLE homepage_indexer CONNECTION LIMIT 6;
ALTER ROLE homepage_app SET statement_timeout = '10s';
