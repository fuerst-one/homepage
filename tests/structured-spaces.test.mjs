import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { structuredInputs } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/structuredSpaces.ts",
    import.meta.url,
  ),
);
const p = (id, team = 1, extra = {}) => ({
  id,
  productTypes: ["Web app"],
  projectType: "Freelance",
  matching: { domains: ["Data exploration"], ownership: "Solo delivery" },
  scale: { teamLow: team, teamHigh: team, workingPattern: "Full-time" },
  ...extra,
});

test("product similarity gives use cases and formats equal weight and ignores names and tools", () => {
  const rows = [
    p("a"),
    p("b", 1, { name: "Different", tools: ["Other"] }),
    p("c", 1, { productTypes: ["Hardware"] }),
    p("d", 1, { matching: { domains: ["Automation"] } }),
  ];
  const result = structuredInputs(rows, "product");
  assert.equal(result.similarities[0][1], 1);
  assert.equal(result.similarities[0][2], 0.5);
  assert.deepEqual(result.fieldTerms.a, ["Data exploration", "Web app"]);
  assert.ok(result.dimensions > 0);
});

test("contribution retains numeric ordering and refits team ranges on the supplied population", () => {
  const rows = [p("a", 1), p("b", 2), p("c", 10), p("d", 100)];
  const all = structuredInputs(rows, "practice");
  assert.ok(all.similarities[0][1] > all.similarities[0][2]);
  const filtered = structuredInputs(rows.slice(0, 3), "practice");
  assert.ok(filtered.similarities[0][2] < all.similarities[0][2]);
  assert.deepEqual(structuredInputs([...rows].reverse(), "practice"), all);
});

test("missing or invalid team ranges are excluded, never represented by zero or a category", () => {
  const result = structuredInputs(
    [
      p("a"),
      p("missing", 1, { scale: {} }),
      p("reversed", 1, {
        scale: { teamLow: 4, teamHigh: 2, workingPattern: "Full-time" },
      }),
      p("format", 1, { productTypes: [] }),
    ],
    "practice",
  );
  assert.deepEqual(
    result.projects.map((p) => p.id),
    ["a", "format"],
  );
  assert.deepEqual(
    result.excluded.map((p) => p.id),
    ["missing", "reversed"],
  );
  assert.ok(result.excluded.every((p) => p.reason.includes("Team size")));
  assert.deepEqual(result.similarities, [
    [1, 1],
    [1, 1],
  ]);
  assert.equal(
    structuredInputs([p("format", 1, { productTypes: [] })], "product").projects
      .length,
    0,
  );
});
