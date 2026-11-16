import assert from "node:assert/strict";
import { test, after } from "node:test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { knowledgeDatabase } from "../src/server/knowledge/database.ts";
import { syncWebsiteContent } from "../src/server/notion/syncWebsiteContent.ts";
import {
  readWebsiteSection,
  readWebsiteAsset,
  propertyAssetKey,
} from "../src/server/notion/websiteContent.ts";
import {
  durableEnquiryStore,
  drainEnquiryOutbox,
} from "../src/server/enquiries/durableEnquiryStore.ts";
import { notionEnquiryStore } from "../src/server/enquiries/notionEnquiryStore.ts";
import { emptyEnquiry } from "../src/lib/enquiry.ts";

const url = new URL(
  process.env.KNOWLEDGE_DATABASE_URL || "http://unconfigured",
);
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  !url.pathname.endsWith("_test")
)
  throw new Error("Use a dedicated localhost database ending in _test");
const sql = knowledgeDatabase();
await sql.unsafe(
  await readFile(
    new URL("../ops/knowledge/003-notion-resilience.sql", import.meta.url),
    "utf8",
  ),
);
const originalFetch = global.fetch;
after(async () => {
  global.fetch = originalFetch;
  await sql.end();
});
process.env.NEXT_NOTION_TOKEN = `test-${randomUUID()}`;
const publicId = randomUUID(),
  hiddenId = randomUUID(),
  studyId = randomUUID(),
  ownerId = randomUUID(),
  dbId = randomUUID(),
  copyId = randomUUID();
process.env.NEXT_NOTION_PROJECT_DB_ID = dbId;
process.env.NEXT_NOTION_OWNER_CONTACT_ID = ownerId.replaceAll("-", "");
process.env.NEXT_NOTION_SITE_COPY_DB_ID = copyId;
const page = (id, properties = {}) => ({
  object: "page",
  id,
  archived: false,
  in_trash: false,
  last_edited_time: "2026-11-16T12:00:00.000Z",
  properties,
});
const rich = (text) => ({
  type: "rich_text",
  rich_text: [{ type: "text", plain_text: text, text: { content: text } }],
});
const project = (id, hidden) =>
  page(id, {
    Name: {
      type: "title",
      title: [{ plain_text: hidden ? "Hidden" : "Public" }],
    },
    "Project Description": rich("Description"),
    KPIs: rich("Outcome"),
    Clients: { type: "relation", relation: [] },
    Hidden: { type: "checkbox", checkbox: hidden },
    Logo: {
      type: "files",
      files: [
        {
          type: "external",
          name: "logo",
          external: {
            url: "https://portfolio.fuerst.one/img/logos/bwi-logo.jpeg",
          },
        },
      ],
    },
    "Case study EN": {
      type: "url",
      url: `https://notion.so/${hidden ? randomUUID() : studyId}`,
    },
  });
const list = (results) =>
  Response.json({
    object: "list",
    results,
    has_more: false,
    next_cursor: null,
  });
let hidePublic = false,
  fail = false;
const requests = [];
global.fetch = async (input) => {
  const path = new URL(String(input)).pathname;
  requests.push(path);
  if (fail)
    return Response.json(
      {
        object: "error",
        status: 429,
        code: "rate_limited",
        message: "test cooldown",
      },
      { status: 429, headers: { "Retry-After": "180" } },
    );
  if (path === `/v1/databases/${dbId}/query`)
    return list([project(publicId, hidePublic), project(hiddenId, true)]);
  if (path === `/v1/databases/${copyId}/query`)
    return list([
      page(randomUUID(), {
        Key: { type: "title", title: [{ plain_text: "home.title" }] },
        English: rich("Published"),
        German: rich("Veröffentlicht"),
      }),
    ]);
  if (path === `/v1/pages/${ownerId.replaceAll("-", "")}`)
    return Response.json(
      page(ownerId, {
        Avatar: {
          type: "files",
          files: [
            {
              type: "external",
              name: "avatar",
              external: {
                url: "https://portfolio.fuerst.one/img/logos/bwi-logo.jpeg",
              },
            },
          ],
        },
      }),
    );
  if (path === `/v1/pages/${studyId}`) return Response.json(page(studyId));
  if (path === `/v1/blocks/${studyId}/children`) return list([]);
  throw new Error(`Unexpected outbound request: ${path}`);
};

