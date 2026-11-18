export const SPACE_TRANSITION_MS = 800;
export type SpatialNode = {
  id: string;
  point: number[];
  color: string;
  opacity: number;
};

/** Match identities, retaining outgoing points until their fade finishes. */
export function interpolateSpaceNodes<T extends SpatialNode>(
  from: T[],
  to: T[],
  progress: number,
): T[] {
  const t = Math.max(0, Math.min(1, progress));
  if (t === 1) return to;
  const before = new Map(from.map((n) => [n.id, n]));
  const targetIds = new Set(to.map((n) => n.id));
  const mix = (a: number, b: number) => a + (b - a) * t;
  const color = (a: string, b: string) =>
    "#" +
    [1, 3, 5]
      .map((i) =>
        Math.round(
          mix(parseInt(a.slice(i, i + 2), 16), parseInt(b.slice(i, i + 2), 16)),
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  return [
    ...to.map((node) => {
      const old = before.get(node.id);
      return {
        ...node,
        point: node.point.map((v, i) => mix(old?.point[i] ?? v, v)),
        color: old ? color(old.color, node.color) : node.color,
        opacity: mix(old?.opacity ?? 0, node.opacity),
      };
    }),
    ...from
      .filter((node) => !targetIds.has(node.id))
      .map((node) => ({ ...node, opacity: node.opacity * (1 - t) })),
  ];
}
