import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const { renderToStaticMarkup } = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
)("react-dom/server");
import ts from "typescript";
import { loadTs } from "./helpers/load-ts.mjs";

function loadModule(path, dependencies = {}) {
  const url = new URL(path, import.meta.url);
  const require = createRequire(url);
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(url, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  new Function("exports", "require", outputText)(exports, (name) => {
    if (name in dependencies) return dependencies[name];
    if (name === "@/server/siteFeatures")
      return loadTs(
        new URL("../apps/web/src/server/siteFeatures.ts", import.meta.url),
      );
    return require(name);
  });
  return exports;
}

function withFlags(publicFlag, serverFlag, run) {
  const previous = { ...process.env };
  process.env.NEXT_PUBLIC_KNOWLEDGE_ASSISTANT_ENABLED = publicFlag;
  process.env.KNOWLEDGE_ASSISTANT_ENABLED = serverFlag;
  // Dummy prerequisites, never used for network requests in these tests.
  process.env.KNOWLEDGE_DATABASE_URL = "test-db";
  process.env.OPENROUTER_API_KEY = "test-key";
  return Promise.resolve()
    .then(run)
    .finally(() => {
      process.env = previous;
    });
}

for (const [locale, page] of [
  ["en", "privacy"],
  ["de", "datenschutz"],
]) {
  for (const flags of [
    ["false", "false"],
    ["true", "false"],
    ["false", "true"],
  ]) {
    test(`${locale} privacy excludes disabled AI processing with flags ${flags.join("/")}`, () =>
      withFlags(...flags, () => {
        const { default: Page } = loadModule(
          `../apps/web/src/app/[locale]/(chrome)/(legal)/${page}/page.tsx`,
        );
        const html = renderToStaticMarkup(Page());
        assert.doesNotMatch(html, /id="ai-assistant"|OpenRouter|OpenAI/);
        assert.doesNotMatch(html, /assistant usage data|KI-Nutzungsdaten/);
        assert.match(html, /Vercel/);
        assert.match(html, /Notion/);
        assert.match(html, /Plasma/);
        assert.match(html, /alexander@fuerst.one/);
        assert.doesNotMatch(html, /type="checkbox"/);
      }));
  }
  test(`${locale} privacy explains enabled AI and actual storage without future collection purposes`, () =>
    withFlags("true", "true", () => {
      const { default: Page } = loadModule(
        `../apps/web/src/app/[locale]/(chrome)/(legal)/${page}/page.tsx`,
      );
      const html = renderToStaticMarkup(Page());
      assert.match(html, /id="ai-assistant"/);
      assert.match(html, /OpenRouter/);
      assert.match(html, /OpenAI/);
      assert.match(html, /180/);
      assert.match(html, /35/);
      assert.match(
        html,
        locale === "en"
          ? /does not store questions or answers/
          : /speichert keine Fragen oder Antworten/,
      );
    }));
}

for (const flags of [
  ["false", "false"],
  ["true", "false"],
  ["false", "true"],
]) {
  test(`disabled assistant endpoints reject work before processing with flags ${flags.join("/")}`, () =>
    withFlags(...flags, async () => {
      let probes = 0;
      const dependencies = {
        "next/server": {
          NextResponse: {
            json: (body, options = {}) => Response.json(body, options),
          },
          after: () => {
            probes++;
          },
        },
        "../../../server/knowledge/availability": {
          knowledgeAvailability: () => ({
            status: () => ({ available: true, verified: true, retryAt: 0 }),
          }),
          probeKnowledgeServices: () => {
            probes++;
          },
        },
        "@homepage/content/knowledge": loadTs(
          new URL("../packages/content/src/knowledge.ts", import.meta.url),
        ),
        "@/lib/knowledgeConsent": loadTs(
          new URL("../apps/web/src/lib/knowledgeConsent.ts", import.meta.url),
        ),
        "../../../lib/knowledgeFallback": {},
        "../../../server/knowledge/chat": {
          answerKnowledge: () => {
            probes++;
          },
        },
        "@homepage/knowledge/usage": {
          KnowledgeQuotaError: class extends Error {},
        },
      };
      dependencies["../../../../server/knowledge/availability"] =
        dependencies["../../../server/knowledge/availability"];
      const status = loadModule(
        "../apps/web/src/app/api/assistant/status/route.ts",
        dependencies,
      );
      const result = status.GET();
      assert.equal((await result.json()).available, false);
      assert.equal(result.headers.get("cache-control"), "no-store");
      const route = loadModule(
        "../apps/web/src/app/api/assistant/route.ts",
        dependencies,
      );
      const request = new Request("http://localhost/api/assistant", {
        method: "POST",
        headers: {
          origin: "http://localhost",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: "Do not process this question",
          locale: "en",
        }),
      });
      request.nextUrl = new URL(request.url);
      assert.equal((await route.POST(request)).status, 503);
      assert.equal(probes, 0);
    }));
}
