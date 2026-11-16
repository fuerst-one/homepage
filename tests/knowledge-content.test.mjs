import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { publicKnowledgeSeeds } = loadTs(
  new URL("../apps/sync/src/knowledge/publicContent.ts", import.meta.url),
);
const text = (value) => ({ rich_text: [{ plain_text: value }] });
const page = {
  id: "project-1",
  last_edited_time: "2026-11-16T10:00:00Z",
  properties: {
    Hidden: { checkbox: false },
    Name: { title: [{ plain_text: "A public project" }] },
    "Project Description": text("A documented product and its workflow."),
    "Evidence Gaps": text("INTERNAL NOTES"),
    "Case study EN": {
      url: "https://notion.so/A-case-123456789012345678901234567890ab",
    },
  },
};
test("only explicitly visible, non-archived projects become knowledge", () => {
  assert.equal(publicKnowledgeSeeds(page, "public-project").length, 1);
  assert.deepEqual(
    publicKnowledgeSeeds({ ...page, archived: true }, "public-project"),
    [],
  );
  assert.deepEqual(
    publicKnowledgeSeeds(
      {
        ...page,
        properties: { ...page.properties, Hidden: { checkbox: true } },
      },
      "public-project",
    ),
    [],
  );
  assert.deepEqual(
    publicKnowledgeSeeds(
      { ...page, properties: { ...page.properties, Hidden: undefined } },
      "public-project",
    ),
    [],
  );
});
test("public knowledge excludes private fields and respects linked case publication and locale", () => {
  const [seed] = publicKnowledgeSeeds(page, "public-project");
  assert.equal(seed.caseStudyId, "12345678-9012-3456-7890-1234567890ab");
  assert.equal(seed.href, "/en/projects/public-project");
  assert.ok(!seed.text.includes("INTERNAL NOTES"));
  assert.equal(seed.locale, "en");
  const [unlinked] = publicKnowledgeSeeds(
    {
      ...page,
      properties: { ...page.properties, "Case study EN": { url: null } },
    },
    "public-project",
  );
  assert.equal(unlinked.caseStudyId, null);
});
test("German drafts stay private until prose and existing KPI translations are ready", () => {
  const properties = {
    ...page.properties,
    "German ready": { checkbox: true },
    "Project Description DE": text("GERMAN DRAFT"),
    KPIs: text("English outcomes"),
  };
  assert.equal(
    publicKnowledgeSeeds({ ...page, properties }, "public-project").length,
    1,
  );
  assert.equal(
    publicKnowledgeSeeds(
      {
        ...page,
        properties: { ...properties, "KPIs DE": text("German outcomes") },
      },
      "public-project",
    ).length,
    2,
  );
});
