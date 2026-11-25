import type { ConnectionEdge } from "./connectionGraph";

export type ConnectionPoint = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
};

type Spring = Pick<
  ConnectionEdge,
  "source" | "target" | "score" | "springStrength"
>;

export function connectionSpringStrength(edge: Spring, contrast: number) {
  return edge.springStrength ?? 0.048 * Math.pow(edge.score, contrast);
}

/** Keep positions and momentum by project identity, including when the input arrays change. */
export function syncConnectionPoints(
  points: Map<string, ConnectionPoint>,
  nodes: { id: string }[],
) {
  const ids = new Set(nodes.map((node) => node.id));
  for (const id of points.keys()) if (!ids.has(id)) points.delete(id);
  nodes.forEach((node, i) => {
    if (points.has(node.id)) return;
    const angle = i * 2.399963229728653;
    const z = 1 - (2 * (i + 0.5)) / Math.max(1, nodes.length);
    const radius = Math.sqrt(1 - z * z) * 38;
    points.set(node.id, {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
      z: z * 38,
      vx: 0,
      vy: 0,
      vz: 0,
    });
  });
}

/** One fixed simulation step. Visibility deliberately has no role in the physical model. */
export function stepConnectionSimulation(
  points: Map<string, ConnectionPoint>,
  links: Spring[],
  contrast = 2,
  pinned: ConnectionPoint | null = null,
  containment = 0,
  dimensions: 2 | 3 = 3,
) {
  const positions = [...points.values()];
  // Constant space per project as data grows; a soft wall, not a hard clamp.
  const spacing = dimensions === 2 ? 8 : 15;
  const radius =
    spacing * Math.pow(Math.max(1, positions.length), 1 / dimensions);
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i],
        b = positions[j];
      const dx = b.x - a.x,
        dy = b.y - a.y,
        dz = b.z - a.z;
      const distance2 = dx * dx + dy * dy + dz * dz + 0.01;
      const force = 45 / (distance2 * Math.sqrt(distance2));
      a.vx -= dx * force;
      a.vy -= dy * force;
      a.vz -= dz * force;
      b.vx += dx * force;
      b.vy += dy * force;
      b.vz += dz * force;
    }
  }
  for (const edge of links) {
    const a = points.get(edge.source),
      b = points.get(edge.target);
    if (!a || !b) continue;
    const dx = b.x - a.x,
      dy = b.y - a.y,
      dz = b.z - a.z;
    const distance = Math.max(0.01, Math.hypot(dx, dy, dz));
    // Nonlinear overlap emphasizes strong matches and softens weak bridges.
    // Every positive overlap still attracts; scores and edge membership stay unchanged.
    const strength = connectionSpringStrength(edge, contrast);
    const force = ((distance - 30 / contrast) * strength) / distance;
    a.vx += dx * force;
    a.vy += dy * force;
    a.vz += dz * force;
    b.vx -= dx * force;
    b.vy -= dy * force;
    b.vz -= dz * force;
  }
  for (const point of positions) {
    if (point === pinned) {
      point.vx = point.vy = point.vz = 0;
      continue;
    }
    const distance = Math.hypot(point.x, point.y, point.z);
    const gravity =
      0.0002 +
      containment * 0.02 * Math.max(0, 1 - radius / Math.max(0.01, distance));
    point.vx = (point.vx - point.x * gravity) * 0.88;
    point.vy = (point.vy - point.y * gravity) * 0.88;
    point.vz = (point.vz - point.z * gravity) * 0.88;
    point.x += point.vx;
    point.y += point.vy;
    point.z += point.vz;
  }
}
