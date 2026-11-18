import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { createTooltipDismissal } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/spaceTooltip.ts",
    import.meta.url,
  ),
);

test("Escape keeps the current hover dismissed until it is left", () => {
  const tooltip = createTooltipDismissal();
  assert.equal(tooltip.show("project:a"), true);
  tooltip.dismiss();
  assert.equal(tooltip.show("project:a"), false);
  tooltip.leave();
  assert.equal(tooltip.show("project:a"), true);
});

test("another project or cluster can be previewed after dismissal", () => {
  const tooltip = createTooltipDismissal();
  tooltip.show("project:a");
  tooltip.dismiss();
  assert.equal(tooltip.show("cluster:1"), true);
  assert.equal(tooltip.show("project:a"), true);
});
