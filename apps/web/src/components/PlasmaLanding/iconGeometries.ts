import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import icons from "../../data/landing-icon-svgs.json";
import { ICON_IDS } from "./iconCatalog";

const addTone = (geometry: THREE.BufferGeometry, tone = 1) => {
  geometry.setAttribute(
    "color",
    new THREE.BufferAttribute(
      new Float32Array(geometry.attributes.position.count * 3).fill(tone),
      3,
    ),
  );
  return geometry;
};

/** Convert filled vector silhouettes (including holes) to normalized, beveled solids. */
export const extrudeIconShapes = (
  shapes: THREE.Shape[],
): THREE.BufferGeometry => {
  if (!shapes.length) return addTone(new THREE.IcosahedronGeometry(0.9));
  const outline = new THREE.ShapeGeometry(shapes, 8);
  outline.computeBoundingBox();
  const size = outline.boundingBox!.getSize(new THREE.Vector3());
  outline.dispose();
  const scale = 2 / Math.max(size.x, size.y, 1);
  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: 0.34 / scale,
    bevelEnabled: true,
    bevelSize: 0.025 / scale,
    bevelThickness: 0.025 / scale,
    bevelSegments: 2,
    curveSegments: 8,
    steps: 1,
  });
  // SVG is Y-down. Rotate rather than reflecting one axis to retain face winding.
  geometry.rotateX(Math.PI);
  geometry.scale(scale, scale, scale);
  geometry.center();
  addTone(geometry);
  const colors = geometry.attributes.color;
  for (const group of geometry.groups) {
    if (group.materialIndex !== 1) continue;
    for (let i = group.start; i < group.start + group.count; i++)
      colors.setXYZ(i, 0.62, 0.62, 0.62);
  }
  geometry.computeBoundingSphere();
  return geometry;
};

/** Only bundled, trusted SVGs enter the loader; raster logos are never guessed/traced. */
export const createSvgIconGeometry = (svg: string) => {
  const paths = new SVGLoader().parse(svg).paths;
  return extrudeIconShapes(
    paths.flatMap((path) => SVGLoader.createShapes(path)),
  );
};

export const createReactGeometry = () => {
  const parts: THREE.BufferGeometry[] = [
    addTone(new THREE.SphereGeometry(0.2, 20, 12), 1.2),
  ];
  const orbit = new THREE.CatmullRomCurve3(
    Array.from({ length: 64 }, (_, i) => {
      const angle = (i / 64) * Math.PI * 2;
      return new THREE.Vector3(
        Math.cos(angle) * 0.96,
        Math.sin(angle) * 0.37,
        0,
      );
    }),
    true,
  );
  for (let i = 0; i < 3; i++) {
    // Sweeping a round tube avoids thinning its cross-section at the ellipse tips.
    const ring = new THREE.TubeGeometry(orbit, 80, 0.075, 8, true);
    ring.rotateX(0.24);
    ring.rotateZ((i * Math.PI) / 3);
    parts.push(addTone(ring, 1.1 + i * 0.075));
  }
  const nonIndexed = parts.map((part) =>
    part.index ? part.toNonIndexed() : part,
  );
  const geometry = mergeGeometries(nonIndexed)!;
  for (const part of nonIndexed) if (!parts.includes(part)) part.dispose();
  for (const part of parts) part.dispose();
  geometry.computeBoundingSphere();
  return geometry;
};

export const createLandingIconGeometry = (shapeIndex: number) => {
  const id = ICON_IDS[shapeIndex - 6];
  if (!id) return addTone(new THREE.IcosahedronGeometry(0.9));
  return id === "react"
    ? createReactGeometry()
    : createSvgIconGeometry(icons[id]);
};
