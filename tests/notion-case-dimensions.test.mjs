import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import {
  planCaseBackfill,
  projectSource,
} from "../scripts/seed-notion-case-dimensions.mjs";

const text = (content) => ({
  type: "rich_text",
  rich_text: content ? [{ plain_text: content }] : [],
});
const page = () => ({
  id: "public-project",
  properties: {
    Name: { title: [{ plain_text: "A useful product" }] },
    Hidden: { checkbox: false },
    "Project Description": text("An interface for a complex workflow."),
    KPIs: text(""),
    Experiences: { multi_select: [{ name: "Frontend-Development" }] },
  },
});
const database = { properties: {} };
const schema = {
  "Buyer Needs": {
    multi_select: { options: [{ name: "Improve an interface" }] },
  },
  "Personal Contribution": { rich_text: {} },
  "Case Review": { select: { options: [{ name: "Source-backed draft" }] } },
};
const seed = (p) => ({
  schema,
  projects: [
    {
      id: p.id,
      source: projectSource(p),
      fields: {
        "Buyer Needs": ["Improve an interface"],
        "Personal Contribution": "",
        "Case Review": "Source-backed draft",
      },
    },
  ],
});

test("adds missing dimensions and fills supported values without filling unknown contributions", () => {
  const p = page();
  const plan = planCaseBackfill(database, [p], seed(p));
  assert.deepEqual(Object.keys(plan.addProperties), Object.keys(schema));
  assert.equal(plan.updates.length, 1);
  assert.deepEqual(plan.updates[0].properties["Buyer Needs"], {
    multi_select: [{ name: "Improve an interface" }],
  });
  assert.equal(plan.updates[0].properties["Personal Contribution"], undefined);
  assert.equal(plan.updates[0].properties.KPIs, undefined);
});

test("preserves editor changes and produces no writes when rerun", () => {
  const p = page();
  const data = seed(p);
  p.properties["Buyer Needs"] = { multi_select: [{ name: "Editor choice" }] };
  p.properties["Case Review"] = { select: { name: "Owner confirmed" } };
  const plan = planCaseBackfill(database, [p], data);
  assert.deepEqual(plan.updates, []);
  assert.equal(plan.preserved.length, 2);
});

test("a completed backfill is idempotent, including schema creation", () => {
  const p = page();
  const data = seed(p);
  const first = planCaseBackfill(database, [p], data);
  Object.assign(p.properties, first.updates[0].properties);
  const existing = {
    properties: Object.fromEntries(
      Object.entries(schema).map(([name, definition]) => [
        name,
        { type: Object.keys(definition)[0], ...definition },
      ]),
    ),
  };
  const again = planCaseBackfill(existing, [p], data);
  assert.deepEqual(again.addProperties, {});
  assert.deepEqual(again.updates, []);
});

test("rejects stale source records and hidden or missing projects before any write", () => {
  const p = page();
  const data = seed(p);
  p.properties["Project Description"] = text("Changed after curation");
  assert.throws(() => planCaseBackfill(database, [p], data), /source changed/i);
  p.properties.Hidden.checkbox = true;
  assert.throws(() => planCaseBackfill(database, [p], data), /hidden/i);
  assert.throws(() => planCaseBackfill(database, [], data), /missing/i);
});

test("withholds confirmation metadata when an editor changed its associated contribution", () => {
  const p = page();
  const data = seed(p);
  data.schema["Contribution Basis"] = {
    select: { options: [{ name: "Owner confirmation" }] },
  };
  data.projects[0].fields["Personal Contribution"] =
    "Confirmed original contribution";
  data.projects[0].fields["Contribution Basis"] = "Owner confirmation";
  p.properties["Personal Contribution"] = text(
    "Different editorial contribution",
  );
  const plan = planCaseBackfill(database, [p], data);
  assert.equal(plan.updates[0].properties["Contribution Basis"], undefined);
  assert.ok(
    plan.conflicts.some((c) => c.fields.includes("Personal Contribution")),
  );
});

test("status and end-date changes invalidate lifecycle evidence", () => {
  const p = page();
  p.properties.Status = { select: { name: "In Progress" } };
  p.properties["End Date"] = { date: { start: "2024-05-01" } };
  const data = seed(p);
  p.properties["End Date"].date.start = "2025-05-01";
  assert.throws(() => planCaseBackfill(database, [p], data), /source changed/i);
});

test("curated cases keep unverified outcomes and partial owner confirmations distinct", async () => {
  const data = JSON.parse(
    await readFile(
      new URL("../ops/notion/project-case-dimensions.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(data.projects.length, 41);
  for (const project of data.projects) {
    assert.equal(project.fields["Case Review"], "Source-backed draft");
    assert.notEqual(
      project.fields["Outcome Basis"],
      "Source-verified measurement",
    );
    if (project.fields["Contribution Basis"] === "Owner confirmation") {
      assert.ok(project.confirmations.personalContribution.quote);
      assert.ok(project.fields["Personal Contribution"]);
    }
  }
  assert.ok(data.projects.some((p) => p.fields["AI Usage"].length));
  // Broad AI experience alone must not become a delivered product feature.
  const portTracking = data.projects.find(
    (p) => p.id === "d33ded3a-755e-47bc-87ff-6fd496774a18",
  );
  assert.deepEqual(portTracking.fields["AI Usage"], []);
});

test("rejects legacy-field writes, unsupported tags, duplicate projects, and incompatible schemas", () => {
  const p = page();
  let data = seed(p);
  data.projects[0].fields.KPIs = "Invented outcome";
  assert.throws(
    () => planCaseBackfill(database, [p], data),
    /unsupported field/i,
  );
  data = seed(p);
  data.projects[0].fields["Buyer Needs"] = ["Unsupported claim"];
  assert.throws(
    () => planCaseBackfill(database, [p], data),
    /unsupported option/i,
  );
  data = seed(p);
  data.projects.push(data.projects[0]);
  assert.throws(() => planCaseBackfill(database, [p], data), /duplicate/i);
  assert.throws(
    () =>
      planCaseBackfill(
        { properties: { "Buyer Needs": { type: "rich_text" } } },
        [p],
        seed(p),
      ),
    /incompatible/i,
  );
});
