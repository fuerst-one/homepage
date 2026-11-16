import assert from "node:assert/strict";
import { test, after } from "node:test";
import { readFile } from "node:fs/promises";
import { knowledgeDatabase } from "../packages/database/src/database.ts";
import { postgresMaltMirrorStore } from "../packages/database/src/postgresMaltMirrorStore.ts";
import { MALT_PROFILE_URL } from "../packages/content/src/maltMirror.ts";
const url = new URL(
  process.env.KNOWLEDGE_DATABASE_URL || "http://unconfigured",
);
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  !url.pathname.endsWith("_test")
)
  throw new Error("Use a dedicated localhost _test database");
const sql = knowledgeDatabase();
after(() => sql.end());
await sql.unsafe(
  await readFile(
    new URL(
      "../packages/database/migrations/003-notion-resilience.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
await sql.unsafe(
  await readFile(
    new URL(
      "../packages/database/migrations/007-malt-refresh.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
const mirror = () => ({
  version: 1,
  profileUrl: MALT_PROFILE_URL,
  observation: {
    observedAt: new Date().toISOString(),
    method: "browser-verified",
    rate: { amount: 750, currency: "EUR", unit: "day" },
    availability: { status: "unknown", confirmedAt: null },
  },
  lastAttempt: null,
});
const reset = async () => {
  await sql`TRUNCATE site_malt_mirror`;
  await sql`INSERT INTO site_malt_mirror(id,payload) VALUES (1,${sql.json(mirror())})`;
};

test("two workers cannot claim the same due Malt refresh", async () => {
  const a = postgresMaltMirrorStore(sql),
    b = postgresMaltMirrorStore(sql);
  assert.equal(
    typeof a.claimRefresh,
    "function",
    "refresh claims must coordinate through PostgreSQL",
  );
  await reset();
  const claims = await Promise.all([a.claimRefresh(), b.claimRefresh()]);
  assert.equal(claims.filter(Boolean).length, 1);
});

test("an expired Malt lease cannot overwrite a newer observation or its next schedule", async () => {
  await reset();
  const store = postgresMaltMirrorStore(sql);
  const old = await store.claimRefresh();
  assert(old);
  await sql`UPDATE site_malt_mirror SET refresh_until=now()-interval '1 second' WHERE id=1`;
  const current = await store.claimRefresh();
  assert(current);
  assert.notEqual(current, old);
  const next = new Date(Date.now() + 86400000).toISOString();
  const latest = mirror();
  latest.observation.rate.amount = 800;
  assert.equal(await store.completeRefresh(current, latest, next), undefined);
  assert.equal(
    await store.completeRefresh(old, mirror(), new Date().toISOString()),
    "lease_lost",
  );
  assert.equal((await store.read()).observation.rate.amount, 800);
  assert.equal(
    await store.claimRefresh(),
    null,
    "the next attempt survives process restarts",
  );
});

test("blocked scheduled Malt refreshes preserve the last good data and run independently once a day", async () => {
  const { refreshMaltIfDue } =
    await import("../apps/sync/src/malt/scheduledRefresh.ts");
  await reset();
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return { status: 403, html: "challenge" };
  };
  await Promise.all([
    refreshMaltIfDue(sql, fetcher),
    refreshMaltIfDue(sql, fetcher),
  ]);
  assert.equal(calls, 1);
  const state = await postgresMaltMirrorStore(sql).read();
  assert.equal(state.observation.rate.amount, 750);
  assert.equal(state.lastAttempt.status, "blocked");
  await refreshMaltIfDue(sql, fetcher);
  assert.equal(calls, 1);
  const [row] =
    await sql`SELECT next_refresh_at,refresh_token FROM site_malt_mirror WHERE id=1`;
  assert.equal(row.refresh_token, null);
  assert(new Date(row.next_refresh_at) > new Date());
  assert.equal(
    new Date(row.next_refresh_at).toISOString().slice(11, 19),
    "05:23:00",
  );
});

test("failed Malt publication releases its lease with a bounded database retry", async () => {
  await reset();
  const store = postgresMaltMirrorStore(sql);
  const token = await store.claimRefresh();
  await store.failRefresh(token);
  assert.equal(await store.claimRefresh(), null);
  const [row] =
    await sql`SELECT extract(epoch FROM (next_refresh_at-now())) AS delay,refresh_token FROM site_malt_mirror WHERE id=1`;
  assert(row.delay > 290 && row.delay <= 300);
  assert.equal(row.refresh_token, null);
});

test(
  "an empty legacy seed cannot erase an observation published while Notion is pending",
  { timeout: 5000 },
  async () => {
    const { seedMaltMirror } =
      await import("../apps/sync/src/notion/notionWorker.ts");
    await reset();
    await sql`UPDATE site_malt_mirror SET payload=jsonb_set(payload,'{observation}','null') WHERE id=1`;
    await sql`DELETE FROM notion_request_gate`;
    const originalFetch = global.fetch;
    const oldToken = process.env.NEXT_NOTION_TOKEN;
    const oldOwner = process.env.NEXT_NOTION_OWNER_CONTACT_ID;
    process.env.NEXT_NOTION_TOKEN = "test-malt-seed";
    process.env.NEXT_NOTION_OWNER_CONTACT_ID =
      "11111111-1111-4111-8111-111111111111";
    let started, release;
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    const fetching = new Promise((resolve) => {
      started = resolve;
    });
    global.fetch = async () => {
      started();
      await pending;
      return Response.json({
        object: "page",
        id: process.env.NEXT_NOTION_OWNER_CONTACT_ID,
        properties: {
          "Homepage Malt Mirror": {
            type: "rich_text",
            rich_text: [
              {
                plain_text: JSON.stringify({ ...mirror(), observation: null }),
              },
            ],
          },
        },
      });
    };
    try {
      const seed = seedMaltMirror();
      await fetching;
      await postgresMaltMirrorStore(sql).write(mirror());
      release();
      await seed;
      assert.equal(
        (await postgresMaltMirrorStore(sql).read()).observation?.rate.amount,
        750,
      );
    } finally {
      release();
      global.fetch = originalFetch;
      if (oldToken === undefined) delete process.env.NEXT_NOTION_TOKEN;
      else process.env.NEXT_NOTION_TOKEN = oldToken;
      if (oldOwner === undefined)
        delete process.env.NEXT_NOTION_OWNER_CONTACT_ID;
      else process.env.NEXT_NOTION_OWNER_CONTACT_ID = oldOwner;
    }
  },
);
