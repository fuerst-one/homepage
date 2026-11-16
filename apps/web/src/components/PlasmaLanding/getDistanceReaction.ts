import { PlasmaMotion } from "../Plasma/motion";
import { FrameBounds } from "../Plasma/types";

type Point = { x: number; y: number };

export function getDistanceReaction({
  cursor,
  origin,
  bounds,
  calmRadius,
}: {
  cursor: Point | null;
  origin: Point;
  bounds: FrameBounds;
  calmRadius: number;
}): PlasmaMotion {
  const outerRadius = Math.hypot(
    Math.max(origin.x, bounds.width - origin.x),
    Math.max(origin.y, bounds.height - origin.y),
  );
  const distance = cursor
    ? Math.hypot(cursor.x - origin.x, cursor.y - origin.y)
    : 0;
  const outward = Math.max(
    0,
    Math.min(
      1,
      (distance - calmRadius) / Math.max(1, outerRadius - calmRadius),
    ),
  );
  // Smooth start at the calm zone, with a stronger fade toward the edges.
  const intensity = outward * outward * (3 - 2 * outward);
  return {
    brightness: 1.3 * (1 - intensity) ** 2 + 0.03 * intensity,
    // The original cycle is 5s: 12s near the wordmark, 1.5s at the edge.
    glitchFrequency: (1 - intensity) * (5 / 12) + intensity * (5 / 1.5),
  };
}
