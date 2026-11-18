import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { preparePublication } = loadTs(
  new URL("../apps/sync/src/notion/preparePublication.ts", import.meta.url),
);
const rich = (text) => ({
  id: "private-property",
  type: "rich_text",
  rich_text: [
    {
      type: "mention",
      plain_text: text,
      mention: { user: { id: "private-person" } },
      href: null,
      annotations: { bold: true },
      text: { content: text },
    },
  ],
});
const fixture = () => ({
  projects: [
    {
      id: "public",
      name: "Project",
      hidden: false,
      description: rich("English"),
      kpis: rich("Result"),
      descriptionDe: rich("Deutsch"),
      kpisDe: rich("Ergebnis"),
      germanReady: true,
      clients: [
        {
          id: "client",
          name: "Client",
          email: "private@example.invalid",
          address: "private",
          url: "https://example.com",
          contacts: ["private"],
        },
      ],
      references: ["private"],
      position3d: [0, 0, 0],
      tools: [],
      industries: [],
      capabilities: [],
      languages: [],
    },
    { id: "hidden", name: "Hidden", hidden: true },
  ],
  owner: {
    name: "Owner",
    email: "public@example.com",
    address: {
      street: "Public street",
      zip: "1",
      city: "City",
      country: "Country",
    },
    phone: "private-phone",
    dailyRate: 999,
    german: { position: "Deutsch" },
    position: "English",
  },
  icons: { public: "code", hidden: "secret" },
  cases: [
    { id: "public", caseStudy: { summary: "Public" } },
    { id: "hidden", caseStudy: { summary: "Private" } },
  ],
  copy: [{ key: "title", en: "Title", de: "Titel" }],
  studies: {},
  assets: {},
});

test("the worker publishes explicit public fields and locale variants before persistence", () => {
  const result = preparePublication(fixture());
  assert.equal(result.version, 3);
  assert.deepEqual(
    result.locales.en.projects.map((p) => p.id),
    ["public"],
  );
  assert.equal(
    result.locales.de.projects[0].description.rich_text[0].plain_text,
    "Deutsch",
  );
  assert.equal(
    result.locales.en.projects[0].description.rich_text[0].plain_text,
    "English",
  );
  assert.deepEqual(result.locales.en.projects[0].clients, [
    { id: "client", name: "Client", url: "https://example.com" },
  ]);
  const serialized = JSON.stringify(result);
  for (const secret of [
    "private@example.invalid",
    "private-phone",
    "private-person",
    "private-property",
    "descriptionDe",
    "germanReady",
    '"hidden"',
    '"references"',
  ])
    assert.ok(!serialized.includes(secret), secret);
  assert.equal(result.locales.en.owner.email, "public@example.com");
  assert.equal(result.locales.de.owner.position, "Deutsch");
});

test("unsupported or private nested content and upstream image URLs never enter the public publication", () => {
  const source = fixture();
  source.projects = source.projects.slice(0, 1);
  source.projects[0].caseStudyEn =
    "https://notion.so/123456781234123412341234567890ab";
  source.studies["12345678-1234-1234-1234-1234567890ab"] = [
    {
      id: "paragraph",
      type: "paragraph",
      richText: rich("Public body").rich_text,
      caption: [],
      children: [
        {
          id: "private-child",
          type: "child_page",
          richText: rich("Private child").rich_text,
          children: [],
          caption: [],
        },
      ],
    },
    {
      id: "image",
      type: "image",
      imageUrl: "https://file.notion.so/private-signed-url",
      richText: [],
      caption: [],
      children: [],
    },
  ];
  source.assets["case:12345678-1234-1234-1234-1234567890ab:image"] =
    "mirrored-version";
  const result = preparePublication(source);
  assert.ok(!JSON.stringify(result).includes("private-signed-url"));
  assert.ok(!JSON.stringify(result).includes("Private child"));
  assert.equal(
    result.locales.en.studies["12345678-1234-1234-1234-1234567890ab"][1]
      .imageUrl,
    "/api/projects/public/case-study/images/image?locale=en",
  );
});

test("public edit dates come from the project and its published language-specific study", () => {
  const source = fixture();
  const en = "11111111-1111-4111-8111-111111111111";
  const de = "22222222-2222-4222-8222-222222222222";
  source.projects[0].caseStudyEn = `https://notion.so/${en}`;
  source.projects[0].caseStudyDe = `https://notion.so/${de}`;
  source.studies = { [en]: [], [de]: [] };
  source.projectUpdatedAt = { public: "2026-11-16T10:00:00.000Z" };
  source.studyUpdatedAt = {
    [en]: "2026-11-15T10:00:00.000Z",
    [de]: "2026-11-17T10:00:00.000Z",
    private: "2026-11-18T10:00:00.000Z",
  };
  const result = preparePublication(source);
  for (const locale of ["en", "de"]) {
    const project = result.locales[locale].projects[0];
    assert.equal(project.updatedAt, source.projectUpdatedAt.public);
    assert.deepEqual(project.caseStudyUpdatedAt, {
      en: source.projectUpdatedAt.public,
      de: source.studyUpdatedAt[de],
    });
  }
  assert.ok(!JSON.stringify(result).includes('"studyUpdatedAt"'));
  delete source.studies[de];
  const unpublished = preparePublication(source).locales.en.projects[0];
  assert.equal(unpublished.caseStudyUpdatedAt.de, undefined);
  assert.equal(unpublished.caseStudyIds.de, null);
});

test("legacy publications do not fabricate dates from refresh time or project lifetime", () => {
  const source = fixture();
  source.projects[0].startDate = "2020-01-01";
  source.projects[0].endDate = "2025-01-01";
  source.projectUpdatedAt = { public: "invalid" };
  const project = preparePublication(source).locales.en.projects[0];
  assert.equal(project.updatedAt, undefined);
  assert.deepEqual(project.caseStudyUpdatedAt, {});
});
