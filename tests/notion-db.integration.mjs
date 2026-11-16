import assert from "node:assert/strict";
import { test, after } from "node:test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { loadTs } from "./helpers/load-ts.mjs";

const url = new URL(
  process.env.KNOWLEDGE_DATABASE_URL || "http://unconfigured",
);
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  !url.pathname.endsWith("_test")
)
  throw new Error("Use a dedicated localhost database ending in _test");
const { knowledgeDatabase } = loadTs(
  new URL("../packages/database/src/database.ts", import.meta.url),
);
const sql = knowledgeDatabase();
after(() => sql.end());

test("Notion schema is additive and rerunnable", async () => {
  const migration = await readFile(
    new URL(
      "../packages/database/migrations/003-notion-resilience.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await sql.unsafe(migration);
  await sql.unsafe(migration);
  for (const name of ["001-initial.sql", "005-public-content.sql"])
    await sql.unsafe(
      await readFile(
        new URL(`../packages/database/migrations/${name}`, import.meta.url),
        "utf8",
      ),
    );
});

test("database admission coordinates independent clients and never shortens a cooldown", async () => {
  const { postgresNotionGate } = loadTs(
    new URL("../apps/sync/src/notion/notionGate.ts", import.meta.url),
  );
  const key = randomUUID();
  const a = postgresNotionGate(sql, key),
    b = postgresNotionGate(sql, key);
  const attempts = await Promise.all(
    Array.from({ length: 10 }, (_, i) => (i % 2 ? a : b).acquire()),
  );
  assert.equal(attempts.filter((delay) => delay === 0).length, 1);
  await a.defer(60_000);
  await b.defer(1000);
  assert.ok((await b.acquire()) > 59_000);
});

test("DB readers return published content without a loader even during a prolonged Notion outage", async () => {
  const { postgresSnapshotStore, readSnapshot, refreshSnapshot } = loadTs(
    new URL("../apps/sync/src/notion/snapshot.ts", import.meta.url),
  );
  const key = randomUUID();
  const store = postgresSnapshotStore(sql);
  await refreshSnapshot(store, key, async () => [{ id: "public" }], 3600);
  const freshReader = postgresSnapshotStore(sql);
  const value = await readSnapshot(freshReader, key);
  assert.deepEqual(value, [{ id: "public" }]);
  await assert.rejects(
    refreshSnapshot(
      store,
      key,
      async () => {
        throw new Error("429");
      },
      0,
    ),
    /429/,
  );
  assert.deepEqual((await store.read(key)).value, [{ id: "public" }]);
  await sql`UPDATE notion_snapshots SET refreshed_at=now()-interval '25 hours' WHERE key=${key}`;
  assert.deepEqual(await readSnapshot(freshReader, key), [{ id: "public" }]);
  await assert.rejects(readSnapshot(store, randomUUID()), /unavailable/i);
});

test("only one snapshot refresh runs across instances and an expired lease cannot publish", async () => {
  const { postgresSnapshotStore } = loadTs(
    new URL("../apps/sync/src/notion/snapshot.ts", import.meta.url),
  );
  const store = postgresSnapshotStore(sql),
    key = randomUUID();
  const leases = await Promise.all(
    Array.from({ length: 5 }, () => store.claim(key, 0)),
  );
  const token = leases.find(Boolean);
  assert.equal(leases.filter(Boolean).length, 1);
  await sql`UPDATE notion_snapshots SET lease_until=now()-interval '1 second' WHERE key=${key}`;
  const next = await store.claim(key, 0);
  assert.ok(next);
  await store.publish(key, token, ["old"]);
  assert.equal((await store.read(key)).value, null);
  await store.publish(key, next, ["new"]);
  assert.deepEqual((await store.read(key)).value, ["new"]);
});

test("a stale publisher receives an explicit failure instead of reporting a successful sync", async () => {
  const { postgresSnapshotStore, refreshSnapshot } = loadTs(
    new URL("../apps/sync/src/notion/snapshot.ts", import.meta.url),
  );
  const store = postgresSnapshotStore(sql),
    key = randomUUID();
  await assert.rejects(
    refreshSnapshot(
      store,
      key,
      async () => {
        await sql`UPDATE notion_snapshots SET lease_until=now()-interval '1 second' WHERE key=${key}`;
        return ["stale writer"];
      },
      0,
    ),
    /lease/i,
  );
  assert.equal((await store.read(key)).value, null);
});

test("a long-running publisher renews its lease before it can be reclaimed", async () => {
  const { postgresSnapshotStore, refreshSnapshot } = loadTs(
    new URL("../apps/sync/src/notion/snapshot.ts", import.meta.url),
  );
  const store = postgresSnapshotStore(sql),
    key = randomUUID();
  await refreshSnapshot(
    store,
    key,
    async () => {
      await sql`UPDATE notion_snapshots SET lease_until=now()+interval '100 milliseconds' WHERE key=${key}`;
      await new Promise((resolve) => setTimeout(resolve, 250));
      assert.equal(await store.claim(key, 0), null);
      return ["complete"];
    },
    0,
    { renewEveryMs: 10 },
  );
  assert.deepEqual((await store.read(key)).value, ["complete"]);
});

test("enquiries are durable and deduplicated without contacting Notion", async () => {
  const { durableEnquiryStore } = loadTs(
    new URL("../packages/database/src/durableEnquiryStore.ts", import.meta.url),
  );
  const store = durableEnquiryStore(sql),
    id = randomUUID();
  const value = { id, email: "test@example.invalid" };
  await Promise.all(
    Array.from({ length: 8 }, () => store.create(value, "same")),
  );
  assert.deepEqual(await durableEnquiryStore(sql).find(id), {
    receipt: id,
    fingerprint: "same",
  });
  await assert.rejects(store.create(value, "different"), /enquiry_conflict/);
  const [row] =
    await sql`SELECT count(*) AS count FROM notion_enquiry_outbox WHERE id=${id}`;
  assert.equal(Number(row.count), 1);
});

test("worker retries reconcile a committed Notion write and clear delivered private data", async () => {
  const { durableEnquiryStore, drainEnquiryOutbox } = loadTs(
    new URL("../packages/database/src/durableEnquiryStore.ts", import.meta.url),
  );
  await sql`TRUNCATE notion_enquiry_outbox`;
  const id = randomUUID(),
    value = { id, email: "private@example.invalid" };
  await durableEnquiryStore(sql).create(value, "same");
  let remote;
  let writes = 0;
  const target = {
    find: async () => remote,
    create: async () => {
      writes++;
      remote = { receipt: id, fingerprint: "same" };
      throw new Error("response lost after commit");
    },
  };
  await drainEnquiryOutbox(sql, target, 1);
  let [row] = await sql`SELECT * FROM notion_enquiry_outbox WHERE id=${id}`;
  assert.ok(row.payload, "failed delivery remains durable");
  assert.ok(row.available_at > new Date(), "retry is deferred");
  await sql`UPDATE notion_enquiry_outbox SET available_at=now() WHERE id=${id}`;
  await Promise.all([
    drainEnquiryOutbox(sql, target, 1),
    drainEnquiryOutbox(sql, target, 1),
  ]);
  [row] = await sql`SELECT * FROM notion_enquiry_outbox WHERE id=${id}`;
  assert.equal(row.payload, null);
  assert.ok(row.delivered_at);
  assert.equal(writes, 1);
});

test("a failed Notion mention is retried without creating another enquiry page", async () => {
  const { durableEnquiryStore, drainEnquiryOutbox } = loadTs(
    new URL("../packages/database/src/durableEnquiryStore.ts", import.meta.url),
  );
  await sql`TRUNCATE notion_enquiry_outbox`;
  const id = randomUUID();
  await durableEnquiryStore(sql).create({ id }, "same");
  let receipt,
    writes = 0,
    notifications = 0;
  const target = {
    find: async () => receipt,
    create: async () => {
      writes++;
      return (receipt = { receipt: id, fingerprint: "same", pageId: "page" });
    },
    notify: async () => {
      if (++notifications === 1) throw new Error("429");
    },
  };
  await drainEnquiryOutbox(sql, target, 1);
  const [pending] =
    await sql`SELECT delivered_at,payload FROM notion_enquiry_outbox WHERE id=${id}`;
  assert.equal(pending.delivered_at, null);
  assert.ok(pending.payload);
  await sql`UPDATE notion_enquiry_outbox SET available_at=now() WHERE id=${id}`;
  await drainEnquiryOutbox(sql, target, 1);
  assert.equal(writes, 1);
  assert.equal(notifications, 2);
  const [done] =
    await sql`SELECT delivered_at FROM notion_enquiry_outbox WHERE id=${id}`;
  assert.ok(done.delivered_at);
});

test("website sections and image bytes are read only from the current DB publication", async () => {
  const { readWebsiteSection, readWebsiteAsset, WEBSITE_CONTENT_KEY } = loadTs(
    new URL("../packages/database/src/websiteContent.ts", import.meta.url),
  );
  const { postgresSnapshotStore, refreshSnapshot } = loadTs(
    new URL("../apps/sync/src/notion/snapshot.ts", import.meta.url),
  );
  const { publicationStore } =
    await import("../apps/sync/src/notion/publicationStore.ts");
  const store = publicationStore(sql);
  const key = randomUUID(),
    bytes = Buffer.from("published image");
  await sql`INSERT INTO notion_assets(key,content,content_type) VALUES (${key},${bytes},'image/png')`;
  await refreshSnapshot(
    store,
    WEBSITE_CONTENT_KEY,
    async () => ({
      version: 2,
      locales: { en: { projects: [{ id: "public" }] } },
      assets: { avatar: key },
    }),
    0,
  );
  assert.deepEqual(await readWebsiteSection("projects", sql), [
    { id: "public" },
  ]);
  assert.deepEqual((await readWebsiteAsset("avatar", sql)).content, bytes);
  assert.equal(
    await readWebsiteAsset(key, sql),
    null,
    "unpublished asset keys cannot be read directly",
  );
  await refreshSnapshot(
    store,
    WEBSITE_CONTENT_KEY,
    async () => ({ version: 2, locales: { en: { projects: [] } }, assets: {} }),
    0,
  );
  assert.equal(
    await readWebsiteAsset("avatar", sql),
    null,
    "withdrawn images stop resolving",
  );
});

test("related website sections stay in one publication while a worker publishes concurrently", async () => {
  const { readWebsiteSections, WEBSITE_CONTENT_KEY } = loadTs(
    new URL("../packages/database/src/websiteContent.ts", import.meta.url),
  );
  const publish = async (version) =>
    sql`UPDATE public_content SET payload=${sql.json({ version: 2, locales: { en: { projects: [{ id: version }], cases: [{ id: version }], icons: { version } } }, assets: {} })} WHERE key=${WEBSITE_CONTENT_KEY}`;
  await publish("initial");
  await Promise.all([
    (async () => {
      for (let i = 0; i < 30; i++) await publish(String(i));
    })(),
    (async () => {
      for (let i = 0; i < 30; i++) {
        const content = await readWebsiteSections(
          ["projects", "cases", "icons"],
          sql,
        );
        assert.equal(content.projects[0].id, content.cases[0].id);
        assert.equal(content.projects[0].id, content.icons.version);
      }
    })(),
  ]);
});

test("an expired writer cannot change the public publication, and a successful publication withdraws search rows immediately", async () => {
  const { publicationStore } =
    await import("../apps/sync/src/notion/publicationStore.ts");
  const store = publicationStore(sql),
    key = randomUUID(),
    token = await store.claim(key, 0);
  const [before] =
    await sql`SELECT payload FROM public_content WHERE key='website-v2'`;
  await sql`UPDATE notion_snapshots SET lease_until=now()-interval '1 second' WHERE key=${key}`;
  const value = {
    version: 2,
    locales: { en: { projects: [] }, de: { projects: [] } },
    assets: {},
  };
  assert.equal(await store.publish(key, token, value), false);
  const [after] =
    await sql`SELECT payload FROM public_content WHERE key='website-v2'`;
  assert.deepEqual(after.payload, before.payload);
  const id = randomUUID();
  await sql`INSERT INTO knowledge_documents(id,project_id,title,locale,href,hash,embedding_model) VALUES (${id},'withdrawn','Withdrawn','en','/en/projects/withdrawn','old','test')`;
  const fresh = await store.claim(key, 0);
  assert.equal(await store.publish(key, fresh, value), true);
  const rows = await sql`SELECT id FROM knowledge_documents WHERE id=${id}`;
  assert.equal(
    rows.length,
    0,
    "withdrawal must not wait for any embedding call",
  );
});
