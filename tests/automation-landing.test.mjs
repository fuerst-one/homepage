import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { selectServiceEvidence } = loadTs(
  new URL(
    "../apps/web/src/components/Services/serviceEvidence.ts",
    import.meta.url,
  ),
);
const ids = [
  "b77109b3-803c-4132-a07b-44b9b9ccc5df",
  "35686514-f736-8019-921c-e5d8d77e7f23",
  "11d86514-f736-80ed-935c-e6fe30b59d42",
  "41c86514-f736-801e-8825-cbf28db44596",
  "35486514-f736-8020-bde8-e0f741a1a77a",
];
const make = (id) => ({
  id,
  name: id,
  screenshots: [],
  tools: [],
  clients: [{ name: "Example", email: "private@example.com" }],
  projectType: "Hobby",
  kpis: { rich_text: [] },
  researchEvidence: "private research",
});
const href = (p) => `/en/projects/${p.id}`;

test("automation evidence includes data pipelines, Test Flow and product AI in a deliberate order", () => {
  const evidence = selectServiceEvidence(
    [...ids].reverse().map(make),
    "ai-automation",
    href,
  );
  assert.deepEqual(
    evidence.map((p) => p.id),
    ids,
  );
  assert.deepEqual(
    evidence.filter((p) => p.story?.featured).map((p) => p.id),
    ids.slice(0, 3),
  );
  const testing = evidence.find((p) => p.id === ids[1]);
  assert.match(testing.story.en.context, /internal/i);
  assert.match(testing.story.de.context, /intern/i);
  assert.match(testing.story.en.summary, /browser/i);
  assert.doesNotMatch(
    JSON.stringify(evidence.map((p) => p.story)),
    /halved|50%|12 agents/i,
  );
  assert.ok(!JSON.stringify(evidence).includes("private@example.com"));
  assert.ok(!JSON.stringify(evidence).includes("private research"));
});

test("unpublished automation cases are omitted rather than supplied with invented links", () => {
  const evidence = selectServiceEvidence(
    [make(ids[1]), make("unrelated")],
    "ai-automation",
    href,
  );
  assert.deepEqual(
    evidence.map((p) => p.id),
    [ids[1]],
  );
  assert.equal(evidence[0].href, `/en/projects/${ids[1]}`);
  assert.deepEqual(selectServiceEvidence([], "ai-automation", href), []);
});
