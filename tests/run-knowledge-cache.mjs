import { createRequire } from "node:module";

// Deliberately local-only: never migrate, truncate or enable AI in the source database.
const sourceUrl = new URL(
  process.env.KNOWLEDGE_DATABASE_URL || "http://unconfigured",
);
if (!["localhost", "127.0.0.1"].includes(sourceUrl.hostname))
  throw new Error(
    "Cache checks require an existing localhost development database",
  );
const provider = process.argv.includes("--provider");
const require = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const module = require("postgres");
const postgres = module.default ?? module;
const source = postgres(sourceUrl.toString(), { onnotice: () => {} });
const name = provider
  ? "homepage_cache_provider_test"
  : "homepage_semantic_cache_test";
try {
  if (provider) {
    const [fixture] = await source`
      SELECT d.project_id,d.title,d.href,d.hash,d.embedding_model,c.content,c.embedding::text AS embedding
      FROM knowledge_documents d JOIN knowledge_chunks c ON c.document_id=d.id
      WHERE d.locale='en' AND c.content ILIKE '%react%'
      ORDER BY CASE WHEN d.title ILIKE '%konfig%' THEN 0 ELSE 1 END,d.id,c.id LIMIT 1
    `;
    if (!fixture)
      throw new Error("Provider check needs an indexed public React passage");
    globalThis.cachePublicFixture = fixture;
  }
  if (!(await source`SELECT 1 FROM pg_database WHERE datname=${name}`).length)
    await source.unsafe(`CREATE DATABASE ${name}`);
} finally {
  await source.end();
}
sourceUrl.pathname = `/${name}`;
process.env.KNOWLEDGE_DATABASE_URL = sourceUrl.toString();
await import(
  provider
    ? "./knowledge-cache-provider.integration.mjs"
    : "./knowledge-cache.integration.mjs"
);
