import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
import { createRequire } from "node:module";

const requireWeb = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const {
  BoxGeometry,
  SphereGeometry,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
} = requireWeb("three");

const { prioritizeSpaceHits } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/spacePicking.ts",
    import.meta.url,
  ),
);
const hit = (name, distance, priority, parent) => ({
  name,
  distance,
  object: { visible: true, userData: { pickPriority: priority }, parent },
});

test("a project behind a transparent envelope wins pointer picking", () => {
  const hull = hit("hull", 2, -1);
  const bubble = hit("bubble", 5, 2);
  const label = hit("label", 6, 3);
  assert.deepEqual(
    prioritizeSpaceHits([hull, bubble]).map((h) => h.name),
    ["bubble", "hull"],
  );
  assert.deepEqual(
    prioritizeSpaceHits([hull, bubble, label]).map((h) => h.name),
    ["label", "bubble", "hull"],
  );
});

test("overlapping clusters keep nearest-first picking; faded-out objects cannot hover", () => {
  const far = hit("far", 7, -1);
  const near = hit("near", 2, -1);
  const hidden = hit("hidden bubble", 1, 2, { visible: false });
  assert.deepEqual(
    prioritizeSpaceHits([far, hidden, near]).map((h) => h.name),
    ["near", "far"],
  );
});

test("a real 3D ray can hover an envelope while still reaching the bubble inside it", () => {
  const material = new MeshBasicMaterial();
  const envelope = new Mesh(new BoxGeometry(4, 4, 4), material);
  const bubble = new Mesh(new SphereGeometry(0.5, 16, 12), material);
  envelope.userData.pickPriority = -1;
  bubble.userData.pickPriority = 2;
  const ray = new Raycaster(new Vector3(0, 0, 10), new Vector3(0, 0, -1));
  const hits = ray.intersectObjects([envelope, bubble]);
  assert.equal(hits[0].object, envelope);
  assert.equal(prioritizeSpaceHits(hits)[0].object, bubble);
  ray.set(new Vector3(1, 0, 10), new Vector3(0, 0, -1));
  assert.equal(
    prioritizeSpaceHits(ray.intersectObjects([envelope, bubble]))[0].object,
    envelope,
  );
  envelope.geometry.dispose();
  bubble.geometry.dispose();
  material.dispose();
});
