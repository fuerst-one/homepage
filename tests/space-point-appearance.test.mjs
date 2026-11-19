import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { pointAppearance } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/spacePointStyle.ts",
    import.meta.url,
  ),
);
const cyan = "#65e6f0";
const appearance = (overrides = {}) =>
  pointAppearance({
    color: cyan,
    muted: false,
    emphasized: true,
    clusterSelected: false,
    isPoint: true,
    ...overrides,
  });

test("a current result keeps its cluster colour at full size and opacity", () => {
  assert.deepEqual(appearance(), { color: cyan, opacity: 1, scale: 1 });
});

test("a filtered-out project turns neutral grey, fainter than any fade, and smaller", () => {
  const muted = appearance({ muted: true });
  const [r, g, b] = [1, 3, 5].map((at) => muted.color.slice(at, at + 2));
  assert.ok(r === g && g === b, `${muted.color} is a neutral grey`);
  assert.ok(muted.opacity < appearance({ emphasized: false }).opacity);
  assert.ok(muted.scale < 1);
});

test("hovering a filtered-out project does not bring it back", () => {
  assert.deepEqual(
    appearance({ muted: true, emphasized: true }),
    appearance({ muted: true, emphasized: false }),
  );
});

test("results outside a hovered cluster keep their colour and size but fade", () => {
  assert.deepEqual(appearance({ emphasized: false }), {
    color: cyan,
    opacity: 0.38,
    scale: 1,
  });
  assert.equal(appearance({ emphasized: false, isPoint: false }).opacity, 0.6);
  assert.equal(
    appearance({ emphasized: false, clusterSelected: true }).opacity,
    0.16,
  );
});
