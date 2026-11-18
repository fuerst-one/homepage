import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { readFile } from "node:fs/promises";
import { loadTs } from "./helpers/load-ts.mjs";
import { createHash, createHmac } from "node:crypto";
import {
  publicQuestionGroups,
  uncacheableQuestions,
} from "./fixtures/knowledge-cache-phrases.mjs";

const url = new URL(
  process.env.KNOWLEDGE_DATABASE_URL || "http://unconfigured",
);
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  !url.pathname.endsWith("_test")
)
  throw new Error(
    "Cache integration requires a dedicated localhost database ending in _test",
  );
const { knowledgeDatabase } = loadTs(
  new URL("../packages/database/src/database.ts", import.meta.url),
);
const cache = loadTs(
  new URL("../packages/knowledge/src/queryCache.ts", import.meta.url),
);
const responses = loadTs(
  new URL("../packages/knowledge/src/responseCache.ts", import.meta.url),
);
const sql = knowledgeDatabase();
before(async () => {
  for (const file of [
    "001-initial.sql",
    "008-ai-admission.sql",
    "009-query-cache.sql",
    "010-query-cache-retention.sql",
  ])
    await sql.unsafe(
      await readFile(
        new URL(`../packages/database/migrations/${file}`, import.meta.url),
        "utf8",
      ),
    );
});
after(() => sql.end());
const vector = Array.from({ length: 1536 }, (_, i) => (i === 0 ? 1 : 0));
const sources = [
  {
    id: "s1",
    projectId: "konfig",
    title: "Konfig",
    href: "/en/projects/konfig/case-study",
    content: "Public React project.",
  },
];
const raw = {
  answer: "Konfig is a public React project.",
  sourceIds: ["s1"],
  actions: [{ type: "filter", target: "konfig" }],
};
const request = (
  key = "exact-a",
  guard = "react",
  scope = "en:revision:prompt:model",
) => ({
  key,
  guard,
  scope,
  vector,
  locale: "en",
  requestText: "  Show me React projects\n",
});

