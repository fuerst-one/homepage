import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type Placement = {
  at?: [number, number, number];
  rotation?: [number, number, number];
  tone?: number;
};

const place = (
  geometry: THREE.BufferGeometry,
  { at = [0, 0, 0], rotation = [0, 0, 0], tone = 1 }: Placement = {},
) => {
  geometry.rotateX(rotation[0]);
  geometry.rotateY(rotation[1]);
  geometry.rotateZ(rotation[2]);
  geometry.translate(...at);
  const colors = new Float32Array(geometry.attributes.position.count * 3).fill(
    tone,
  );
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
};

const box = (
  width: number,
  height: number,
  depth: number,
  placement: Placement = {},
) =>
  place(
    new RoundedBoxGeometry(
      width,
      height,
      depth,
      3,
      Math.min(0.1, depth / 3, width / 4, height / 4),
    ),
    placement,
  );

const plate = (
  points: [number, number][],
  depth: number,
  placement: Placement = {},
) => {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) =>
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y),
  );
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.035,
    bevelThickness: 0.035,
    bevelSegments: 3,
    steps: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  return place(geometry, placement);
};

const combine = (parts: THREE.BufferGeometry[]) => {
  const nonIndexed = parts.map((part) =>
    part.index ? part.toNonIndexed() : part,
  );
  const geometry = mergeGeometries(nonIndexed);
  for (const part of nonIndexed) if (!parts.includes(part)) part.dispose();
  for (const part of parts) part.dispose();
  if (!geometry) throw new Error("Could not build landing sculpture");
  geometry.computeBoundingSphere();
  return geometry;
};

const createProjectCards = () => {
  const cards = [
    { x: -0.72, y: 0.24, z: -0.3, angle: 0.28 },
    { x: 0.72, y: 0.24, z: 0, angle: -0.28 },
    { x: 0, y: -0.25, z: 0.3, angle: 0.03 },
  ].map(({ x, y, z, angle }) => {
    const card = combine([
      box(1.65, 1.6, 0.12, { tone: 0.45 }),
      ...[-0.76, 0.76].map((edgeX) =>
        box(0.09, 1.6, 0.07, { at: [edgeX, 0, 0.09] }),
      ),
      ...[-0.75, 0.75].map((edgeY) =>
        box(1.6, 0.09, 0.07, { at: [0, edgeY, 0.09] }),
      ),
      box(1.25, 0.62, 0.08, { at: [0, 0.25, 0.1], tone: 0.85 }),
      box(0.95, 0.1, 0.09, { at: [-0.15, -0.28, 0.1] }),
      box(0.65, 0.09, 0.08, { at: [-0.3, -0.52, 0.1], tone: 0.8 }),
    ]);
    // Transform the assembled card without replacing its surface tones.
    card.rotateZ(angle);
    card.translate(x, y, z);
    return card;
  });
  return combine(cards);
};

const createEnvelope = () =>
  combine([
    box(2, 1.32, 0.4, { at: [0, -0.22, -0.1], tone: 0.6 }),
    box(1.48, 1.52, 0.12, {
      at: [0, 0.4, -0.02],
      rotation: [0, 0, -0.08],
      tone: 1,
    }),
    ...[0.76, 0.53, 0.3].map((y, i) =>
      box(i === 2 ? 0.55 : 0.9, 0.07, 0.05, {
        at: [-0.12, y, 0.075],
        rotation: [0, 0, -0.08],
        tone: 0.55,
      }),
    ),
    plate(
      [
        [-1, 0.4],
        [0.1, -0.28],
        [-1, -0.86],
      ],
      0.2,
      { at: [0, 0, 0.23], tone: 0.82 },
    ),
    plate(
      [
        [1, 0.4],
        [1, -0.86],
        [-0.1, -0.28],
      ],
      0.2,
      { at: [0, 0, 0.26], tone: 0.9 },
    ),
    plate(
      [
        [-1, -0.86],
        [1, -0.86],
        [0, -0.1],
      ],
      0.17,
      { at: [0, 0, 0.37], tone: 0.75 },
    ),
  ]);

