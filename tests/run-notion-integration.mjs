import { spawnSync } from "node:child_process";

const url = new URL(
  process.env.NOTION_TEST_DATABASE_URL ||
    process.env.KNOWLEDGE_DATABASE_URL ||
    "http://unconfigured",
);
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Notion integration tests require a local database");
if (!process.env.NOTION_TEST_DATABASE_URL)
  url.pathname = "/homepage_notion_test";
if (!url.pathname.endsWith("_test"))
  throw new Error("Use a dedicated database ending in _test");
const result = spawnSync(
  process.execPath,
  [
    "--import",
    "tsx",
    "--test",
    "--test-concurrency=1",
    "tests/notion-db.integration.mjs",
    "tests/notion-worker.integration.mjs",
    "tests/malt-worker.integration.mjs",
  ],
  {
    stdio: "inherit",
    env: { ...process.env, KNOWLEDGE_DATABASE_URL: url.href },
  },
);
process.exit(result.status ?? 1);
