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
  "35686514-f736-8019-921c-e5d8d77e7f23",
  "b77109b3-803c-4132-a07b-44b9b9ccc5df",
  "41786514-f736-8074-8dcb-dd79f906d12a",
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

test("automation evidence leads with Test Flow, NuMobility and Business Hub", () => {
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
  const testing = evidence.find((p) => p.id === ids[0]);
  assert.match(testing.story.en.context, /internal/i);
  assert.match(testing.story.de.context, /intern/i);
  assert.match(testing.story.en.summary, /browser/i);
  for (const project of evidence.filter((p) => p.story.featured)) {
    assert.ok(project.story.en.headline);
    assert.ok(project.story.de.headline);
  }
  assert.equal(
    evidence.find((p) => p.id === "11d86514-f736-80ed-935c-e6fe30b59d42").story
      .featured,
    false,
  );
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

test("Test Flow uses its published workflow image, with a safe first-image fallback", () => {
  const project = {
    ...make(ids[0]),
    screenshots: ["/dashboard", "/suites", "/workflow"],
  };
  assert.equal(
    selectServiceEvidence([project], "ai-automation", href)[0].screenshot,
    "/workflow",
  );
  assert.equal(
    selectServiceEvidence(
      [{ ...project, screenshots: ["/only-image"] }],
      "ai-automation",
      href,
    )[0].screenshot,
    "/only-image",
  );
  assert.equal(
    selectServiceEvidence(
      [{ ...project, screenshots: [] }],
      "ai-automation",
      href,
    )[0].screenshot,
    null,
  );
});
