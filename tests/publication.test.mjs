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
      experiences: [],
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
  assert.equal(result.version, 2);
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
