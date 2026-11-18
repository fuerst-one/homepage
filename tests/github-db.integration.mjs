import assert from "node:assert/strict";
import { test, after } from "node:test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const url = new URL(
  process.env.KNOWLEDGE_DATABASE_URL || "http://unconfigured",
);
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  !url.pathname.endsWith("_test")
)
  throw new Error("Use a dedicated localhost database ending in _test");
const { knowledgeDatabase } =
  await import("../packages/database/src/database.ts");
const { githubStore, GITHUB_KEY } =
  await import("../apps/sync/src/github/githubStore.ts");
const { readPublicGitHubActivity } =
  await import("../packages/database/src/githubActivity.ts");
const sql = knowledgeDatabase();
after(() => sql.end({ timeout: 3 }));
const snapshot = {
  login: "owner",
  repositories: [
    {
      id: 1,
      private: true,
      full_name: "owner/private-secret",
      head: "1".repeat(40),
      commits: [{ sha: "1".repeat(40), date: "2026-01-01T12:00:00Z" }],
    },
  ],
};

test("GitHub migration is rerunnable and publication exposes only aggregate fields", async () => {
  const migration = await readFile(
    new URL(
      "../packages/database/migrations/011-github-activity.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await sql.unsafe(migration);
  await sql.unsafe(migration);
  const store = githubStore(sql),
    key = randomUUID(),
    lease = await store.claim(key, 0);
  assert.ok(lease);
  assert.equal(await store.publish(key, lease, snapshot), true);
  const published = await readPublicGitHubActivity(sql);
  assert.equal(published.totalCommits, 1);
  assert.equal(published.includesPrivate, true);
  assert.doesNotMatch(
    JSON.stringify(published),
    /private-secret|1111111111111111111111111111111111111111/,
  );
  const [role] = await sql`SELECT 1 FROM pg_roles WHERE rolname='homepage_app'`;
  if (role) {
    const [access] =
      await sql`SELECT has_table_privilege('homepage_app','github_worker_snapshots','SELECT') AS raw,has_table_privilege('homepage_app','public_github_activity','SELECT') AS aggregate`;
    assert.equal(access.raw, false);
    assert.equal(access.aggregate, true);
  }
});
test("concurrent syncs have one lease, and an expired worker cannot overwrite the newer aggregate", async () => {
  const store = githubStore(sql),
    key = randomUUID();
  const leases = await Promise.all([store.claim(key, 0), store.claim(key, 0)]);
  assert.equal(leases.filter(Boolean).length, 1);
  const old = leases.find(Boolean);
  await sql`UPDATE github_worker_snapshots SET lease_until=clock_timestamp()-interval '1 second' WHERE key=${key}`;
  const next = await store.claim(key, 0);
  assert.ok(next);
  assert.equal(
    await store.publish(key, old, { ...snapshot, repositories: [] }),
    false,
  );
  assert.equal(await store.publish(key, next, snapshot), true);
  assert.equal((await readPublicGitHubActivity(sql)).totalCommits, 1);
});
test("failed sync preserves raw history and the last successful public refresh date", async () => {
  const store = githubStore(sql),
    key = randomUUID();
  await store.publish(key, await store.claim(key, 0), snapshot);
  const before = await readPublicGitHubActivity(sql);
  const lease = await store.claim(key, 0);
  assert.ok(lease);
  await store.fail(key, lease);
  assert.deepEqual(await readPublicGitHubActivity(sql), before);
  assert.equal(await store.claim(key, 0), null);
  assert.equal(
    (await store.read(key)).value.repositories[0].full_name,
    "owner/private-secret",
  );
  assert.equal(GITHUB_KEY, "github-activity-v1");
});
