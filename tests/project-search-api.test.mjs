import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { loadTs } from "./helpers/load-ts.mjs";

const privacy = loadTs(
  new URL("../packages/content/src/knowledgeConsent.ts", import.meta.url),
);
const consent = () => ({
  version: privacy.KNOWLEDGE_CONSENT_VERSION,
  decidedAt: Date.now(),
  allowed: true,
  remember: false,
});

test("search permission cannot authorize answer generation, while assistant permission includes retrieval", () => {
  const core = loadTs(
    new URL("../packages/content/src/knowledge.ts", import.meta.url),
  );
  const receipt = { ...consent(), scope: "search" };
  assert.equal(privacy.parseKnowledgeConsent(receipt), null);
  assert.deepEqual(
    privacy.parseKnowledgeConsent(receipt, Date.now(), "search"),
    receipt,
  );
  const input = { message: "public query", locale: "en", consent: receipt };
  assert.equal(core.parseKnowledgeRequest(input), null);
  assert.ok(core.parseKnowledgeRequest(input, "search"));
  assert.ok(
    core.parseKnowledgeRequest({ ...input, consent: consent() }, "search"),
  );
});

test("production browsers register semantic search with BotID admission", () => {
  const previousWindow = globalThis.window;
  const previousFlag = process.env.NEXT_PUBLIC_KNOWLEDGE_ASSISTANT_ENABLED;
  globalThis.window = { location: { hostname: "fuerst.one" } };
  process.env.NEXT_PUBLIC_KNOWLEDGE_ASSISTANT_ENABLED = "true";
  let protectedRoutes = [];
  try {
    loadModule("../apps/web/src/instrumentation-client.ts", {
      "botid/client/core": {
        initBotId: (options) => {
          protectedRoutes = options.protect;
        },
      },
    });
    assert.ok(
      protectedRoutes.some(
        (route) =>
          route.path === "/api/projects/search" && route.method === "POST",
      ),
    );
  } finally {
    globalThis.window = previousWindow;
    if (previousFlag === undefined)
      delete process.env.NEXT_PUBLIC_KNOWLEDGE_ASSISTANT_ENABLED;
    else process.env.NEXT_PUBLIC_KNOWLEDGE_ASSISTANT_ENABLED = previousFlag;
  }
});

