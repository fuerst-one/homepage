import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const geometrySource = new URL(
  "../apps/web/src/components/Services/handCursorGeometry.ts",
  import.meta.url,
);

test("the hand cursor provides finite geometry and surface tones for the glyph shader", () => {
  const { createHandCursorGeometry } = loadTs(geometrySource);
  const geometry = createHandCursorGeometry();
  for (const name of ["position", "normal", "color"]) {
    assert.ok(geometry.attributes[name]?.count > 0);
    assert.ok([...geometry.attributes[name].array].every(Number.isFinite));
  }
  assert.equal(
    geometry.attributes.color.count,
    geometry.attributes.position.count,
  );
  assert.ok(Number.isFinite(geometry.boundingSphere?.radius));
  assert.ok(geometry.boundingSphere.radius > 0);
  geometry.dispose();
});

test("the service sculpture works with the existing lazy geometry cache and releases its mesh once", () => {
  const { createHandCursorGeometry } = loadTs(geometrySource);
  const { createGeometryCache } = loadTs(
    new URL(
      "../apps/web/src/components/PlasmaPlayground/createGeometryCache.ts",
      import.meta.url,
    ),
  );
  let created = 0;
  let disposed = 0;
  const cache = createGeometryCache([], () => {
    created++;
    const geometry = createHandCursorGeometry();
    geometry.addEventListener("dispose", () => disposed++);
    return geometry;
  });
  assert.equal(created, 0);
  const first = cache.get(0);
  assert.equal(cache.get(0), first);
  assert.equal(created, 1);
  cache.dispose();
  assert.equal(disposed, 1);
});
