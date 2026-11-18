import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { createTooltipDismissal, tooltipCorner, chartTooltipPosition } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/spaceTooltip.ts",
    import.meta.url,
  ),
);

test("a hover in the upper-right moves the card to the left", () => {
  assert.equal(tooltipCorner([760, 180], [1000, 700]), "top-left");
  assert.equal(tooltipCorner([240, 180], [1000, 700]), "top-right");
  assert.equal(tooltipCorner([760, 580], [1000, 700]), "top-right");
});

test("narrow charts move the card vertically to keep the hovered area clear", () => {
  assert.equal(tooltipCorner([280, 120], [360, 600]), "bottom-right");
  assert.equal(tooltipCorner([80, 480], [360, 600]), "top-right");
});

test("chart card placement uses its measured size and stays inside the chart", () => {
  const size = { viewSize: [1000, 700], contentSize: [306, 240] };
  assert.deepEqual(chartTooltipPosition([760, 180], size), [16, 44]);
  assert.deepEqual(chartTooltipPosition([240, 180], size), [678, 44]);
  assert.deepEqual(
    chartTooltipPosition([280, 120], {
      viewSize: [360, 600],
      contentSize: [306, 240],
    }),
    [38, 344],
  );
  const [x, y] = chartTooltipPosition([10, 10], {
    viewSize: [200, 120],
    contentSize: [220, 180],
  });
  assert.ok(x >= 0 && y >= 0);
});

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
