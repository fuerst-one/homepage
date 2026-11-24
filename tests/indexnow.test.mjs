import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { sitemapEntries } = loadTs(
  new URL("../apps/sync/src/indexnow/sitemapEntries.ts", import.meta.url),
);
const { submitIndexNow } = loadTs(
  new URL("../apps/sync/src/indexnow/submitIndexNow.ts", import.meta.url),
);
const { syncIndexNow } = loadTs(
  new URL("../apps/sync/src/indexnow/syncIndexNow.ts", import.meta.url),
);
const { INDEXNOW_KEY, INDEXNOW_KEY_PATH } = loadTs(
  new URL("../packages/content/src/indexNow.ts", import.meta.url),
);

const sitemap = (...urls) =>
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls
    .map(
      ([loc, lastmod]) =>
        `<url>\n<loc>${loc}</loc>\n<xhtml:link rel="alternate" hreflang="de" href="${loc}/de" />${lastmod ? `\n<lastmod>${lastmod}</lastmod>` : ""}\n</url>`,
    )
    .join("\n")}</urlset>`;

function fakeWeb(xml, submitStatus = 202, servedKey = INDEXNOW_KEY) {
  const submissions = [];
  const fetcher = async (url, init) => {
    if (String(url) === "https://fuerst.one/sitemap.xml")
      return new Response(xml, { status: 200 });
    if (String(url) === `https://fuerst.one${INDEXNOW_KEY_PATH}`)
      return servedKey === null
        ? new Response("Not found", { status: 404 })
        : new Response(servedKey, { status: 200 });
    submissions.push({ url: String(url), body: JSON.parse(init.body) });
    return new Response("", { status: submitStatus });
  };
  return { fetcher, submissions };
}

function memoryStore(initial = []) {
  const rows = new Map(initial);
  return {
    rows,
    async submitted() {
      return new Map(rows);
    },
    async record(entries) {
      for (const { url, lastmod } of entries) rows.set(url, lastmod);
    },
  };
}

test("sitemap entries keep each page URL and its lastmod, ignoring hreflang alternates", () => {
  assert.deepEqual(
    sitemapEntries(
      sitemap(
        ["https://fuerst.one/en", null],
        ["https://fuerst.one/en/projects/a", "2026-11-20T10:00:00.000Z"],
      ),
    ),
    [
      { url: "https://fuerst.one/en", lastmod: null },
      {
        url: "https://fuerst.one/en/projects/a",
        lastmod: "2026-11-20T10:00:00.000Z",
      },
    ],
  );
});

test("sitemap entries decode XML entities in URLs", () => {
  assert.deepEqual(
    sitemapEntries(sitemap(["https://fuerst.one/en?a=1&amp;b=2", null])),
    [{ url: "https://fuerst.one/en?a=1&b=2", lastmod: null }],
  );
});

test("the IndexNow submission names the host, key and key location for every URL", async () => {
  const { fetcher, submissions } = fakeWeb("");
  await submitIndexNow(["https://fuerst.one/en"], fetcher);
  assert.equal(submissions.length, 1);
  assert.equal(submissions[0].url, "https://api.indexnow.org/indexnow");
  assert.deepEqual(submissions[0].body, {
    host: "fuerst.one",
    key: INDEXNOW_KEY,
    keyLocation: `https://fuerst.one${INDEXNOW_KEY_PATH}`,
    urlList: ["https://fuerst.one/en"],
  });
});

test("a rejected IndexNow submission throws its status", async () => {
  const { fetcher } = fakeWeb("", 403);
  await assert.rejects(
    submitIndexNow(["https://fuerst.one/en"], fetcher),
    /403/,
  );
});

test("the key is a valid IndexNow key", () => {
  assert.match(INDEXNOW_KEY, /^[a-zA-Z0-9-]{8,128}$/);
  assert.equal(INDEXNOW_KEY_PATH, "/indexnow-key.txt");
});

test("the first sync submits every sitemap URL and remembers it", async () => {
  const { fetcher, submissions } = fakeWeb(
    sitemap(["https://fuerst.one/en", null], ["https://fuerst.one/de", "x"]),
  );
  const store = memoryStore();
  assert.deepEqual(await syncIndexNow(store, fetcher), { submitted: 2 });
  assert.deepEqual(submissions[0].body.urlList, [
    "https://fuerst.one/en",
    "https://fuerst.one/de",
  ]);
  assert.deepEqual(
    [...store.rows],
    [
      ["https://fuerst.one/en", null],
      ["https://fuerst.one/de", "x"],
    ],
  );
});

test("later syncs submit only new URLs and URLs with a changed lastmod", async () => {
  const { fetcher, submissions } = fakeWeb(
    sitemap(
      ["https://fuerst.one/en", null],
      ["https://fuerst.one/en/projects/a", "2026-11-21"],
      ["https://fuerst.one/en/projects/b", "2026-11-01"],
      ["https://fuerst.one/en/projects/c", "2026-11-01"],
    ),
  );
  const store = memoryStore([
    ["https://fuerst.one/en", null],
    ["https://fuerst.one/en/projects/a", "2026-11-20"],
    ["https://fuerst.one/en/projects/b", "2026-11-01"],
  ]);
  assert.deepEqual(await syncIndexNow(store, fetcher), { submitted: 2 });
  assert.deepEqual(submissions[0].body.urlList, [
    "https://fuerst.one/en/projects/a",
    "https://fuerst.one/en/projects/c",
  ]);
  assert.equal(
    store.rows.get("https://fuerst.one/en/projects/a"),
    "2026-11-21",
  );
});

test("an unchanged sitemap submits nothing", async () => {
  const { fetcher, submissions } = fakeWeb(
    sitemap(["https://fuerst.one/en", "2026-11-01"]),
  );
  const store = memoryStore([["https://fuerst.one/en", "2026-11-01"]]);
  assert.deepEqual(await syncIndexNow(store, fetcher), { submitted: 0 });
  assert.equal(submissions.length, 0);
});

test("a failed submission records nothing, so the next sync retries", async () => {
  const { fetcher } = fakeWeb(sitemap(["https://fuerst.one/en", null]), 429);
  const store = memoryStore();
  await assert.rejects(syncIndexNow(store, fetcher), /429/);
  assert.equal(store.rows.size, 0);
});

test("an empty or unreadable sitemap is an error, not an empty submission", async () => {
  const { fetcher, submissions } = fakeWeb("<html>maintenance</html>");
  await assert.rejects(syncIndexNow(memoryStore(), fetcher), /sitemap/);
  assert.equal(submissions.length, 0);
});

test("the site serves the IndexNow key as plain text at its key path", async () => {
  const { GET } = loadTs(
    new URL("../apps/web/src/app/indexnow-key.txt/route.ts", import.meta.url),
  );
  const response = await GET();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/plain/);
  assert.equal(await response.text(), INDEXNOW_KEY);
});

test("nothing is submitted while the site does not serve the key yet", async () => {
  for (const servedKey of [null, "an-older-key"]) {
    const { fetcher, submissions } = fakeWeb(
      sitemap(["https://fuerst.one/en", null]),
      202,
      servedKey,
    );
    const store = memoryStore();
    await assert.rejects(syncIndexNow(store, fetcher), /key/);
    assert.equal(submissions.length, 0);
    assert.equal(store.rows.size, 0);
  }
});
