import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test, after } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const url = new URL(
  process.env.KNOWLEDGE_DATABASE_URL || "http://unconfigured",
);
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  !url.pathname.endsWith("_test")
)
  throw Error("Dedicated localhost _test database required");
const { knowledgeDatabase } = loadTs(
  new URL("../packages/database/src/database.ts", import.meta.url),
);
const { cachedImageDescription } = loadTs(
  new URL("../packages/knowledge/src/imageDescriptions.ts", import.meta.url),
);
const { prepareKnowledgeImage } = loadTs(
  new URL("../apps/sync/src/knowledge/describeImage.ts", import.meta.url),
);
const require = createRequire(
  new URL("../apps/sync/package.json", import.meta.url),
);
const sharp = require("sharp");
const sql = knowledgeDatabase();
after(() => sql.end());
test("image descriptions checkpoint by bytes and generation settings, including uncertain calls", async () => {
  await sql.unsafe(
    await readFile(
      new URL(
        "../packages/database/migrations/011-image-descriptions.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await sql`TRUNCATE knowledge_image_descriptions`;
  let calls = 0;
  const input = {
    content: Buffer.from("pixels-a"),
    model: "model",
    version: "v1",
  };
  const describe = async () => {
    calls++;
    return {
      description: "A map with route controls.",
      altText: "Map with route controls",
      costUsd: 0.001,
    };
  };
  const first = await cachedImageDescription(sql, input, describe);
  assert.ok(first, "a description must be produced and checkpointed");
  assert.equal(first.description, "A map with route controls.");
  assert.equal(first.altText, "Map with route controls");
  assert.equal(
    (await cachedImageDescription(sql, input, describe)).altText,
    first.altText,
  );
  assert.equal(
    (await cachedImageDescription(sql, input, describe)).key,
    first.key,
  );
  assert.equal(calls, 1, "unchanged content is described once");
  await cachedImageDescription(sql, { ...input, version: "v2" }, describe);
  await cachedImageDescription(
    sql,
    { ...input, content: Buffer.from("pixels-b") },
    describe,
  );
  assert.equal(calls, 3, "settings and byte changes invalidate captions");
  await assert.rejects(
    cachedImageDescription(
      sql,
      { ...input, version: "incomplete-pair" },
      async () => ({ description: "Only a detailed description" }),
    ),
    /Invalid image description/,
  );
  const [incomplete] =
    await sql`SELECT status,description,alt_text FROM knowledge_image_descriptions WHERE version='incomplete-pair'`;
  assert.equal(
    incomplete.status,
    "failed",
    "a partial pair must not become a completed cache entry",
  );
  assert.equal(incomplete.description, null);
  assert.equal(incomplete.alt_text, null);
  const { KnowledgeQuotaError } = loadTs(
    new URL("../packages/knowledge/src/usage.ts", import.meta.url),
  );
  await assert.rejects(
    cachedImageDescription(
      sql,
      { ...input, version: "budget-paused" },
      async () => {
        throw new KnowledgeQuotaError("No paid dispatch");
      },
    ),
  );
  const resumed = await cachedImageDescription(
    sql,
    { ...input, version: "budget-paused" },
    describe,
  );
  assert.equal(
    resumed.description,
    "A map with route controls.",
    "a known admission denial must not poison future indexing",
  );
  let failed = 0;
  const uncertain = async () => {
    failed++;
    throw Error("Unknown provider charge");
  };
  await assert.rejects(
    cachedImageDescription(sql, { ...input, version: "timeout" }, uncertain),
  );
  await assert.rejects(
    cachedImageDescription(sql, { ...input, version: "timeout" }, uncertain),
    /review/i,
  );
  assert.equal(
    failed,
    1,
    "a later worker tick must not repeat an uncertain paid call",
  );
  const attempts = await Promise.all(
    Array.from({ length: 3 }, () =>
      cachedImageDescription(
        sql,
        { ...input, version: "parallel" },
        describe,
      ).catch(() => null),
    ),
  );
  assert.equal(attempts.filter(Boolean).length >= 1, true);
  assert.equal(
    calls,
    5,
    "concurrent workers cannot describe identical bytes twice",
  );
});
test("bounded raster preprocessing strips metadata and resizes without enlarging", async () => {
  const input = await sharp({
    create: { width: 1600, height: 800, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const output = await prepareKnowledgeImage(input, "image/png");
  assert.ok(
    Buffer.isBuffer(output),
    "preprocessing must return bounded image bytes",
  );
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.width, 1024);
  assert.equal(metadata.height, 512);
  await assert.rejects(
    prepareKnowledgeImage(Buffer.from("<svg/>"), "image/svg+xml"),
    /raster/i,
  );
  await assert.rejects(
    prepareKnowledgeImage(Buffer.alloc(8 * 1024 * 1024 + 1), "image/png"),
    /size/i,
  );
});
test("page descriptions are readable text and disappear when their published asset version changes", async () => {
  const { readPublicImageDescriptions } = loadTs(
    new URL("../packages/database/src/imageDescriptions.ts", import.meta.url),
  );
  const [caption] =
    await sql`SELECT key FROM knowledge_image_descriptions WHERE status='complete' LIMIT 1`;
  const payload = {
    version: 3,
    locales: {
      en: { projects: [{ id: "page-project", availableLocales: ["en"] }] },
    },
    assets: { "property:page-project:Screenshots:0": "current-asset" },
  };
  await sql`INSERT INTO public_content(key,payload) VALUES('website-v3',${sql.json(payload)}) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload`;
  await sql`INSERT INTO knowledge_documents(id,project_id,title,locale,href,hash,embedding_model,provenance) VALUES('image-page','page-project','Page project','en','/en/projects/page-project','h','model',${sql.json({ kind: "image", assetKey: "property:page-project:Screenshots:0", assetId: "current-asset", href: "/api/image/page-project/Screenshots?i=0", descriptionKey: caption.key })}) ON CONFLICT(id) DO UPDATE SET provenance=excluded.provenance`;
  const visible = await readPublicImageDescriptions("page-project", "en", sql);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].description, "A map with route controls.");
  assert.equal(visible[0].altText, "Map with route controls");
  const role = `homepage_image_reader_${process.pid}`;
  await sql.unsafe(`CREATE ROLE ${role}`);
  try {
    await sql.unsafe(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await sql.unsafe(`GRANT SELECT ON public_image_descriptions TO ${role}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL ROLE ${role}`);
      assert.equal(
        (await readPublicImageDescriptions("page-project", "en", tx)).length,
        1,
        "read-only application access works through the public view",
      );
    });
    await assert.rejects(
      sql.begin(async (tx) => {
        await tx.unsafe(`SET LOCAL ROLE ${role}`);
        await tx`SELECT * FROM knowledge_image_descriptions`;
      }),
      /permission denied/,
    );
  } finally {
    await sql.unsafe(`REVOKE SELECT ON public_image_descriptions FROM ${role}`);
    await sql.unsafe(`REVOKE USAGE ON SCHEMA public FROM ${role}`);
    await sql.unsafe(`DROP ROLE ${role}`);
  }

  assert.deepEqual(
    await readPublicImageDescriptions("page-project", "de", sql),
    [],
  );
  payload.assets["property:page-project:Screenshots:0"] = "replacement";
  await sql`UPDATE public_content SET payload=${sql.json(payload)} WHERE key='website-v3'`;
  assert.deepEqual(
    await readPublicImageDescriptions("page-project", "en", sql),
    [],
  );
});
test("the full index reuses captions and vectors, retrieves image content and withdraws it atomically", async () => {
  const { indexKnowledge } = loadTs(
    new URL("../apps/sync/src/knowledge/indexKnowledge.ts", import.meta.url),
  );
  const { searchKnowledgeProjects } = loadTs(
    new URL(
      "../apps/web/src/server/knowledge/projectSearch.ts",
      import.meta.url,
    ),
  );
  const { answerKnowledge } = loadTs(
    new URL("../apps/web/src/server/knowledge/chat.ts", import.meta.url),
  );
  const { readKnowledgeCacheContext } = loadTs(
    new URL("../packages/knowledge/src/cacheContext.ts", import.meta.url),
  );
  const { publicationStore } = loadTs(
    new URL("../apps/sync/src/notion/publicationStore.ts", import.meta.url),
  );
  const { KNOWLEDGE_CONSENT_VERSION } = loadTs(
    new URL("../packages/content/src/knowledgeConsent.ts", import.meta.url),
  );
  await sql`TRUNCATE knowledge_documents,knowledge_image_descriptions,knowledge_embedding_cache,knowledge_query_cache,knowledge_response_cache,knowledge_usage,knowledge_sync CASCADE`;
  await sql`DELETE FROM settings WHERE key LIKE 'ai.%'`;
  await sql`INSERT INTO settings(key,value) VALUES('ai.enabled','true'::jsonb)`;
  process.env.KNOWLEDGE_RATE_LIMIT_SECRET = "test-only-secret";
  process.env.OPENROUTER_API_KEY = "fixture-no-network";
  const project = {
    id: "visual-project",
    name: "Visual project",
    availableLocales: ["en", "de"],
    description: {
      rich_text: [{ plain_text: "A documented public project." }],
    },
    tools: [],
    capabilities: [],
    industries: [],
    languages: [],
    clients: [],
    caseStudyIds: { en: null, de: null },
    screenshots: ["/api/image/visual-project/Screenshots?i=0"],
  };
  const payload = {
    version: 3,
    locales: {
      en: { projects: [project], studies: {} },
      de: { projects: [project], studies: {} },
    },
    assets: { "property:visual-project:Screenshots:0": "visual-asset" },
  };
  const png = await sharp({
    create: { width: 100, height: 60, channels: 3, background: "cyan" },
  })
    .png()
    .toBuffer();
  await sql`INSERT INTO notion_assets(key,content,content_type) VALUES('visual-asset',${png},'image/png') ON CONFLICT(key) DO UPDATE SET content=excluded.content`;
  await sql`INSERT INTO public_content(key,payload,refreshed_at) VALUES('website-v3',${sql.json(payload)},clock_timestamp()) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,refreshed_at=excluded.refreshed_at`;
  const oldFetch = globalThis.fetch;
  let captions = 0,
    embeddings = 0,
    answers = 0;
  const vector = Array.from({ length: 1536 }, (_, i) => (i === 0 ? 1 : 0));
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith("/models"))
      return Response.json({
        data: [
          {
            id: "openai/gpt-4.1-mini",
            pricing: { prompt: "0.0000004", completion: "0.0000016" },
          },
        ],
      });
    const body = JSON.parse(options.body);
    assert.deepEqual(body.provider.only, ["azure"]);
    assert.equal(body.provider.zdr, true);
    assert.equal(body.provider.allow_fallbacks, false);
    if (String(url).endsWith("/embeddings")) {
      embeddings++;
      return Response.json({
        data: body.input.map((_, index) => ({ index, embedding: vector })),
        usage: { cost: 0.000001 },
      });
    }
    if (
      body.response_format?.json_schema?.name === "portfolio_image_descriptions"
    ) {
      captions++;
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                description: "A cyan interface with hexagonal controls.",
                altText: "Cyan interface with hexagonal controls",
              }),
            },
          },
        ],
        usage: { cost: 0.0006 },
      });
    }
    answers++;
    assert.match(body.messages[0].content, /Never infer project authorship/);
    const evidence = JSON.parse(body.messages[1].content).evidence;
    const image = evidence.find((s) => s.sourceKind === "image");
    assert.ok(image, "chat receives a separately typed image observation");
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              answer: "The image shows cyan controls.",
              sourceIds: [image.id],
              actions: [],
            }),
          },
        },
      ],
      usage: { cost: 0.0005 },
    });
  };
  try {
    const first = await indexKnowledge();
    assert.equal(first.imagesSkipped, 0);
    assert.equal(captions, 1, "two locales reuse one paid description");
    const paid = { captions, embeddings };
    await indexKnowledge();
    assert.deepEqual(
      { captions, embeddings },
      paid,
      "unchanged sync makes no provider calls",
    );
    const consent = {
      version: KNOWLEDGE_CONSENT_VERSION,
      decidedAt: Date.now(),
      remember: true,
      allowed: true,
    };
    const matches = await searchKnowledgeProjects(
      "cyan hexagonal controls",
      "127.0.0.1",
      undefined,
      consent,
    );
    assert.ok(matches.includes("visual-project"));
    const queryCalls = embeddings;
    await searchKnowledgeProjects(
      "cyan hexagonal controls",
      "127.0.0.1",
      undefined,
      consent,
    );
    assert.equal(
      embeddings,
      queryCalls,
      "repeated searches reuse the query vector",
    );
    const answer = await answerKnowledge(
      "Tell me about Visual project",
      "en",
      "127.0.0.2",
      undefined,
      consent,
    );
    assert.equal(answer.sources[0].sourceKind, "image");
    assert.equal(answers, 1);
    const { readPublicImageDescriptions } = loadTs(
      new URL("../packages/database/src/imageDescriptions.ts", import.meta.url),
    );
    const initialText = await readPublicImageDescriptions(
      "visual-project",
      "en",
      sql,
    );
    assert.equal(
      initialText[0].altText,
      "Cyan interface with hexagonal controls",
    );
    // The ordinary indexing cycle handles a newly published screenshot without a manual caption step.
    const newPng = await sharp({
      create: { width: 80, height: 40, channels: 3, background: "yellow" },
    })
      .png()
      .toBuffer();
    await sql`INSERT INTO notion_assets(key,content,content_type) VALUES('new-screenshot',${newPng},'image/png') ON CONFLICT(key) DO UPDATE SET content=excluded.content`;
    payload.locales.en.projects[0].screenshots.push(
      "/api/image/visual-project/Screenshots?i=2",
    );
    payload.assets["property:visual-project:Screenshots:2"] = "new-screenshot";
    await sql`UPDATE public_content SET payload=${sql.json(payload)},refreshed_at=clock_timestamp() WHERE key='website-v3'`;
    const appended = await indexKnowledge();
    assert.equal(appended.imagesSkipped, 0);
    assert.equal(
      captions,
      2,
      "one generation produces both variants for the new image across locales",
    );
    const newText = (
      await readPublicImageDescriptions("visual-project", "en", sql)
    ).find((row) => row.href.endsWith("i=2"));
    assert.ok(newText.description);
    assert.ok(newText.altText);
    const afterAppend = { captions, embeddings };
    await indexKnowledge();
    assert.deepEqual(
      { captions, embeddings },
      afterAppend,
      "both variants are reused without paying again",
    );
    await sql`INSERT INTO notion_assets(key,content,content_type) VALUES('unsupported',${Buffer.from("<svg/>")},'image/svg+xml') ON CONFLICT DO NOTHING`;
    payload.locales.en.projects[0].screenshots.push(
      "/api/image/visual-project/Screenshots?i=1",
    );
    payload.assets["property:visual-project:Screenshots:1"] = "unsupported";
    await sql`UPDATE public_content SET payload=${sql.json(payload)},refreshed_at=clock_timestamp() WHERE key='website-v3'`;
    const partial = await indexKnowledge();
    assert.equal(partial.imagesSkipped, 2);
    assert.ok(
      partial.imageFailures.every(
        (f) =>
          f.reason === "unsupported-image" &&
          f.assetKey === "property:visual-project:Screenshots:1",
      ),
    );
    const revision = (await readKnowledgeCacheContext(sql)).revision;
    const store = publicationStore(sql),
      key = "image-withdrawal";
    payload.locales.en.projects[0].screenshots = [];
    payload.locales.de.projects[0].screenshots = [];
    delete payload.assets["property:visual-project:Screenshots:0"];
    delete payload.assets["property:visual-project:Screenshots:2"];
    assert.equal(
      await store.publish(key, await store.claim(key, 0), payload),
      true,
    );
    assert.equal(
      (
        await sql`SELECT id FROM knowledge_documents WHERE provenance->>'kind'='image'`
      ).length,
      0,
    );
    await indexKnowledge();
    assert.notEqual(
      (await readKnowledgeCacheContext(sql)).revision,
      revision,
      "image withdrawal invalidates answer scope",
    );
    assert.equal(captions, 2);
    // Visual indexing is optional: a failed image embedding must not disable project text.
    payload.locales.en.projects[0].screenshots = [
      "/api/image/visual-project/Screenshots?i=0",
    ];
    payload.assets["property:visual-project:Screenshots:0"] =
      "embedding-failure-asset";
    const other = await sharp({
      create: { width: 40, height: 30, channels: 3, background: "magenta" },
    })
      .png()
      .toBuffer();
    await sql`INSERT INTO notion_assets(key,content,content_type) VALUES('embedding-failure-asset',${other},'image/png') ON CONFLICT DO NOTHING`;
    await sql`UPDATE public_content SET payload=${sql.json(payload)},refreshed_at=clock_timestamp() WHERE key='website-v3'`;
    const successfulFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      const body = options?.body ? JSON.parse(options.body) : null;
      if (
        String(url).endsWith("/embeddings") &&
        body.input.some((text) => text.includes("magenta"))
      )
        return new Response("", { status: 503 });
      if (
        String(url).endsWith("/chat/completions") &&
        body.response_format?.json_schema?.name ===
          "portfolio_image_descriptions"
      )
        return Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  description: "A magenta image.",
                  altText: "Magenta image",
                }),
              },
            },
          ],
          usage: { cost: 0.0001 },
        });
      return successfulFetch(url, options);
    };
    const limited = await indexKnowledge();
    assert.equal(limited.imagesSkipped, 2);
    assert.equal(
      (
        await sql`SELECT count(*)::integer AS count FROM knowledge_documents WHERE provenance->>'kind'='project'`
      )[0].count,
      2,
    );
    assert.ok(
      (await readKnowledgeCacheContext(sql)).revision,
      "text retrieval remains fresh after image embedding failures",
    );
  } finally {
    globalThis.fetch = oldFetch;
  }
});
