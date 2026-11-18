import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** A solid pointer hand touching a raised interface button. */
export function createHandCursorGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const add = (
    geometry: THREE.BufferGeometry,
    tone: number,
    at: [number, number, number],
  ) => {
    geometry.translate(...at);
    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(
        new Float32Array(geometry.attributes.position.count * 3).fill(tone),
        3,
      ),
    );
    parts.push(geometry.index ? geometry.toNonIndexed() : geometry);
    if (geometry.index) geometry.dispose();
  };

  // A darker plinth leaves a readable step around the raised button face.
  add(
    new RoundedBoxGeometry(2.1, 0.96, 0.3, 3, 0.14),
    0.52,
    [-0.64, 1.02, -0.26],
  );
  add(new RoundedBoxGeometry(1.82, 0.7, 0.2, 3, 0.12), 1, [-0.64, 1.02, -0.02]);

  const hand = new THREE.Shape();
  hand.moveTo(-0.65, -0.38);
  hand.lineTo(-0.65, 0.94);
  hand.bezierCurveTo(-0.65, 1.2, -0.27, 1.2, -0.27, 0.94);
  hand.lineTo(-0.27, 0.16);
  hand.bezierCurveTo(-0.27, 0.46, 0.12, 0.46, 0.12, 0.16);
  hand.lineTo(0.12, -0.02);
  hand.bezierCurveTo(0.12, 0.3, 0.5, 0.3, 0.5, 0.04);
  hand.lineTo(0.5, -0.13);
  hand.bezierCurveTo(0.5, 0.12, 0.87, 0.12, 0.87, -0.17);
  hand.lineTo(0.87, -0.66);
  hand.bezierCurveTo(0.87, -1.04, 0.64, -1.12, 0.5, -1.36);
  hand.lineTo(0.5, -1.5);
  hand.lineTo(-0.39, -1.5);
  hand.lineTo(-0.39, -1.35);
  hand.bezierCurveTo(-0.65, -1.12, -0.8, -0.94, -0.94, -0.71);
  hand.lineTo(-1.23, -0.26);
  hand.bezierCurveTo(-1.42, 0.04, -1.09, 0.24, -0.9, -0.03);
  hand.lineTo(-0.65, -0.38);
  hand.closePath();

  const pointer = new THREE.ExtrudeGeometry(hand, {
    depth: 0.28,
    bevelEnabled: true,
    bevelSize: 0.055,
    bevelThickness: 0.065,
    bevelSegments: 3,
    curveSegments: 12,
    steps: 1,
  });
  add(pointer, 1.2, [0.17, -0.13, 0.22]);
  add(
    new RoundedBoxGeometry(1.08, 0.26, 0.42, 3, 0.055),
    0.68,
    [0.22, -1.57, 0.36],
  );

  const geometry = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  if (!geometry) throw new Error("Could not build hand cursor sculpture");
  geometry.center();
  geometry.rotateZ(-0.16);
  geometry.computeBoundingSphere();
  return geometry;
}