const createBriefcase = () =>
  combine([
    box(2, 1.25, 0.66, { at: [0, -0.12, 0], tone: 0.75 }),
    place(new THREE.TorusGeometry(0.35, 0.1, 10, 32, Math.PI), {
      at: [0, 0.53, 0],
      tone: 1,
    }),
    box(1.98, 0.16, 0.12, { at: [0, 0.08, 0.36], tone: 0.55 }),
    ...[-0.57, 0.57].map((x) =>
      box(0.22, 0.3, 0.16, { at: [x, 0.05, 0.43], tone: 1 }),
    ),
    ...[-0.79, 0.79].map((x) =>
      box(0.11, 1.05, 0.1, { at: [x, -0.12, 0.37], tone: 0.6 }),
    ),
  ]);

const createDiscussion = () => {
  const bubbles = [
    { x: -0.38, y: 0.4, z: -0.2, direction: -1, tone: 0.75 },
    { x: 0.38, y: -0.32, z: 0.2, direction: 1, tone: 1 },
  ].map(({ x, y, z, direction, tone }) => {
    const outline = new THREE.Shape();
    outline.moveTo(-0.65, -0.55);
    outline.lineTo(-0.6, -0.55);
    outline.lineTo(-0.72, -0.95);
    outline.lineTo(-0.14, -0.55);
    outline.lineTo(0.65, -0.55);
    outline.quadraticCurveTo(0.85, -0.55, 0.85, -0.35);
    outline.lineTo(0.85, 0.35);
    outline.quadraticCurveTo(0.85, 0.55, 0.65, 0.55);
    outline.lineTo(-0.65, 0.55);
    outline.quadraticCurveTo(-0.85, 0.55, -0.85, 0.35);
    outline.lineTo(-0.85, -0.35);
    outline.quadraticCurveTo(-0.85, -0.55, -0.65, -0.55);
    outline.closePath();

    const opening = new THREE.Path();
    opening.moveTo(-0.59, -0.39);
    opening.lineTo(0.59, -0.39);
    opening.quadraticCurveTo(0.69, -0.39, 0.69, -0.29);
    opening.lineTo(0.69, 0.29);
    opening.quadraticCurveTo(0.69, 0.39, 0.59, 0.39);
    opening.lineTo(-0.59, 0.39);
    opening.quadraticCurveTo(-0.69, 0.39, -0.69, 0.29);
    opening.lineTo(-0.69, -0.29);
    opening.quadraticCurveTo(-0.69, -0.39, -0.59, -0.39);
    opening.closePath();
    outline.holes.push(opening);

    const frame = new THREE.ExtrudeGeometry(outline, {
      depth: 0.2,
      bevelEnabled: true,
      bevelSize: 0.025,
      bevelThickness: 0.025,
      bevelSegments: 3,
      curveSegments: 8,
      steps: 1,
    });
    frame.translate(0, 0, -0.1);
    if (direction === 1) frame.rotateY(Math.PI);
    const bubble = combine([
      place(frame, { tone }),
      ...[-0.36, 0, 0.36].map((dotX) =>
        place(new THREE.SphereGeometry(0.115, 12, 8), {
          at: [dotX, 0, 0.04],
          tone,
        }),
      ),
    ]);
    bubble.rotateZ(direction * 0.06);
    bubble.translate(x, y, z);
    return bubble;
  });
  return combine(bubbles);
};

const createGear = () => {
  const shape = new THREE.Shape();
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * Math.PI * 2;
    const radius = i % 4 < 2 ? 0.98 : 0.79;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.3, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const gear = new THREE.ExtrudeGeometry(shape, {
    depth: 0.42,
    bevelEnabled: true,
    bevelSize: 0.055,
    bevelThickness: 0.055,
    bevelSegments: 3,
    curveSegments: 24,
  });
  gear.translate(0, 0, -0.21);
  return combine([
    place(gear, { tone: 0.8 }),
    place(new THREE.TorusGeometry(0.34, 0.09, 10, 32), {
      at: [0, 0, 0.25],
      tone: 1,
    }),
    place(new THREE.TorusGeometry(0.34, 0.09, 10, 32), {
      at: [0, 0, -0.25],
      tone: 1,
    }),
  ]);
};

/** Original layered sculptures are constructed only when selected. */
const NAVIGATION_GEOMETRIES = [
  createProjectCards,
  createEnvelope,
  createBriefcase,
  createDiscussion,
  createGear,
  () => place(new THREE.TorusKnotGeometry(0.72, 0.23, 100, 16)),
];

export const createLandingGeometry = (index: number): THREE.BufferGeometry => {
  const geometry = (NAVIGATION_GEOMETRIES[index] ?? createProjectCards)();
  geometry.computeBoundingSphere();
  return geometry;
};
