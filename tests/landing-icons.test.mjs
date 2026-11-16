import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { loadTs as loadSourceTs } from "./helpers/load-ts.mjs";
const loadTs = (path) => loadSourceTs(new URL(path, import.meta.url));

test("React and React Native suggestions select the atom instead of the generic tool", () => {
  const { getKeywordIconShape, iconShape } = loadTs(
    "../apps/web/src/components/PlasmaLanding/iconCatalog.ts",
  );
  assert.equal(getKeywordIconShape("tools", "React.js", 4), iconShape("react"));
  assert.equal(
    getKeywordIconShape("tools", "React Native", 4),
    iconShape("react"),
  );
  assert.equal(getKeywordIconShape("tools", "Docker", 4), 4);
  assert.equal(getKeywordIconShape("clients", "React.js", 1), 1);
});

test("the Notion seed covers published projects and unknown icon values keep a safe fallback", () => {
  const { ICON_IDS, getProjectIconShape, iconShape } = loadTs(
    "../apps/web/src/components/PlasmaLanding/iconCatalog.ts",
  );
  const PROJECT_ICONS = JSON.parse(
    readFileSync(
      new URL("../ops/notion/project-icons-seed.json", import.meta.url),
      "utf8",
    ),
  );
  const slugs = JSON.parse(
    readFileSync(
      new URL(
        "../packages/content/src/data/project-slugs.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (const slug of Object.values(slugs)) {
    assert.ok(PROJECT_ICONS[slug], `Choose an icon for ${slug}`);
    assert.ok(ICON_IDS.includes(PROJECT_ICONS[slug]));
    assert.equal(
      getProjectIconShape(PROJECT_ICONS[slug]),
      iconShape(PROJECT_ICONS[slug]),
    );
  }
  assert.equal(getProjectIconShape("route"), iconShape("route"));
  assert.equal(getProjectIconShape("brain"), iconShape("brain"));
  assert.equal(getProjectIconShape("unrecognized"), 0);
  assert.equal(getProjectIconShape(null), 0);
});

test("project icon metadata reads the Notion select and tolerates missing or empty choices", () => {
  const { readProjectIcons } = loadTs(
    "../apps/sync/src/notion/projectIcons.ts",
  );
  assert.deepEqual(
    readProjectIcons([
      {
        object: "page",
        id: "route",
        properties: {
          "3D Icon": { type: "select", select: { name: "route" } },
        },
      },
      {
        object: "page",
        id: "empty",
        properties: { "3D Icon": { type: "select", select: null } },
      },
      { object: "page", id: "old", properties: {} },
      { object: "page", id: "partial" },
      {
        object: "database",
        id: "database",
        properties: { "3D Icon": { type: "select", select: { options: [] } } },
      },
    ]),
    { route: "route", empty: null, old: null },
  );
});

test("the public project API exposes editable icon choices without SVG or private fields", async () => {
  const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
  const response = await fetch(`${base}/api/projects`);
  assert.equal(response.status, 200);
  const { results } = await response.json();
  assert.ok(results.some((project) => typeof project.icon === "string"));
  for (const project of results) {
    assert.ok(project.icon === null || typeof project.icon === "string");
    assert.equal(project.svg, undefined);
    assert.equal(project.email, undefined);
  }
});

test("the icon transformer produces centered 3D geometry from a shape with holes", () => {
  const require = createRequire(
    new URL("../apps/web/package.json", import.meta.url),
  );
  const THREE = require("three");
  const { extrudeIconShapes } = loadTs(
    "../apps/web/src/components/PlasmaLanding/iconGeometries.ts",
  );
  const shape = new THREE.Shape();
  shape.moveTo(100, 100);
  shape.lineTo(600, 100);
  shape.lineTo(600, 600);
  shape.lineTo(100, 600);
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(350, 350, 100, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geometry = extrudeIconShapes([shape]);
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  assert.ok(
    bounds.max.z - bounds.min.z > 0,
    "real depth, rather than a textured plane",
  );
  const center = bounds.getCenter(new THREE.Vector3());
  assert.ok(center.length() < 0.001, "centered for rotation");
  assert.ok([...geometry.attributes.position.array].every(Number.isFinite));
  assert.equal(
    geometry.attributes.color.count,
    geometry.attributes.position.count,
  );
  geometry.dispose();
});

test("the React model has finite geometry extending into all three axes", () => {
  const { createReactGeometry } = loadTs(
    "../apps/web/src/components/PlasmaLanding/iconGeometries.ts",
  );
  const geometry = createReactGeometry();
  geometry.computeBoundingBox();
  for (const axis of ["x", "y", "z"])
    assert.ok(
      geometry.boundingBox.max[axis] - geometry.boundingBox.min[axis] > 0,
    );
  assert.ok([...geometry.attributes.position.array].every(Number.isFinite));
  geometry.dispose();
});

test("3D icons build only when selected, reuse their geometry, and release it once", () => {
  const { createGeometryCache } = loadTs(
    "../apps/web/src/components/PlasmaPlayground/createGeometryCache.ts",
  );
  const { createReactGeometry } = loadTs(
    "../apps/web/src/components/PlasmaLanding/iconGeometries.ts",
  );
  const base = createReactGeometry();
  let built = 0;
  let disposed = 0;
  const cache = createGeometryCache([base], () => {
    built++;
    const geometry = createReactGeometry();
    geometry.addEventListener("dispose", () => disposed++);
    return geometry;
  });
  assert.equal(built, 0);
  assert.equal(cache.get(0), base);
  const selected = cache.get(6);
  assert.equal(cache.get(6), selected);
  assert.equal(built, 1);
  cache.dispose();
  assert.equal(disposed, 1);
});

test("navigation sculptures can be generated one at a time through the same lazy cache", () => {
  const { createLandingGeometry } = loadTs(
    "../apps/web/src/components/PlasmaLanding/shapeGeometries.ts",
  );
  const { createGeometryCache } = loadTs(
    "../apps/web/src/components/PlasmaPlayground/createGeometryCache.ts",
  );
  const requested = [];
  const cache = createGeometryCache([], (index) => {
    requested.push(index);
    return createLandingGeometry(index);
  });
  assert.deepEqual(requested, []);
  const folder = cache.get(0);
  assert.equal(cache.get(0), folder);
  assert.deepEqual(requested, [0]);
  const envelope = cache.get(1);
  assert.notEqual(envelope, folder);
  assert.deepEqual(requested, [0, 1]);
  const discussion = cache.get(3);
  assert.equal(cache.get(3), discussion);
  assert.deepEqual(requested, [0, 1, 3]);
  for (const geometry of [folder, envelope, discussion]) {
    geometry.computeBoundingBox();
    assert.ok(geometry.boundingBox.max.z > geometry.boundingBox.min.z);
    assert.ok([...geometry.attributes.position.array].every(Number.isFinite));
  }
  cache.dispose();
});

test("the lightweight icon IDs stay aligned with the deferred SVG catalog", () => {
  const { ICON_IDS } = loadTs(
    "../apps/web/src/components/PlasmaLanding/iconCatalog.ts",
  );
  const icons = JSON.parse(
    readFileSync(
      new URL("../apps/web/src/data/landing-icon-svgs.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(ICON_IDS, ["react", ...Object.keys(icons)]);
});
