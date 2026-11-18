import assert from "node:assert/strict";
import { test } from "node:test";
import { planDimensionMigration } from "../apps/sync/scripts/migrate-project-dimensions.mjs";
const multi = (xs) => ({
  type: "multi_select",
  multi_select: xs.map((name) => ({ name })),
});
const page = (id, hidden = false) => ({
  id,
  archived: false,
  in_trash: false,
  last_edited_time: "2026-11-18",
  properties: {
    Hidden: { type: "checkbox", checkbox: hidden },
    Experiences: multi(["UX-Design", "User Testing", "WebGL"]),
    Tools: multi(["Figma", "Personas"]),
  },
});
test("migration splits tags, cleans tools and preserves the original source column", () => {
  const p = page("p");
  const before = JSON.stringify(p);
  const plan = planDimensionMigration({ properties: {} }, [
    p,
    page("hidden", true),
  ]);
  assert.equal(plan.updates.length, 1);
  const update = plan.updates[0];
  assert.deepEqual(update.values.Capabilities, ["UX-Design"]);
  assert.deepEqual(update.values.Methods, ["Personas", "User Testing"]);
  assert.deepEqual(update.values.Tools, ["Figma", "WebGL"]);
  assert.ok(!("Experiences" in update.values));
  assert.equal(JSON.stringify(p), before);
});
test("migration is idempotent, respects new-field edits and stops on unclassified tags", () => {
  const p = page("p");
  p.properties.Capabilities = multi(["Authored capability"]);
  p.properties.Methods = multi(["Custom method"]);
  const plan = planDimensionMigration({ properties: {} }, [p]);
  assert.deepEqual(plan.updates[0].values.Capabilities, undefined);
  assert.deepEqual(plan.updates[0].values.Methods, [
    "Custom method",
    "Personas",
  ]);
  p.properties.Tools = multi(["Figma", "WebGL"]);
  p.properties.Methods = multi(["Custom method", "Personas"]);
  assert.equal(
    planDimensionMigration({ properties: {} }, [p]).updates.length,
    0,
  );
  const unknown = page("unknown");
  unknown.properties.Experiences = multi(["Unreviewed tag"]);
  assert.throws(
    () => planDimensionMigration({ properties: {} }, [unknown]),
    /Unclassified/,
  );
});