test("embedding responses preserve usage cost and validate vectors before search", async () => {
  const router = loadTs(
    new URL("../packages/knowledge/src/openRouter.ts", import.meta.url),
  );
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test-key";
  let data = {
    data: [{ index: 0, embedding: Array(1536).fill(0.1) }],
    usage: { cost: 0.000002 },
  };
  globalThis.fetch = async () => Response.json(data);
  try {
    assert.equal(
      (await router.embedKnowledgeWithUsage(["public search"])).costUsd,
      0.000002,
    );
    assert.equal(
      (await router.embedKnowledge(["public search"]))[0].length,
      1536,
    );
    data.usage.cost = -1;
    assert.equal(
      (await router.embedKnowledgeWithUsage(["public search"])).costUsd,
      undefined,
    );
    data.data[0].embedding = [0.1];
    await assert.rejects(
      router.embedKnowledgeWithUsage(["public search"]),
      /Invalid embedding vector/,
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});
function loadModule(file, dependencies) {
  const { outputText } = ts.transpileModule(
    readFileSync(new URL(file, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  );
  const exports = {};
  new Function("exports", "require", outputText)(
    exports,
    (name) => dependencies[name] ?? loadTs(import.meta.resolve(name)),
  );
  return exports;
}

function service({ fresh = true, denied = false, fail = false } = {}) {
  const calls = [];
  const dependencies = {
    "node:crypto": {
      createHmac: () => ({
        update: () => ({ digest: () => "hashed-visitor" }),
      }),
    },
    "@homepage/database/database": {
      knowledgeDatabase: () => (strings) => ({
        signal: async (signal) => {
          signal?.throwIfAborted();
          return strings.join("").includes("knowledge_sync")
            ? [{ fresh }]
            : [{ project_id: "atlas" }, { project_id: "studio" }];
        },
      }),
    },
    "@homepage/knowledge/openRouter": {
      embeddingModel: () => "openai/text-embedding-3-small",
      embedKnowledgeWithUsage: async (_input, signal) => {
        signal?.throwIfAborted();
        calls.push("embedding");
        if (fail) throw new Error("Provider unavailable");
        return { vectors: [Array(1536).fill(0.1)], costUsd: 0.000002 };
      },
    },
    "@homepage/knowledge/usage": {
      reserveKnowledgeUsage: async (_visitor, _indexer, _signal, receipt) => {
        assert.equal(receipt.allowed, true);
        if (denied) throw new Error("Allowance reached");
        return "reservation";
      },
      finishKnowledgeUsage: async (_id, cost, failed) => {
        calls.push({ cost, failed });
      },
    },
  };
  return {
    calls,
    ...loadModule(
      "../apps/web/src/server/knowledge/projectSearch.ts",
      dependencies,
    ),
  };
}

test("semantic project search returns ranked project IDs using embeddings without a chat model", async () => {
  const previous = process.env.KNOWLEDGE_RATE_LIMIT_SECRET;
  process.env.KNOWLEDGE_RATE_LIMIT_SECRET = "test-secret";
  try {
    const { searchKnowledgeProjects, calls } = service();
    assert.deepEqual(
      await searchKnowledgeProjects(
        "help people choose",
        "local",
        undefined,
        consent(),
      ),
      ["atlas", "studio"],
    );
    assert.deepEqual(calls, ["embedding", { cost: 0.000002, failed: false }]);
  } finally {
    if (previous === undefined) delete process.env.KNOWLEDGE_RATE_LIMIT_SECRET;
    else process.env.KNOWLEDGE_RATE_LIMIT_SECRET = previous;
  }
});

test("stale sources and exhausted allowance do not send a query to a provider", async () => {
  const previous = process.env.KNOWLEDGE_RATE_LIMIT_SECRET;
  process.env.KNOWLEDGE_RATE_LIMIT_SECRET = "test-secret";
  try {
    for (const options of [{ fresh: false }, { denied: true }]) {
      const { searchKnowledgeProjects, calls } = service(options);
      await assert.rejects(
        searchKnowledgeProjects(
          "help people choose",
          "local",
          undefined,
          consent(),
        ),
      );
      assert.deepEqual(calls, []);
    }
  } finally {
    if (previous === undefined) delete process.env.KNOWLEDGE_RATE_LIMIT_SECRET;
    else process.env.KNOWLEDGE_RATE_LIMIT_SECRET = previous;
  }
});

test("failed embedding requests retain their budget reservation", async () => {
  const previous = process.env.KNOWLEDGE_RATE_LIMIT_SECRET;
  process.env.KNOWLEDGE_RATE_LIMIT_SECRET = "test-secret";
  try {
    const { searchKnowledgeProjects, calls } = service({ fail: true });
    await assert.rejects(
      searchKnowledgeProjects(
        "help people choose",
        "local",
        undefined,
        consent(),
      ),
    );
    assert.deepEqual(calls, ["embedding", { cost: undefined, failed: true }]);
  } finally {
    if (previous === undefined) delete process.env.KNOWLEDGE_RATE_LIMIT_SECRET;
    else process.env.KNOWLEDGE_RATE_LIMIT_SECRET = previous;
  }
});

function route({ enabled = true, admitted = true } = {}) {
  const calls = [];
  return {
    calls,
    ...loadModule("../apps/web/src/app/api/projects/search/route.ts", {
      "next/server": {
        NextResponse: { json: (body, options) => Response.json(body, options) },
        after: () => {},
      },
      "@homepage/content/knowledge": loadTs(
        new URL("../packages/content/src/knowledge.ts", import.meta.url),
      ),
      "@/lib/knowledgeConsent": privacy,
      "@/server/siteFeatures": {
        getSiteFeatures: () => ({ assistantEnabled: enabled }),
      },
      "@/server/knowledge/admission": {
        getKnowledgeAdmission: async () => ({ allowed: admitted }),
        knowledgeClientAddress: () => "local",
      },
      "@homepage/knowledge/usage": {
        KnowledgeQuotaError: class extends Error {},
      },
      "@homepage/knowledge/policy": {
        recordKnowledgeAdmission: async () => {},
      },
      "@/server/knowledge/projectSearch": {
        searchKnowledgeProjects: async () => {
          calls.push("search");
          return ["atlas"];
        },
      },
    }),
  };
}
const request = (body, headers = {}) => {
  const req = new Request("http://localhost/api/projects/search", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  req.nextUrl = new URL(req.url);
  return req;
};

test("project search rejects missing consent, foreign origins and oversized queries before retrieval", async () => {
  const { POST, calls } = route();
  for (const [input, headers, status] of [
    [{ message: "product choices", locale: "en" }, {}, 428],
    [
      { message: "product choices", locale: "en", consent: consent() },
      { origin: "https://other.invalid" },
      403,
    ],
    [{ message: "x".repeat(1001), locale: "en", consent: consent() }, {}, 400],
    [{ message: "x".repeat(6000), locale: "en", consent: consent() }, {}, 413],
  ])
    assert.equal((await POST(request(input, headers))).status, status);
  assert.deepEqual(calls, []);
});

test("project search rejects declined, expired and outdated permission before retrieval", async () => {
  const { POST, calls } = route();
  for (const receipt of [
    { ...consent(), allowed: false },
    {
      ...consent(),
      decidedAt: Date.now() - privacy.KNOWLEDGE_CONSENT_TTL - 1000,
    },
    { ...consent(), version: "outdated" },
  ]) {
    const response = await POST(
      request({ message: "product choices", locale: "en", consent: receipt }),
    );
    assert.equal(response.status, 428);
  }
  assert.deepEqual(calls, []);
});

test("project search preserves release switches and admission without paid fallback work", async () => {
  for (const options of [{ enabled: false }, { admitted: false }]) {
    const { POST, calls } = route(options);
    const response = await POST(
      request({ message: "product choices", locale: "de", consent: consent() }),
    );
    assert.equal(response.status, 503);
    assert.deepEqual(calls, []);
  }
  const { POST } = route();
  const response = await POST(
    request({ message: "product choices", locale: "en", consent: consent() }),
  );
  assert.deepEqual(await response.json(), { projectIds: ["atlas"] });
  assert.equal(response.headers.get("cache-control"), "no-store");
});