test("persistent caches save provider calls, isolate context, expire and coalesce across connections", async () => {
  await sql.unsafe(
    await readFile(
      new URL(
        "../packages/database/migrations/009-query-cache.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await sql`TRUNCATE knowledge_query_cache,knowledge_response_cache`;
  let embeddingCalls = 0,
    chatCalls = 0;
  const embed = async () => {
    embeddingCalls++;
    await new Promise((r) => setTimeout(r, 40));
    return { vectors: [vector], costUsd: 0.000002 };
  };
  const options = {
    message: "Show me React projects",
    model: "model",
    secret: "secret",
  };
  const first = await Promise.all(
    Array.from({ length: 3 }, () =>
      cache.cachedQueryEmbedding(sql, options, embed),
    ),
  );
  assert.equal(embeddingCalls, 1, "concurrent requests buy one vector");
  assert.equal(
    first.reduce((n, r) => n + r.costUsd, 0),
    0.000002,
  );
  assert.deepEqual(
    (await cache.cachedQueryEmbedding(sql, options, embed)).vector,
    vector,
  );
  assert.equal(embeddingCalls, 1, "new request reuses the persistent vector");
  await cache.cachedQueryEmbedding(sql, { ...options, model: "other" }, embed);
  assert.equal(embeddingCalls, 2);
  await sql`UPDATE knowledge_query_cache SET expires_at=now()-interval '1 second'`;
  await cache.cachedQueryEmbedding(sql, options, embed);
  assert.equal(embeddingCalls, 3);
  const generate = async () => {
    chatCalls++;
    await new Promise((r) => setTimeout(r, 40));
    return { raw, sources, costUsd: 0.002 };
  };
  const answers = await Promise.all(
    Array.from({ length: 3 }, () =>
      responses.resolveCachedAnswer(sql, request(), generate),
    ),
  );
  assert.equal(chatCalls, 1);
  assert.ok(answers.every((r) => r.answer.answer === raw.answer));
  const exact = await responses.findExactCachedAnswer(sql, request());
  assert.equal(exact.answer, raw.answer, "exact lookup needs no embedding");
  const semantic = await responses.resolveCachedAnswer(
    sql,
    {
      ...request("different-phrasing"),
      vector: vector.map((_, i) =>
        i === 0 ? 0.82 : i === 1 ? Math.sqrt(1 - 0.82 ** 2) : 0,
      ),
    },
    generate,
  );
  assert.equal(semantic.hit, "semantic");
  assert.equal(chatCalls, 1, "supported paraphrase saves chat generation");
  await responses.resolveCachedAnswer(
    sql,
    request("without-react", "without:react"),
    generate,
  );
  assert.equal(
    chatCalls,
    2,
    "opposite constraints never reuse despite identical vectors",
  );
  const far = {
    ...request("far-vector"),
    vector: vector.map((_, i) =>
      i === 0 ? 0.7 : i === 1 ? Math.sqrt(1 - 0.7 ** 2) : 0,
    ),
  };
  await responses.resolveCachedAnswer(sql, far, generate);
  assert.equal(chatCalls, 3, "guard alone cannot authorize semantic reuse");
  for (const scope of [
    "de:revision:prompt:model",
    "en:new-revision:prompt:model",
    "en:revision:new-prompt:model",
    "en:revision:prompt:new-model",
  ]) {
    assert.equal(
      await responses.findExactCachedAnswer(sql, { ...request(), scope }),
      null,
    );
    await responses.resolveCachedAnswer(sql, { ...request(), scope }, generate);
  }
  assert.equal(chatCalls, 7);
  await sql`UPDATE knowledge_response_cache SET expires_at=now()-interval '1 second'`;
  assert.equal(await responses.findExactCachedAnswer(sql, request()), null);
  await responses.resolveCachedAnswer(sql, request(), generate);
  assert.equal(chatCalls, 8);
  const [stored] =
    await sql`SELECT request_text FROM knowledge_query_cache WHERE key=${cache.queryCacheKey(options.message, options.model, options.secret)}`;
  assert.equal(
    stored.request_text,
    options.message,
    "original submitted text is retained with its vector",
  );
  const [answerRequest] =
    await sql`SELECT request_text FROM knowledge_response_cache WHERE key='exact-a' AND scope='en:revision:prompt:model'`;
  assert.equal(answerRequest.request_text, request().requestText);
});

test("bilingual service reuse preserves every approved intent despite identical embeddings", async () => {
  const router = loadTs(
    new URL("../packages/knowledge/src/openRouter.ts", import.meta.url),
  );
  const { answerKnowledge } = loadTs(
    new URL("../apps/web/src/server/knowledge/chat.ts", import.meta.url),
  );
  const { readKnowledgeCacheContext } = loadTs(
    new URL("../packages/knowledge/src/cacheContext.ts", import.meta.url),
  );
  const { KNOWLEDGE_CONSENT_VERSION } = loadTs(
    new URL("../packages/content/src/knowledgeConsent.ts", import.meta.url),
  );
  const original = {
    embed: router.embedKnowledgeWithUsage,
    request: router.routerRequest,
    price: router.verifyChatPrice,
    model: router.embeddingModel,
    secret: process.env.KNOWLEDGE_RATE_LIMIT_SECRET,
  };
  const secret = "bilingual-cache-isolation-test";
  process.env.KNOWLEDGE_RATE_LIMIT_SECRET = secret;
  let generated = 0;
  const providerQuestions = [];
  const providerEvidence = [];
  router.embeddingModel = () => "openai/text-embedding-3-small";
  // Worst case for false matches: every unrelated question has cosine similarity 1.
  router.embedKnowledgeWithUsage = async () => ({
    vectors: [vector],
    costUsd: 0,
  });
  router.verifyChatPrice = async () => {};
  router.routerRequest = async (_path, body) => {
    const { question, evidence } = JSON.parse(body.messages[1].content);
    providerQuestions.push(question);
    providerEvidence.push(evidence.map((source) => source.projectId));
    generated++;
    return {
      choices: [
        {
          message: {
            content: JSON.stringify({
              answer: `Generated answer ${generated}: ${question}`,
              sourceIds: ["s1"],
              actions: [],
            }),
          },
        },
      ],
      usage: { cost: 0 },
    };
  };
  const receipt = {
    version: KNOWLEDGE_CONSENT_VERSION,
    decidedAt: Date.now(),
    allowed: true,
    remember: false,
  };
  const ask = (message, locale, visitor) =>
    answerKnowledge(
      message,
      locale,
      visitor,
      AbortSignal.timeout(5000),
      receipt,
    );
  try {
    await sql`TRUNCATE knowledge_query_cache,knowledge_response_cache,knowledge_usage,knowledge_documents CASCADE`;
    await sql`INSERT INTO knowledge_documents(id,project_id,title,locale,href,hash,embedding_model) VALUES('doc','konfig','Konfig','en','/en/projects/konfig/case-study','bilingual-v1','openai/text-embedding-3-small')`;
    await sql`INSERT INTO knowledge_chunks(id,document_id,content,embedding) VALUES('chunk','doc','Published React and React Native project evidence.',${JSON.stringify(vector)}::vector)`;
    await sql`INSERT INTO knowledge_sync(id,synced_at) VALUES(1,now()) ON CONFLICT(id) DO UPDATE SET synced_at=now()`;
    await sql`UPDATE settings SET value='true' WHERE key='ai.enabled'`;
    await sql`UPDATE settings SET value='100' WHERE key IN ('ai.daily_budget_usd','ai.monthly_budget_usd','ai.visitor_per_minute')`;
    await sql`UPDATE settings SET value='1000' WHERE key IN ('ai.visitor_per_day','ai.global_per_minute','ai.global_per_day')`;
    const context = await readKnowledgeCacheContext(sql);
    const initial = publicQuestionGroups[0];
    const intent = cache.publicQuestionIntent(
      initial.phrases[0],
      initial.locale,
      context.projects,
    );
    const oldVersions = [
      "portfolio-answer-v1",
      "portfolio-answer-v2-strict-intents",
    ];
    for (const version of oldVersions) {
      const legacyScope = createHash("sha256")
        .update(
          JSON.stringify([
            initial.locale,
            context.revision,
            version,
            router.embeddingModel(),
            router.chatModel(),
          ]),
        )
        .digest("hex");
      // Even an old row with today's key and intent guard must not survive a rules change.
      await sql`INSERT INTO knowledge_response_cache(scope,key,guard,embedding,response,evidence,request_text) VALUES(${legacyScope},${cache.queryCacheKey(initial.phrases[0], router.embeddingModel(), secret)},${createHmac("sha256", secret).update(intent.signature).digest("hex")},${JSON.stringify(vector)}::vector,${sql.json({ ...raw, answer: "Old answer: must not be reused" })},${sql.json(sources)},${initial.phrases[0]})`;
    }
    const answers = new Set();
    for (const group of publicQuestionGroups) {
      const before = generated;
      const first = await ask(group.phrases[0], group.locale, group.name);
      assert.equal(
        generated,
        before + 1,
        `${group.name}: new intent generates`,
      );
      assert.equal(
        providerQuestions.at(-1),
        cache.publicQuestionIntent(
          group.phrases[0],
          group.locale,
          context.projects,
        ).question,
      );
      assert.ok(
        !answers.has(first.answer),
        `${group.name}: cannot inherit another intent or language`,
      );
      answers.add(first.answer);
      for (const phrase of [...group.phrases.slice(1), group.phrases[0]]) {
        assert.deepEqual(
          await ask(phrase, group.locale, group.name),
          first,
          phrase,
        );
        assert.equal(generated, before + 1, `${phrase}: approved alias reuses`);
      }
    }
    const [{ count: eligibleCount }] =
      await sql`SELECT count(*) FROM knowledge_response_cache`;
    assert.equal(
      Number(eligibleCount),
      publicQuestionGroups.length + oldVersions.length,
    );
    for (const [locale, phrases] of Object.entries(uncacheableQuestions)) {
      for (const phrase of phrases) {
        const before = generated;
        await ask(phrase, locale, `${locale}:${phrase}`);
        await ask(phrase, locale, `${locale}:${phrase}`);
        assert.equal(
          generated,
          before + 2,
          `${phrase}: neither exact nor semantic answer reuse`,
        );
        assert.equal(
          providerQuestions.at(-1),
          phrase,
          "qualified question reaches generation unchanged",
        );
      }
    }
    const [{ count: afterRejected }] =
      await sql`SELECT count(*) FROM knowledge_response_cache`;
    assert.equal(
      Number(afterRejected),
      Number(eligibleCount),
      "qualified requests never create shared answers",
    );
    await sql`INSERT INTO knowledge_documents(id,project_id,title,locale,href,hash,embedding_model) VALUES
      ('alias','konfig','Alpha','de','/de/projects/konfig/case-study','alias-v1','openai/text-embedding-3-small'),
      ('other','other-project','Alpha','de','/de/projects/other-project/case-study','other-v1','openai/text-embedding-3-small')`;
    await sql`INSERT INTO knowledge_chunks(id,document_id,content,embedding) VALUES
      ('alias-chunk','alias','Requested project evidence.',${JSON.stringify(vector)}::vector),
      ('other-chunk','other','Different project with an overlapping alias.',${JSON.stringify(vector)}::vector)`;
    await ask("What is Konfig?", "en", "unambiguous-project");
    assert.ok(
      providerQuestions.at(-1).includes("Konfig"),
      "canonical title stays unambiguous",
    );
    assert.deepEqual(
      [...new Set(providerEvidence.at(-1))],
      ["konfig"],
      "overview evidence belongs only to the resolved project",
    );
    await sql`INSERT INTO knowledge_documents(id,project_id,title,locale,href,hash,embedding_model) VALUES('ambiguous','other-konfig','Konfig','de','/de/projects/other-konfig/case-study','bilingual-v2','openai/text-embedding-3-small')`;
    const beforeAmbiguous = generated;
    await ask("Was ist Konfig?", "de", "ambiguous-project");
    await ask("Was ist Konfig?", "de", "ambiguous-project");
    assert.equal(
      generated,
      beforeAmbiguous + 2,
      "same title on different project IDs cannot share answers",
    );
    console.log(
      JSON.stringify({
        case: "bilingual false-match isolation",
        approvedGroups: publicQuestionGroups.length,
        approvedPhrases: publicQuestionGroups.reduce(
          (sum, group) => sum + group.phrases.length,
          0,
        ),
        rejectedPhrases: Object.values(uncacheableQuestions).reduce(
          (sum, phrases) => sum + phrases.length,
          0,
        ),
        embeddingSimilarity: 1,
      }),
    );
  } finally {
    router.embedKnowledgeWithUsage = original.embed;
    router.routerRequest = original.request;
    router.verifyChatPrice = original.price;
    router.embeddingModel = original.model;
    if (original.secret === undefined)
      delete process.env.KNOWLEDGE_RATE_LIMIT_SECRET;
    else process.env.KNOWLEDGE_RATE_LIMIT_SECRET = original.secret;
  }
});

test("failed, aborted and ungrounded results cannot poison persistent caches", async () => {
  await sql`TRUNCATE knowledge_query_cache,knowledge_response_cache`;
  const options = { message: "Failure test", model: "model", secret: "secret" };
  await assert.rejects(
    cache.cachedQueryEmbedding(sql, options, async () => {
      throw new Error("upstream");
    }),
    /upstream/,
  );
  const aborted = AbortSignal.abort();
  await assert.rejects(
    cache.cachedQueryEmbedding(
      sql,
      options,
      async () => {
        assert.fail("must not run");
      },
      aborted,
    ),
  );
  await cache.cachedQueryEmbedding(sql, options, async () => ({
    vectors: [vector],
    costUsd: 0,
  }));
  await assert.rejects(
    responses.resolveCachedAnswer(sql, request(), async () => {
      throw new Error("chat failed");
    }),
    /chat failed/,
  );
  for (let i = 0; i < 2; i++) {
    const result = await responses.resolveCachedAnswer(
      sql,
      request(),
      async () => ({
        raw: { answer: "Uncited", sourceIds: [] },
        sources,
        costUsd: 0,
      }),
    );
    assert.equal(result.answer, null);
    assert.equal(await responses.findExactCachedAnswer(sql, request()), null);
  }
  await responses.resolveCachedAnswer(sql, request(), async () => ({
    raw,
    sources,
    costUsd: 0,
  }));
  assert.ok(await responses.findExactCachedAnswer(sql, request()));
});

test("migration preserves legacy expiry and only renewed requests can replace textless entries", async () => {
  await sql`TRUNCATE knowledge_query_cache,knowledge_response_cache`;
  const input = { message: "Legacy query", model: "model", secret: "secret" };
  const key = cache.queryCacheKey(input.message, input.model, input.secret);
  await sql`INSERT INTO knowledge_query_cache(key,embedding,expires_at) VALUES(${key},${JSON.stringify(vector)}::vector,now()+interval '24 hours')`;
  await sql`INSERT INTO knowledge_response_cache(scope,key,guard,embedding,response,evidence,expires_at) VALUES(${request().scope},${request().key},${request().guard},${JSON.stringify(vector)}::vector,${sql.json(raw)},${sql.json(sources)},now()+interval '24 hours')`;
  const [before] =
    await sql`SELECT expires_at::text AS expiry FROM knowledge_query_cache`;
  await sql.unsafe(
    await readFile(
      new URL(
        "../packages/database/migrations/010-query-cache-retention.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const [after] =
    await sql`SELECT expires_at::text AS expiry,request_text FROM knowledge_query_cache`;
  assert.equal(
    after.expiry,
    before.expiry,
    "migration cannot extend data collected under an older notice",
  );
  assert.equal(after.request_text, null);
  assert.equal(await responses.findExactCachedAnswer(sql, request()), null);
  let embeddings = 0,
    answers = 0;
  await cache.cachedQueryEmbedding(sql, input, async () => {
    embeddings++;
    return { vectors: [vector], costUsd: 0 };
  });
  await responses.resolveCachedAnswer(sql, request(), async () => {
    answers++;
    return { raw, sources, costUsd: 0 };
  });
  assert.equal(embeddings, 1);
  assert.equal(answers, 1);
  const [replacement] =
    await sql`SELECT request_text,expires_at>=created_at+interval '1 year' AS retained FROM knowledge_query_cache`;
  assert.equal(replacement.request_text, input.message);
  assert.equal(replacement.retained, true);
});

test("cache storage outages do not discard successful paid work or call a provider twice", async () => {
  const input = { message: "Cache outage", model: "model", secret: "secret" };
  let embeddings = 0,
    answers = 0;
  const embed = async () => {
    embeddings++;
    return { vectors: [vector], costUsd: 0.000002 };
  };
  const generate = async () => {
    answers++;
    return { raw, sources, costUsd: 0.002 };
  };
  await sql`ALTER TABLE knowledge_query_cache RENAME TO unavailable_query_cache`;
  await sql`ALTER TABLE knowledge_response_cache RENAME TO unavailable_response_cache`;
  try {
    assert.deepEqual(
      (await cache.cachedQueryEmbedding(sql, input, embed)).vector,
      vector,
    );
    assert.equal(await responses.findExactCachedAnswer(sql, request()), null);
    assert.equal(
      (await responses.resolveCachedAnswer(sql, request(), generate)).answer
        .answer,
      raw.answer,
    );
    assert.equal(embeddings, 1);
    assert.equal(answers, 1);
  } finally {
    await sql`ALTER TABLE unavailable_query_cache RENAME TO knowledge_query_cache`;
    await sql`ALTER TABLE unavailable_response_cache RENAME TO knowledge_response_cache`;
  }
  await sql`TRUNCATE knowledge_query_cache,knowledge_response_cache`;
  await sql.unsafe(
    "CREATE OR REPLACE FUNCTION reject_cache_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'cache write unavailable'; END $$",
  );
  await sql.unsafe(
    "CREATE TRIGGER reject_query_write BEFORE INSERT ON knowledge_query_cache FOR EACH ROW EXECUTE FUNCTION reject_cache_write()",
  );
  await sql.unsafe(
    "CREATE TRIGGER reject_response_write BEFORE INSERT ON knowledge_response_cache FOR EACH ROW EXECUTE FUNCTION reject_cache_write()",
  );
  try {
    assert.deepEqual(
      (await cache.cachedQueryEmbedding(sql, input, embed)).vector,
      vector,
    );
    assert.equal(
      (await responses.resolveCachedAnswer(sql, request(), generate)).answer
        .answer,
      raw.answer,
    );
    assert.equal(
      embeddings,
      2,
      "failed cache write never retries an embedding",
    );
    assert.equal(answers, 2, "failed cache write never retries generation");
  } finally {
    await sql.unsafe(
      "DROP TRIGGER reject_query_write ON knowledge_query_cache",
    );
    await sql.unsafe(
      "DROP TRIGGER reject_response_write ON knowledge_response_cache",
    );
    await sql.unsafe("DROP FUNCTION reject_cache_write()");
  }
});

test("an aborted cache owner releases its lock without cancelling the next caller", async () => {
  await sql`TRUNCATE knowledge_query_cache`;
  const owner = new AbortController();
  let ready;
  const started = new Promise((resolve) => {
    ready = resolve;
  });
  const input = {
    message: "Owner cancellation",
    model: "model",
    secret: "secret",
  };
  const owned = cache.cachedQueryEmbedding(
    sql,
    input,
    async (_messages, signal) => {
      ready();
      await new Promise((_, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        }),
      );
      assert.fail("aborted provider cannot return a vector");
    },
    owner.signal,
  );
  const rejected = assert.rejects(owned);
  await started;
  const waiting = cache.cachedQueryEmbedding(
    sql,
    input,
    async () => ({ vectors: [vector], costUsd: 0.000002 }),
    AbortSignal.timeout(3000),
  );
  owner.abort(new Error("owner left"));
  await rejected;
  assert.deepEqual((await waiting).vector, vector);
});

test("cache keeps one year of raw requests despite capacity pressure and cleans expired entries while paused", async () => {
  await sql`TRUNCATE knowledge_query_cache,knowledge_response_cache`;
  const options = {
    message: "Retention test",
    rawMessage: "  Retention  test\n",
    model: "model",
    secret: "secret",
  };
  const embed = async () => ({ vectors: [vector], costUsd: 0 });
  await cache.cachedQueryEmbedding(sql, options, embed);
  const [before] =
    await sql`SELECT expires_at::text AS expiry,expires_at >= created_at+interval '1 year' AS retained,request_text FROM knowledge_query_cache`;
  assert.equal(before.retained, true);
  assert.equal(before.request_text, options.rawMessage);
  await cache.cachedQueryEmbedding(sql, options, embed);
  const [after] =
    await sql`SELECT expires_at::text AS expiry FROM knowledge_query_cache`;
  assert.equal(after.expiry, before.expiry);
  await sql`INSERT INTO knowledge_query_cache(key,embedding) SELECT 'seed-'||n,${JSON.stringify(vector)}::vector FROM generate_series(1,1005) n`;
  await cache.cachedQueryEmbedding(
    sql,
    { ...options, message: "Bounded storage" },
    embed,
  );
  const [queries] =
    await sql`SELECT count(*) AS count FROM knowledge_query_cache`;
  assert.equal(
    Number(queries.count),
    1007,
    "young entries must not be evicted by a size cap",
  );
  const generate = async () => ({ raw, sources, costUsd: 0 });
  await responses.resolveCachedAnswer(sql, request(), generate);
  const [responseBefore] =
    await sql`SELECT expires_at::text AS expiry,expires_at >= created_at+interval '1 year' AS retained,request_text FROM knowledge_response_cache`;
  assert.equal(responseBefore.retained, true);
  assert.equal(responseBefore.request_text, request().requestText);
  await responses.resolveCachedAnswer(sql, request("paraphrase"), generate);
  const [responseAfter] =
    await sql`SELECT expires_at::text AS expiry FROM knowledge_response_cache`;
  assert.equal(responseBefore.expiry, responseAfter.expiry);
  await sql`INSERT INTO knowledge_response_cache(scope,key,guard,embedding,response,evidence) SELECT 'seed-scope','seed-'||n,'guard',${JSON.stringify(vector)}::vector,${sql.json(raw)},${sql.json(sources)} FROM generate_series(1,1005) n`;
  await responses.resolveCachedAnswer(
    sql,
    request("new-answer", "new-guard"),
    generate,
  );
  const [answers] =
    await sql`SELECT count(*) AS count FROM knowledge_response_cache`;
  assert.equal(Number(answers.count), 1007);
  await sql`UPDATE settings SET value='false' WHERE key='ai.enabled'`;
  await sql`UPDATE knowledge_query_cache SET expires_at=now()-interval '1 second' WHERE key LIKE 'seed-%'`;
  await sql`UPDATE knowledge_response_cache SET expires_at=now()-interval '1 second' WHERE key LIKE 'seed-%'`;
  const { cleanupKnowledgeCache } = loadTs(
    new URL("../packages/knowledge/src/policy.ts", import.meta.url),
  );
  await cleanupKnowledgeCache();
  const [remaining] =
    await sql`SELECT (SELECT count(*) FROM knowledge_query_cache)+(SELECT count(*) FROM knowledge_response_cache) AS count`;
  assert.equal(
    Number(remaining.count),
    4,
    "daily pruning preserves all younger entries",
  );
});

test("concurrent replacements of different expired entries both persist without pruning deadlocks", async () => {
  await sql`TRUNCATE knowledge_query_cache`;
  const inputs = ["Expired A", "Expired B"].map((message) => ({
    message,
    model: "model",
    secret: "secret",
  }));
  for (const input of inputs)
    await sql`INSERT INTO knowledge_query_cache(key,embedding,expires_at) VALUES(${cache.queryCacheKey(input.message, input.model, input.secret)},${JSON.stringify(vector)}::vector,now()-interval '1 second')`;
  await sql.unsafe(
    "CREATE OR REPLACE FUNCTION delay_cache_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(0.1); RETURN NEW; END $$",
  );
  await sql.unsafe(
    "CREATE TRIGGER delay_cache_update BEFORE UPDATE ON knowledge_query_cache FOR EACH ROW EXECUTE FUNCTION delay_cache_update()",
  );
  let arrived = 0,
    release;
  const bothReady = new Promise((resolve) => {
    release = resolve;
  });
  try {
    await Promise.all(
      inputs.map((input) =>
        cache.cachedQueryEmbedding(
          sql,
          input,
          async () => {
            if (++arrived === 2) release();
            await bothReady;
            return { vectors: [vector], costUsd: 0 };
          },
          AbortSignal.timeout(5000),
        ),
      ),
    );
    const [stored] =
      await sql`SELECT count(*) AS count FROM knowledge_query_cache WHERE request_text IS NOT NULL AND expires_at>now()`;
    assert.equal(
      Number(stored.count),
      2,
      "both successful purchases must remain reusable",
    );
  } finally {
    await sql.unsafe(
      "DROP TRIGGER delay_cache_update ON knowledge_query_cache",
    );
    await sql.unsafe("DROP FUNCTION delay_cache_update()");
  }
});

test("both real services share vectors, skip generation on response hits, and enforce consent/quotas on hits", async () => {
  const router = loadTs(
    new URL("../packages/knowledge/src/openRouter.ts", import.meta.url),
  );
  const usage = loadTs(
    new URL("../packages/knowledge/src/usage.ts", import.meta.url),
  );
  const privacy = loadTs(
    new URL("../packages/content/src/knowledgeConsent.ts", import.meta.url),
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
  await sql`TRUNCATE knowledge_query_cache,knowledge_response_cache,knowledge_usage,knowledge_documents CASCADE`;
  await sql`INSERT INTO knowledge_documents(id,project_id,title,locale,href,hash,embedding_model) VALUES('doc','konfig','Konfig','en','/en/projects/konfig/case-study','revision-a','openai/text-embedding-3-small')`;
  await sql`INSERT INTO knowledge_chunks(id,document_id,content,embedding) VALUES('chunk','doc','Public React project.',${JSON.stringify(vector)}::vector)`;
  await sql`INSERT INTO knowledge_sync(id,synced_at) VALUES(1,now()) ON CONFLICT(id) DO UPDATE SET synced_at=now()`;
  await sql`UPDATE settings SET value='true' WHERE key='ai.enabled'`;
  await sql`UPDATE settings SET value='100' WHERE key IN ('ai.visitor_per_minute','ai.visitor_per_day','ai.global_per_minute')`;
  let embeddingCalls = 0,
    chatCalls = 0;
  const previous = {
    embed: router.embedKnowledgeWithUsage,
    oldEmbed: router.embedKnowledge,
    request: router.routerRequest,
    price: router.verifyChatPrice,
    secret: process.env.KNOWLEDGE_RATE_LIMIT_SECRET,
  };
  process.env.KNOWLEDGE_RATE_LIMIT_SECRET = "isolated-test-secret";
  router.embeddingModel = () => "openai/text-embedding-3-small";
  router.embedKnowledgeWithUsage = async () => {
    embeddingCalls++;
    return { vectors: [vector], costUsd: 0.000002 };
  };
  router.embedKnowledge = async () => {
    embeddingCalls++;
    return [vector];
  };
  router.verifyChatPrice = async () => {};
  router.routerRequest = async () => {
    chatCalls++;
    return {
      choices: [{ message: { content: JSON.stringify(raw) } }],
      usage: { cost: 0.002 },
    };
  };
  const receipt = {
    version: privacy.KNOWLEDGE_CONSENT_VERSION,
    decidedAt: Date.now(),
    allowed: true,
    remember: false,
  };
  const ask = (message, consent = receipt) =>
    answerKnowledge(
      message,
      "en",
      "test-visitor",
      AbortSignal.timeout(5000),
      consent,
    );
  try {
    assert.deepEqual(
      await searchKnowledgeProjects(
        "Show me React projects",
        "test-visitor",
        undefined,
        receipt,
      ),
      ["konfig"],
    );
    assert.equal(embeddingCalls, 1);
    assert.equal((await ask("Show me React projects")).answer, raw.answer);
    assert.equal(
      embeddingCalls,
      1,
      "landing assistant reuses project-search vector",
    );
    assert.equal(chatCalls, 1);
    await ask("Show me React projects");
    assert.equal(embeddingCalls, 1, "exact response hit buys no new vector");
    assert.equal(chatCalls, 1, "exact response hit buys no chat answer");
    const [hitUsage] =
      await sql`SELECT amount_micro_usd FROM knowledge_usage ORDER BY created_at DESC LIMIT 1`;
    assert.equal(
      Number(hitUsage.amount_micro_usd),
      0,
      "cache hit is accounted with zero provider cost",
    );
    await ask("Find React projects");
    assert.equal(embeddingCalls, 2);
    assert.equal(
      chatCalls,
      1,
      "semantic response hit only buys a new query vector",
    );
    await ask("Projects without React");
    assert.equal(chatCalls, 2);
    await sql`UPDATE knowledge_documents SET hash='revision-b' WHERE id='doc'`;
    await ask("Show me React projects");
    assert.equal(
      chatCalls,
      3,
      "content changes invalidate responses, not query vectors",
    );
    await assert.rejects(
      ask("Show me React projects", { ...receipt, version: "2026-11-16.2" }),
      /consent/i,
    );
    await assert.rejects(
      ask("Show me React projects", { ...receipt, scope: "search" }),
      /consent/i,
    );
    await sql`UPDATE settings SET value='0' WHERE key='ai.visitor_per_minute'`;
    await assert.rejects(
      ask("Show me React projects"),
      usage.KnowledgeQuotaError,
    );
    assert.equal(chatCalls, 3);
    console.log(
      JSON.stringify({
        case: "five assistant requests plus project search",
        embeddingCalls,
        chatCalls,
        uncachedEmbeddingCalls: 6,
        uncachedChatCalls: 5,
      }),
    );
  } finally {
    router.embedKnowledgeWithUsage = previous.embed;
    router.embedKnowledge = previous.oldEmbed;
    router.routerRequest = previous.request;
    router.verifyChatPrice = previous.price;
    if (previous.secret === undefined)
      delete process.env.KNOWLEDGE_RATE_LIMIT_SECRET;
    else process.env.KNOWLEDGE_RATE_LIMIT_SECRET = previous.secret;
  }
});
