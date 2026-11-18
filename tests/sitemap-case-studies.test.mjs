import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { loadTs } from "./helpers/load-ts.mjs";

const source = new URL("../apps/web/src/app/sitemap.ts", import.meta.url);
const origin = "https://fuerst.one";
const studyId = "11111111-1111-4111-8111-111111111111";
const project = (id, availableLocales, caseStudyIds) => ({
  id,
  name: id,
  description: { rich_text: [{ plain_text: "Published project description" }] },
  kpis: { rich_text: [] },
  availableLocales,
  caseStudyIds,
});

async function sitemapFor(projects) {
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(source, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  new Function("exports", "require", outputText)(exports, (name) => {
    if (name === "../server/content/getCachedCvProjects")
      return { getCachedCvProjects: async () => projects };
    if (name.startsWith("@homepage/content/"))
      return loadTs(
        new URL(
          `../packages/content/src/${name.split("/").at(-1)}.ts`,
          import.meta.url,
        ),
      );
    return loadTs(new URL(`${name}.ts`, source));
  });
  return exports.default();
}

test("sitemap includes published case studies with reciprocal case-study language URLs", async () => {
  const entries = await sitemapFor([
    project("bilingual", ["en", "de"], { en: studyId, de: studyId }),
  ]);
  const studies = entries.filter(({ url }) => url.endsWith("/case-study"));
  assert.equal(studies.length, 2);
  for (const entry of studies) {
    assert.deepEqual(entry.alternates.languages, {
      en: `${origin}/en/projects/bilingual-bilingual/case-study`,
      de: `${origin}/de/projects/bilingual-bilingual/case-study`,
      "x-default": `${origin}/en/projects/bilingual-bilingual/case-study`,
    });
    assert.ok(Object.values(entry.alternates.languages).includes(entry.url));
    assert.ok(
      entries.some(({ url }) => url === entry.url.replace(/\/case-study$/, "")),
    );
  }
});

test("sitemap excludes missing case studies and unpublished project translations", async () => {
  const entries = await sitemapFor([
    project("english", ["en", "de"], { en: studyId, de: null }),
    project("untranslated", ["en"], { en: studyId, de: studyId }),
    project("absent", ["en", "de"], { en: null, de: null }),
  ]);
  const studies = entries.filter(({ url }) => url.endsWith("/case-study"));
  assert.deepEqual(
    studies.map(({ url }) => url),
    [
      `${origin}/en/projects/english-english/case-study`,
      `${origin}/en/projects/untranslated-untranslated/case-study`,
    ],
  );
  for (const entry of studies) {
    assert.deepEqual(entry.alternates.languages, {
      en: entry.url,
      "x-default": entry.url,
    });
  }
});

test("a German-only published case study uses its published URL as x-default", async () => {
  const entries = await sitemapFor([
    project("german", ["en", "de"], { en: null, de: studyId }),
  ]);
  const studies = entries.filter(({ url }) => url.endsWith("/case-study"));
  assert.equal(studies.length, 1);
  assert.deepEqual(studies[0].alternates.languages, {
    de: studies[0].url,
    "x-default": studies[0].url,
  });
});

test("sitemap freshness follows source edits and keeps each case-study language independent", async () => {
  const published = {
    ...project("dated", ["en", "de"], { en: studyId, de: studyId }),
    updatedAt: "2026-11-16T10:00:00.000Z",
    caseStudyUpdatedAt: {
      en: "2026-11-17T10:00:00.000Z",
      de: "2026-11-18T10:00:00.000Z",
    },
  };
  const entries = await sitemapFor([published]);
  const url = `${origin}/en/projects/dated-dated`;
  assert.equal(
    entries.find((e) => e.url === url).lastModified,
    published.updatedAt,
  );
  assert.equal(
    entries.find((e) => e.url === `${url}/case-study`).lastModified,
    published.caseStudyUpdatedAt.en,
  );
  assert.equal(
    entries.find((e) => e.url === `${url.replace("/en/", "/de/")}/case-study`)
      .lastModified,
    published.caseStudyUpdatedAt.de,
  );
  assert.equal(
    entries.find((e) => e.url === `${origin}/en`).lastModified,
    undefined,
  );
  const legacy = await sitemapFor([project("legacy", ["en"], { en: studyId })]);
  assert.ok(legacy.every((entry) => entry.lastModified === undefined));
});
