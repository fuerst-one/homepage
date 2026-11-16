import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { getLabelPlacementAtPoint } = loadTs(
  new URL(
    "../apps/web/src/components/Plasma/getLabelGroupPlacements.ts",
    import.meta.url,
  ),
);
const label = { label: "FUERST.ONE" };

test("the hero label occupies whole glyph cells nearest its target center", () => {
  for (const [width, centerY, cellSize] of [
    [1440, 300, 24],
    [1365, 256, 24],
    [768, 1024 / 3, 24],
    [390, 281, 20],
    [375, 245, 20],
  ]) {
    const center = { x: width / 2 / cellSize, y: centerY / cellSize };
    const placement = getLabelPlacementAtPoint(label, center);
    assert.equal(placement.label, label);
    assert.ok(Number.isInteger(placement.startCol));
    assert.ok(Number.isInteger(placement.row));
    assert.ok(
      Math.abs(placement.startCol + label.label.length / 2 - center.x) <= 0.5,
    );
    assert.ok(Math.abs(placement.row + 0.5 - center.y) <= 0.5);
  }
});
