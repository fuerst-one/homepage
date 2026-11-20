import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { getAreOverlaysHidden, OVERLAY_IDLE_MS } = loadTs(
  new URL(
    "../apps/web/src/components/PlasmaPlayground/useIdleOverlays.ts",
    import.meta.url,
  ),
);

test("playground overlays stay visible while the visitor is active", () => {
  assert.equal(
    getAreOverlaysHidden({
      msSinceActivity: OVERLAY_IDLE_MS - 1,
      isPinned: false,
    }),
    false,
  );
});

test("playground overlays fade once the visitor has been idle long enough", () => {
  assert.equal(
    getAreOverlaysHidden({ msSinceActivity: OVERLAY_IDLE_MS, isPinned: false }),
    true,
  );
});

test("pinned playground overlays never fade, however long the visitor is idle", () => {
  assert.equal(
    getAreOverlaysHidden({
      msSinceActivity: OVERLAY_IDLE_MS * 100,
      isPinned: true,
    }),
    false,
  );
});
