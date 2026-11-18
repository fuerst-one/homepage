import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const THREE = require("three");
const { orbitCameraWithKey } = loadTs(
  new URL(
    "../apps/web/src/components/PlasmaPlayground/orbitCameraWithKey.ts",
    import.meta.url,
  ),
);
const scene = () => {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 0, 5);
  const controls = {
    target: new THREE.Vector3(),
    keyRotateSpeed: 8,
    minPolarAngle: 0,
    maxPolarAngle: Math.PI,
    minAzimuthAngle: -Infinity,
    maxAzimuthAngle: Infinity,
    update() {},
  };
  return { camera, controls };
};

test("ordinary arrows and unrelated Shift keys remain available to the browser", () => {
  const { camera, controls } = scene();
  for (const event of [
    { key: "ArrowDown", shiftKey: false },
    { key: "Tab", shiftKey: true },
  ])
    assert.equal(orbitCameraWithKey(camera, controls, event, 400), false);
  assert.deepEqual(camera.position.toArray(), [0, 0, 5]);
});

test("Shift plus each arrow orbits around the target without changing the viewing distance", () => {
  for (const [key, axis, sign] of [
    ["ArrowRight", "x", 1],
    ["ArrowLeft", "x", -1],
    ["ArrowUp", "y", 1],
    ["ArrowDown", "y", -1],
  ]) {
    const { camera, controls } = scene();
    assert.equal(
      orbitCameraWithKey(camera, controls, { key, shiftKey: true }, 400),
      true,
    );
    assert.ok(camera.position[axis] * sign > 0);
    assert.ok(Math.abs(camera.position.distanceTo(controls.target) - 5) < 1e-8);
  }
});

test("repeated keyboard rotation respects the orbit's pole limits", () => {
  const { camera, controls } = scene();
  for (let i = 0; i < 100; i++)
    orbitCameraWithKey(
      camera,
      controls,
      { key: "ArrowUp", shiftKey: true },
      400,
    );
  assert.ok(camera.position.toArray().every(Number.isFinite));
  assert.ok(camera.position.y > 4.9);
  assert.ok(Math.abs(camera.position.length() - 5) < 1e-8);
});
