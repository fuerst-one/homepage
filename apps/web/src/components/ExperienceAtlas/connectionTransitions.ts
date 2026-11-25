import type { ConnectionEdge } from "./connectionGraph";
import {
  connectionSpringStrength,
  type ConnectionPoint,
} from "./connectionSimulation";

/** Blend spring strengths without moving nodes or inventing connections between unrelated IDs. */
export function blendConnectionLinks(
  from: ConnectionEdge[],
  to: ConnectionEdge[],
  progress: number,
  contrast = 2.75,
): ConnectionEdge[] {
  if (progress >= 1) return to;
  const t = Math.max(0, progress);
  const eased = t * t * (3 - 2 * t);
  const previous = new Map(from.map((edge) => [edge.id, edge]));
  const target = new Map(to.map((edge) => [edge.id, edge]));
  return [...new Set([...previous.keys(), ...target.keys()])].map((id) => {
    const start = previous.get(id)?.score ?? 0;
    const end = target.get(id)?.score ?? 0;
    const oldEdge = previous.get(id),
      newEdge = target.get(id);
    const adaptive =
      oldEdge?.springStrength !== undefined ||
      newEdge?.springStrength !== undefined;
    const oldSpring = oldEdge ? connectionSpringStrength(oldEdge, contrast) : 0;
    const newSpring = newEdge ? connectionSpringStrength(newEdge, contrast) : 0;
    return {
      ...(target.get(id) ?? previous.get(id))!,
      score: start + (end - start) * eased,
      ...(adaptive
        ? { springStrength: oldSpring + (newSpring - oldSpring) * eased }
        : {}),
    };
  });
}

export type DepthTransition = {
  flat: boolean;
  extent: number;
  from: Map<string, number>;
  to: ReadonlyMap<string, number>;
};

export function createDepthTransition(
  points: ReadonlyMap<string, ConnectionPoint>,
  flat: boolean,
  savedDepths: ReadonlyMap<string, number>,
): DepthTransition {
  const from = new Map([...points].map(([id, point]) => [id, point.z]));
  return {
    flat,
    extent: Math.max(0, ...[...from.values()].map(Math.abs)),
    from,
    to: new Map(savedDepths),
  };
}

/** Two closing depth limits squeeze the live simulation onto XY; reopening restores depth only. */
export function applyDepthTransition(
  points: ReadonlyMap<string, ConnectionPoint>,
  transition: DepthTransition,
  progress: number,
  pinned: ConnectionPoint | null = null,
) {
  const t = Math.max(0, Math.min(1, progress));
  const eased = t * t * (3 - 2 * t);
  const limit = transition.extent * (1 - eased);
  for (const [id, point] of points) {
    if (point === pinned) continue;
    if (transition.flat) {
      if (t === 1 || Math.abs(point.z) > limit) {
        point.z = t === 1 ? 0 : Math.max(-limit, Math.min(limit, point.z));
        point.vz = 0;
      }
    } else {
      const from = transition.from.get(id) ?? point.z;
      point.z = from + ((transition.to.get(id) ?? from) - from) * eased;
      point.vz = 0;
    }
  }
}