test("worker publishes public content and image bytes; DB readers require no Notion connection", async () => {
  await sql`TRUNCATE notion_snapshots,notion_assets,notion_request_gate`;
  await syncWebsiteContent(true);
  const projects = await readWebsiteSection("projects");
  assert.deepEqual(
    projects.map((p) => p.id),
    [publicId],
  );
  assert.ok(await readWebsiteAsset(propertyAssetKey(publicId, "Logo", 0)));
  assert.ok(
    await readWebsiteAsset(propertyAssetKey(ownerId, "Avatar", 0)),
    "undashed configuration IDs still publish the owner's avatar",
  );
  assert.equal(
    await readWebsiteAsset(propertyAssetKey(hiddenId, "Logo", 0)),
    null,
  );
  assert.equal(
    requests.filter((p) => p.includes("/blocks/")).length,
    1,
    "hidden case studies are not read",
  );
  const fetcher = global.fetch;
  global.fetch = async () => {
    throw new Error("Notion offline");
  };
  assert.equal((await readWebsiteSection("copy"))[0].en, "Published");
  assert.ok(await readWebsiteAsset(propertyAssetKey(publicId, "Logo", 0)));
  global.fetch = fetcher;
});

test("a real SDK 429 preserves the entire previous database publication", async () => {
  const before = await readWebsiteSection("projects");
  fail = true;
  await assert.rejects(syncWebsiteContent(true));
  assert.deepEqual(await readWebsiteSection("projects"), before);
  assert.ok(await readWebsiteAsset(propertyAssetKey(publicId, "Logo", 0)));
  fail = false;
  await sql`TRUNCATE notion_request_gate`;
  await sql`UPDATE notion_snapshots SET retry_at=now()`;
});

test("the next successful publication withdraws hidden projects and their image access together", async () => {
  hidePublic = true;
  await syncWebsiteContent(true);
  assert.deepEqual(await readWebsiteSection("projects"), []);
  assert.equal(
    await readWebsiteAsset(propertyAssetKey(publicId, "Logo", 0)),
    null,
  );
});

test("a lost mention response is reconciled through the real Notion adapter without duplicate pages or mentions", async () => {
  await sql`TRUNCATE notion_enquiry_outbox,notion_request_gate`;
  process.env.NEXT_NOTION_ENQUIRIES_DB_ID = randomUUID();
  process.env.NOTION_ENQUIRY_MENTION_USER_ID = randomUUID();
  const brief = {
    ...emptyEnquiry("en"),
    id: randomUUID(),
    name: "Test",
    email: "test@example.invalid",
    intent: "explore",
  };
  await durableEnquiryStore(sql).create(brief, "fingerprint");
  let remote,
    blocks = [],
    creates = 0,
    mentions = 0;
  global.fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith("/query")) return list(remote ? [remote] : []);
    if (path === "/v1/pages") {
      creates++;
      const input = JSON.parse(init.body);
      remote = page(randomUUID(), {
        id: {
          type: "title",
          title: [{ plain_text: input.properties.id.title[0].text.content }],
        },
      });
      return Response.json(remote);
    }
    if (path === `/v1/blocks/${remote?.id}/children`) {
      if (init.method === "PATCH") {
        mentions++;
        blocks = JSON.parse(init.body).children.map((b) => ({
          ...b,
          id: randomUUID(),
          paragraph: {
            rich_text: b.paragraph.rich_text.map((t) =>
              t.type === "mention"
                ? { ...t, mention: { type: "user", user: t.mention.user } }
                : t,
            ),
          },
        }));
        return Response.json(
          {
            object: "error",
            status: 503,
            code: "service_unavailable",
            message: "response lost",
          },
          { status: 503 },
        );
      }
      return list(blocks);
    }
    throw new Error(`Unexpected request: ${path}`);
  };
  const target = notionEnquiryStore();
  await drainEnquiryOutbox(sql, target, 1);
  const [pending] =
    await sql`SELECT delivered_at FROM notion_enquiry_outbox WHERE id=${brief.id}`;
  assert.equal(pending.delivered_at, null);
  assert.equal(mentions, 1);
  await sql`UPDATE notion_enquiry_outbox SET available_at=now()`;
  await drainEnquiryOutbox(sql, target, 1);
  const [done] =
    await sql`SELECT delivered_at,payload FROM notion_enquiry_outbox WHERE id=${brief.id}`;
  assert.ok(done.delivered_at);
  assert.equal(done.payload, null);
  assert.equal(creates, 1);
  assert.equal(mentions, 1);
  assert.equal(
    blocks[0].paragraph.rich_text[1].mention.user.id,
    process.env.NOTION_ENQUIRY_MENTION_USER_ID,
  );
});
