import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const seo = loadTs(new URL("../apps/web/src/lib/seo.ts", import.meta.url));
const project = {
  id: "example",
  name: "Example project",
  contentLocale: "de",
  availableLocales: ["en", "de"],
  description: { rich_text: [{ plain_text: "Project overview." }] },
  tools: [],
  capabilities: [],
  methods: [],
  industries: [],
  updatedAt: "2026-11-16T10:00:00.000Z",
  caseStudyUpdatedAt: { de: "2026-11-17T11:00:00.000Z" },
};
const blocks = [
  {
    type: "paragraph",
    richText: [{ plain_text: "A first-hand account of building the product." }],
  },
  {
    type: "paragraph",
    richText: [
      { plain_text: "The implementation connects design and delivery." },
    ],
  },
];

test("person identity links include the confirmed freelance profiles", () => {
  const person = seo.personSchema();
  for (const url of [
    "https://github.com/fuerst-one",
    "https://www.linkedin.com/in/fuerst-one/",
    "https://www.malt.com/profile/alexanderfuerst",
    "https://www.freelancermap.de/profil/alexander-fuerst",
  ])
    assert.ok(person.sameAs.includes(url), `Missing identity link: ${url}`);
  assert.equal(new Set(person.sameAs).size, person.sameAs.length);
});

test("a case study identifies its author, project, localized URL and actual body", () => {
  assert.equal(typeof seo.caseStudySchema, "function");
  const article = seo.caseStudySchema(project, "de", blocks);
  const url =
    "https://fuerst.one/de/projects/example-project-example/case-study";
  assert.equal(article["@type"], "Article");
  assert.equal(article.url, url);
  assert.equal(article.mainEntityOfPage["@id"], url);
  assert.equal(article.author["@id"], seo.PERSON_ID);
  assert.equal(
    article.about["@id"],
    "https://fuerst.one/de/projects/example-project-example#project",
  );
  assert.equal(article.inLanguage, "de");
  assert.equal(
    article.description,
    blocks.map((b) => b.richText[0].plain_text).join(" "),
  );
  assert.equal(article.dateModified, project.caseStudyUpdatedAt.de);
  assert.equal(article.datePublished, undefined);
});

test("unknown and malformed edit dates do not become schema freshness claims", () => {
  assert.equal(typeof seo.caseStudySchema, "function");
  const legacy = {
    ...project,
    updatedAt: undefined,
    caseStudyUpdatedAt: undefined,
  };
  assert.equal(seo.projectSchema(legacy).dateModified, undefined);
  assert.equal(seo.caseStudySchema(legacy, "de", []).dateModified, undefined);
  assert.equal(
    seo.caseStudySchema(
      { ...project, caseStudyUpdatedAt: { de: "invalid" } },
      "de",
      blocks,
    ).dateModified,
    undefined,
  );
  assert.equal(seo.projectSchema(project).dateModified, project.updatedAt);
});

test("content dates accept real source timestamps and reject ambiguous or invalid values", () => {
  const source = new URL(
    "../packages/content/src/contentDates.ts",
    import.meta.url,
  );
  assert.ok(existsSync(source), "Content date validation must exist");
  const { contentDate, latestContentDate } = loadTs(source);
  assert.equal(contentDate(project.updatedAt), project.updatedAt);
  assert.equal(contentDate("2026-11-16T10:00:00Z"), project.updatedAt);
  for (const value of [
    undefined,
    null,
    "",
    "2026-02-31T10:00:00.000Z",
    "2026-11-16",
    "yesterday",
    123,
  ])
    assert.equal(contentDate(value), undefined);
  assert.equal(
    latestContentDate(project.updatedAt, project.caseStudyUpdatedAt.de),
    project.caseStudyUpdatedAt.de,
  );
  assert.equal(latestContentDate("invalid", undefined), undefined);
});

test("visible update dates are localized, machine-readable and omitted when unknown", () => {
  const source = new URL(
    "../apps/web/src/components/ContentUpdatedAt.tsx",
    import.meta.url,
  );
  assert.ok(existsSync(source), "The source update date must be visible");
  const { ContentUpdatedAt } = loadTs(source);
  const require = createRequire(
    new URL("../apps/web/package.json", import.meta.url),
  );
  const { renderToStaticMarkup } = require("react-dom/server");
  const render = (date, locale) =>
    renderToStaticMarkup(ContentUpdatedAt({ date, locale }));
  assert.match(render(project.updatedAt, "en"), /Last updated/);
  assert.match(
    render(project.updatedAt, "en"),
    /<time dateTime="2026-11-16T10:00:00.000Z"/,
  );
  assert.match(render(project.updatedAt, "de"), /Zuletzt aktualisiert/);
  assert.equal(render(undefined, "en"), "");
  assert.equal(render("invalid", "en"), "");
});

test("person identity and page metadata use the page language", () => {
  assert.equal(seo.personSchema(undefined, "en").name, "Alexander Fuerst");
  assert.equal(seo.personSchema(undefined, "de").name, "Alexander Fürst");
  const metadata = seo.pageMetadata(
    "/",
    "Alexander Fuerst | FUERST.ONE",
    "Work by Alexander Fuerst",
    { locale: "de" },
  );
  assert.equal(metadata.title, "Alexander Fürst | FUERST.ONE");
  assert.equal(metadata.description, "Work by Alexander Fürst");
});

test("published identity copy normalizes branding and names without changing links", () => {
  const { localizePublicIdentity } = loadTs(
    new URL("../packages/content/src/publicIdentity.ts", import.meta.url),
  );
  assert.deepEqual(
    localizePublicIdentity(
      {
        title: "Fuerst.one — Alexander Fuerst",
        url: "https://fuerst.one/de",
        email: "alexander@fuerst.one",
      },
      "de",
    ),
    {
      title: "FUERST.ONE — Alexander Fürst",
      url: "https://fuerst.one/de",
      email: "alexander@fuerst.one",
    },
  );
});
