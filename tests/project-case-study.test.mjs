import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const source = new URL(
  "../packages/content/src/projectCaseStudy.ts",
  import.meta.url,
);
const getHelpers = () => {
  assert.ok(existsSync(source), "Case study publication helpers must exist");
  return loadTs(source);
};
const en = "11111111-1111-4111-8111-111111111111";
const de = "22222222-2222-4222-8222-222222222222";

test("case studies use the requested language and do not substitute an unpublished translation", () => {
  const { caseStudyPageId } = getHelpers();
  const project = {
    caseStudyEn: `https://www.notion.so/${en.replaceAll("-", "")}`,
    caseStudyDe: `https://app.notion.com/p/workspace/Case-study-${de}?pvs=25`,
  };
  assert.equal(caseStudyPageId(project, "en"), en);
  assert.equal(caseStudyPageId(project, "de"), de);
  assert.equal(caseStudyPageId({ ...project, caseStudyDe: null }, "de"), null);
  for (const value of [
    "",
    "javascript:alert(1)",
    `https://example.com/${en}`,
    `https://notion.so.evil.test/${en}`,
  ])
    assert.equal(caseStudyPageId({ caseStudyEn: value }, "en"), null);
});

test("rich text links reject executable schemes and image proxy sources are restricted to Notion storage", () => {
  const { safeCaseStudyLink, safeCaseStudyImage } = getHelpers();
  assert.equal(
    safeCaseStudyLink("https://example.com/page"),
    "https://example.com/page",
  );
  assert.equal(
    safeCaseStudyLink("mailto:hello@example.com"),
    "mailto:hello@example.com",
  );
  assert.equal(safeCaseStudyLink("javascript:alert(1)"), null);
  assert.equal(safeCaseStudyImage("http://127.0.0.1/private"), null);
  assert.equal(safeCaseStudyImage("https://example.com/image.png"), null);
  assert.equal(
    safeCaseStudyImage(
      "https://prod-files-secure.s3.us-west-2.amazonaws.com/image.png",
    ),
    "https://prod-files-secure.s3.us-west-2.amazonaws.com/image.png",
  );
});

test("references to public projects stay on the site and private Notion links are not published", () => {
  const { publicCaseStudyLink } = getHelpers();
  const links = { [en]: "/en/projects/example" };
  assert.equal(
    publicCaseStudyLink(`https://www.notion.so/${en}`, links),
    "/en/projects/example",
  );
  assert.equal(publicCaseStudyLink(`https://www.notion.so/${de}`, links), null);
  assert.equal(
    publicCaseStudyLink("https://github.com/example", links),
    "https://github.com/example",
  );
});

test("Notion content paginates, preserves nested lists and never expands child pages", async () => {
  const blockSource = new URL(
    "../apps/sync/src/notion/caseStudyBlocks.ts",
    import.meta.url,
  );
  assert.ok(existsSync(blockSource), "Notion case study reader must exist");
  const { loadCaseStudyBlocks } = loadTs(blockSource);
  const text = (value) => [{ plain_text: value, annotations: {}, href: null }];
  const calls = [];
  const list = async (id, cursor) => {
    calls.push([id, cursor]);
    if (id === "list")
      return {
        results: [
          {
            id: "nested",
            type: "paragraph",
            paragraph: { rich_text: text("Nested item") },
          },
        ],
        has_more: false,
        next_cursor: null,
      };
    if (cursor)
      return {
        results: [
          {
            id: "image",
            type: "image",
            image: {
              type: "file",
              file: { url: "https://secure.notion-static.com/image.jpg" },
              caption: text("CAD rendering"),
            },
          },
        ],
        has_more: false,
        next_cursor: null,
      };
    return {
      results: [
        {
          id: "heading",
          type: "heading_2",
          heading_2: { rich_text: text("Design") },
        },
        {
          id: "list",
          type: "bulleted_list_item",
          bulleted_list_item: { rich_text: text("Parent") },
          has_children: true,
        },
        {
          id: "private",
          type: "child_page",
          child_page: { title: "Private notes" },
          has_children: true,
        },
      ],
      has_more: true,
      next_cursor: "next",
    };
  };
  const blocks = await loadCaseStudyBlocks(list, "case-page");
  assert.deepEqual(calls, [
    ["case-page", undefined],
    ["list", undefined],
    ["case-page", "next"],
  ]);
  assert.deepEqual(
    blocks.map((block) => block.type),
    ["heading_2", "bulleted_list_item", "image"],
  );
  assert.equal(blocks[1].children[0].richText[0].plain_text, "Nested item");
  assert.equal(blocks[2].caption[0].plain_text, "CAD rendering");
});
