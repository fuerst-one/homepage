import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const moduleUrl = new URL("../src/lib/localizeContent.ts", import.meta.url);
const rt = (text) => ({
  type: "rich_text",
  rich_text: text ? [{ plain_text: text }] : [],
});
const getContent = () => {
  assert.ok(
    existsSync(moduleUrl),
    "Translation publication rules must be available",
  );
  return loadTs(moduleUrl);
};
const project = {
  name: "Konfig",
  description: rt("English description"),
  kpis: rt("50% returning users"),
  descriptionDe: rt("Deutsche Beschreibung"),
  kpisDe: rt("50 % wiederkehrende Nutzer"),
  germanReady: true,
  tools: ["React"],
};
test("published German prose replaces text while preserving shared tags and English source", () => {
  const { localizeProject } = getContent();
  const translated = localizeProject(project, "de");
  assert.equal(
    translated.description.rich_text[0].plain_text,
    "Deutsche Beschreibung",
  );
  assert.equal(
    translated.kpis.rich_text[0].plain_text,
    "50 % wiederkehrende Nutzer",
  );
  assert.equal(translated.tools, project.tools);
  assert.equal(translated.name, project.name);
  assert.equal(
    project.description.rich_text[0].plain_text,
    "English description",
  );
});
test("unpublished or incomplete translations fall back together to English", () => {
  const { localizeProject, hasGermanTranslation } = getContent();
  for (const partial of [
    { germanReady: false },
    { descriptionDe: rt("") },
    { kpisDe: rt("") },
  ]) {
    const source = { ...project, ...partial };
    assert.equal(hasGermanTranslation(source), false);
    assert.equal(localizeProject(source, "de").contentLocale, "en");
    assert.equal(localizeProject(source, "de").description, source.description);
  }
});
test("projects without English KPIs do not need German KPIs", () => {
  assert.equal(
    getContent().hasGermanTranslation({
      ...project,
      kpis: rt(""),
      kpisDe: rt(""),
    }),
    true,
  );
});

test("public project payloads never expose unpublished translation source fields", () => {
  const { toPublicProject, localizeProject } = getContent();
  assert.equal(typeof toPublicProject, "function");
  const draft = {
    ...project,
    germanReady: false,
    descriptionDe: rt("PRIVATE DRAFT"),
  };
  const publicProject = toPublicProject(localizeProject(draft, "de"));
  assert.equal(publicProject.descriptionDe, undefined);
  assert.equal(publicProject.kpisDe, undefined);
  assert.equal(publicProject.germanReady, undefined);
  assert.equal(
    publicProject.description.rich_text[0].plain_text,
    "English description",
  );
  assert.ok(!JSON.stringify(publicProject).includes("PRIVATE DRAFT"));
  assert.equal(draft.descriptionDe.rich_text[0].plain_text, "PRIVATE DRAFT");
});
