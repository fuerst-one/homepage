import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { loadTs } from "./helpers/load-ts.mjs";

const path = new URL(
  "../apps/web/src/components/Cv/Projects/projectDiscovery.ts",
  import.meta.url,
);
const konfig = "15b86514-f736-803e-b9b7-e47ebc2406d1";
const canvas = "f9cc2539-c940-4864-8ff0-8424ed0d9fb9";
const stats = "e315ebfb-d36f-4b62-8f7c-f58eaacf7806";
const seabo = "153f6668-f4d6-490a-8345-0b999b35305a";
const project = (id, locales = ["en", "de"]) => ({
  id,
  name: id,
  contentLocale: "en",
  availableLocales: locales,
});
const api = () => {
  assert.ok(
    existsSync(path),
    "Project discovery must provide reviewed connections and published excerpts",
  );
  return loadTs(path);
};

test("reviewed connections explain both the shared work and its limits", () => {
  const result = api().relatedExperience(
    konfig,
    [project(konfig), project(canvas), project(seabo)],
    "en",
  );
  assert.deepEqual(
    result.map((r) => r.project.id),
    [canvas, seabo],
  );
  assert.match(result[0].connection, /edit|canvas/i);
  assert.match(result[0].difference, /print|production/i);
  assert.match(result[1].difference, /team|ownership|responsibilit/i);
  assert.ok(result.every((r) => r.title && r.connection && r.difference));
});

test("connections require both visible projects and the requested translation", () => {
  const { relatedExperience } = api();
  assert.deepEqual(relatedExperience(konfig, [project(canvas)], "en"), []);
  assert.deepEqual(
    relatedExperience(konfig, [project(konfig), project(canvas, ["en"])], "de"),
    [],
  );
  assert.deepEqual(relatedExperience("unknown", [project(canvas)], "en"), []);
  assert.deepEqual(relatedExperience(konfig, [project(konfig)], "en"), []);
});

test("playlist relationship is reciprocal, localized and does not invent outcomes", () => {
  const projects = [project(canvas), project(stats)];
  const a = api().relatedExperience(canvas, projects, "en")[0];
  const b = api().relatedExperience(stats, projects, "de")[0];
  assert.equal(a.project.id, stats);
  assert.equal(b.project.id, canvas);
  assert.match(a.connection, /Spotify/);
  assert.notEqual(a.title, b.title);
  assert.doesNotMatch(JSON.stringify([a, b]), /%|revenue|adoption|users per/i);
});

const block = (type, text, children = []) => ({
  id: text,
  type,
  richText: [{ plain_text: text }],
  children,
});
test("case preview uses the first two published sections without flattening private or unsupported blocks", () => {
  const result = api().caseStudyPreview([
    block("paragraph", "Intro"),
    block("heading_2", "My contribution"),
    block("paragraph", "Built the editor."),
    block("paragraph", "More detail belongs in the case study."),
    block("heading_2", "Delivery"),
    block("image", "do not expose image metadata"),
    block("paragraph", "Exported print files."),
    block("heading_2", "Results"),
    block("paragraph", "Owner-reported result."),
  ]);
  assert.deepEqual(result, [
    { title: "My contribution", text: "Built the editor." },
    { title: "Delivery", text: "Exported print files." },
  ]);
  assert.deepEqual(api().caseStudyPreview([]), []);
  assert.deepEqual(
    api().caseStudyPreview([
      block("heading_2", "Empty"),
      block("heading_2", "Next"),
      block("paragraph", "Complete sentence."),
    ]),
    [{ title: "Next", text: "Complete sentence." }],
  );
});

test("Seabo connects to ORA container tracking, not the ROLLT logistics prototype", () => {
  const ora = "d33ded3a-755e-47bc-87ff-6fd496774a18";
  const rollt = "b6ea7e71-2e97-42f2-8644-a57545c20d59";
  const result = api().relatedExperience(
    seabo,
    [project(seabo), project(ora), project(rollt)],
    "en",
  );
  assert.deepEqual(
    result.map((r) => r.project.id),
    [ora],
  );
  assert.match(result[0].difference, /container tracking/);
});
