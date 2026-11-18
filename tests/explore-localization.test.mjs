import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { localizedPath } = loadTs(
  new URL("../packages/content/src/i18n.ts", import.meta.url),
);
test("Explorer language switching keeps project, lens, view and anchor", () => {
  const selection = "?project=one&lens=scale&view=2d#atlas-project-detail";
  assert.equal(
    localizedPath(`/en/explorer${selection}`, "de"),
    `/de/explorer${selection}`,
  );
  assert.equal(
    localizedPath(`/de/explorer${selection}`, "en"),
    `/en/explorer${selection}`,
  );
});

test("homepage Explorer shortcuts resolve to the canonical route in either language", () => {
  const { resolveExplicitCommand, getLocalizedSuggestions } = loadTs(
    new URL(
      "../apps/web/src/components/PlasmaLanding/commands.ts",
      import.meta.url,
    ),
  );
  assert.equal(resolveExplicitCommand("Explorer", "en").href, "/explorer");
  assert.equal(resolveExplicitCommand("Explorer", "de").href, "/de/explorer");
  assert.equal(getLocalizedSuggestions("de").at(-1).href, "/de/explorer");
});

test("published German prose changes presentation without changing model fields", () => {
  const { presentProject } = loadTs(
    new URL(
      "../apps/web/src/components/ExperienceAtlas/projectPresentation.ts",
      import.meta.url,
    ),
  );
  const source = {
    id: "one",
    name: "Example",
    subtitle: "Original text",
    summary: "Original summary",
    tools: ["TypeScript"],
    ownership: "Solo delivery",
    matching: { domains: ["Developer tooling"] },
    caseHref: "/en/projects/example/case-study",
  };
  const published = {
    id: "one",
    name: "Example",
    description: {
      rich_text: [{ plain_text: "Deutsche Projektbeschreibung" }],
    },
    contentLocale: "de",
    availableLocales: ["en", "de"],
    caseStudyIds: { en: "case" },
  };
  const result = presentProject(source, published, "de");
  assert.equal(result.presentation.description, "Deutsche Projektbeschreibung");
  assert.equal(result.presentation.locale, "de");
  assert.match(result.presentation.projectHref, /^\/de\/projects\//);
  assert.equal(
    result.presentation.caseHref,
    "/en/projects/example-one/case-study",
  );
  assert.equal(result.presentation.caseLocale, "en");
  const { presentation, ...model } = result;
  assert.deepEqual(model, source);
});

test("untranslated project prose and links explicitly retain their real language", () => {
  const { presentProject } = loadTs(
    new URL(
      "../apps/web/src/components/ExperienceAtlas/projectPresentation.ts",
      import.meta.url,
    ),
  );
  const source = {
    id: "two",
    name: "Example",
    subtitle: "English text",
    summary: "Summary",
    caseHref: null,
  };
  const result = presentProject(source, undefined, "de");
  assert.equal(result.presentation.locale, "en");
  assert.equal(result.presentation.description, "English text");
  assert.equal(result.presentation.projectHref, null);
});
