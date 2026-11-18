import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const facts = (project, lens, locale = "en", options) =>
  loadTs(
    new URL(
      "../apps/web/src/components/ExperienceAtlas/projectLensFacts.ts",
      import.meta.url,
    ),
  ).projectLensFacts(project, lens, locale, options);
const project = {
  matching: { domains: ["Developer tooling"], buyerNeeds: [], stages: [] },
  productTypes: ["Plugin / integration"],
  tools: ["React"],
  languages: ["TypeScript"],
  ownership: "Solo delivery",
  projectType: "Own Project",
  scale: {
    teamLow: 1,
    teamHigh: 1,
    complexity: 4,
    complexityBasis: "assessment",
    effortLow: 10,
    effortHigh: 20,
    effortBasis: "rebuild-estimate",
    codeSloc: 0,
    workingPattern: "3 days/week",
  },
};

test("selected project facts follow the current lens and default field definitions", () => {
  assert.deepEqual(
    facts(project, "product").map((f) => f.id),
    ["domains", "productTypes"],
  );
  assert.deepEqual(
    facts(project, "engineering").map((f) => f.value),
    ["React", "TypeScript"],
  );
  assert.deepEqual(
    facts(project, "practice").map((f) => f.id),
    ["ownership", "projectType", "workingPattern", "teamSize"],
  );
  assert.equal(facts(project, "practice", "de")[2].value, "3 Tage pro Woche");
});

test("numeric facts retain raw ranges, units, zero and measurement context", () => {
  const result = facts(project, "scale");
  assert.equal(result.find((f) => f.id === "teamSize").value, "1 person");
  assert.equal(
    result.find((f) => f.id === "effort").value,
    "10–20 person-days",
  );
  assert.match(
    result.find((f) => f.id === "effort").note,
    /rebuild.*historical/i,
  );
  assert.equal(result.find((f) => f.id === "codeSloc").value, "0 source lines");
  assert.match(
    result.find((f) => f.id === "codeSloc").note,
    /team.*inherited/i,
  );
});

test("facts follow selected numeric fields and completed experiment fields", () => {
  assert.deepEqual(
    facts(project, "scale", "en", { scaleFields: ["code"] }).map((f) => f.id),
    ["codeSloc"],
  );
  assert.deepEqual(
    facts(project, "product", "en", { fields: ["tools", "languages"] }).map(
      (f) => f.value,
    ),
    ["React", "TypeScript"],
  );
});

test("missing and unavailable fields are explicit rather than invented", () => {
  assert.equal(
    facts({ ...project, languages: [] }, "engineering", "de")[1].value,
    "Nicht erfasst",
  );
  assert.equal(
    facts(project, "product", "en", { fields: ["targetMarket"] })[0].value,
    "Not available in this view",
  );
  assert.equal(
    facts({ ...project, scale: {} }, "scale")[0].value,
    "Not recorded",
  );
});
