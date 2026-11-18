import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { projectFlow, capabilityPairs, semanticFamilies, coverageShortlist } =
  loadTs(
    new URL(
      "../apps/web/src/components/ProjectLab/explorations.ts",
      import.meta.url,
    ),
  );
const p = (id, needs = [], extra = {}) => ({
  id,
  name: id,
  projectType: "Hobby",
  matching: { buyerNeeds: needs, ownership: "Solo delivery" },
  capabilities: [],
  methods: [],
  caseStudyWords: 0,
  outcomeBasis: "No outcome recorded",
  ...extra,
});

test("flow conserves projects through each adjacent column, retaining unknown labels and identities", () => {
  const rows = [
    p("a"),
    p("b", [], {
      projectType: "Freelance",
      matching: { ownership: "" },
      outcomeBasis: "",
    }),
  ];
  const flow = projectFlow(rows);
  for (const stage of [0, 1])
    assert.equal(
      flow.links
        .filter((l) => l.stage === stage)
        .reduce((n, l) => n + l.ids.length, 0),
      2,
    );
  assert.ok(flow.nodes.some((n) => n.label === "Unknown ownership"));
  assert.ok(flow.nodes.some((n) => n.label === "Unknown outcome basis"));
  assert.deepEqual(flow.links.find((l) => l.source === "0:Hobby").ids, ["a"]);
});

test("pair support deduplicates tags and lift uses the filtered project denominator", () => {
  const rows = [
    p("a", [], { capabilities: ["X", "X", "Y"] }),
    p("b", [], { capabilities: ["X", "Y"] }),
    p("c", [], { capabilities: ["Z"] }),
    p("d", [], { capabilities: [] }),
  ];
  const pair = capabilityPairs(rows, "capabilities", 2)[0];
  assert.deepEqual(pair.ids, ["a", "b"]);
  assert.equal(pair.supportA, 2);
  assert.equal(pair.supportB, 2);
  assert.equal(pair.lift, 2);
  assert.equal(capabilityPairs(rows.slice(0, 2), "capabilities", 2)[0].lift, 1);
  assert.equal(capabilityPairs(rows, "capabilities", 3).length, 0);
});

test("average-linkage families retain measured distances and do not invent missing comparisons", () => {
  const rows = [p("a"), p("b"), p("c"), p("d")];
  const pairs = [
    { a: "a", b: "b", cosine: 0.9 },
    { a: "a", b: "c", cosine: 0.3 },
    { a: "b", b: "c", cosine: 0.5 },
  ];
  const result = semanticFamilies(rows, pairs, 0.3);
  assert.equal(result.roots.length, 2);
  const merged = result.roots.find((n) => n.ids.length === 3);
  assert.ok(Math.abs(merged.distance - 0.6) < 1e-12);
  assert.ok(result.groups.some((g) => g.ids.join(",") === "a,b"));
  assert.ok(result.groups.some((g) => g.ids.join(",") === "d"));
  assert.deepEqual(
    semanticFamilies(rows, [], 0.3).groups.map((g) => g.ids),
    [["a"], ["b"], ["c"], ["d"]],
  );
});

test("greedy shortlist counts new needs only, reports unrecorded needs, and respects case-study eligibility", () => {
  const rows = [
    p("b", ["UX", "AI"]),
    p("a", ["UX", "UX", "AI"], { caseStudyWords: 100 }),
    p("c", ["Hardware"]),
    p("d", ["AI"]),
  ];
  const result = coverageShortlist(
    rows,
    ["UX", "AI", "Hardware", "Unknown"],
    false,
  );
  assert.deepEqual(
    result.steps.map((s) => s.projectId),
    ["a", "c"],
  );
  assert.deepEqual(
    result.steps.map((s) => s.cumulative),
    [2, 3],
  );
  assert.deepEqual(result.uncovered, ["Unknown"]);
  const published = coverageShortlist(rows, ["UX", "AI", "Hardware"], true);
  assert.deepEqual(
    published.steps.map((s) => s.projectId),
    ["a"],
  );
  assert.deepEqual(published.uncovered, ["Hardware"]);
  assert.deepEqual(coverageShortlist(rows, [], false).steps, []);
});
