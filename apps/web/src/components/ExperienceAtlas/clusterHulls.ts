type Point2 = [number, number];
type Point3 = [number, number, number];

/** Counter-clockwise convex boundary; duplicate and interior points disappear. */
export function convexHull2d(points: number[][]): Point2[] {
  const sorted = [
    ...new Map(
      points.map(([x, y]) => [`${x},${y}`, [x, y] as Point2]),
    ).values(),
  ].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const cross = (a: Point2, b: Point2, c: Point2) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const half = (rows: Point2[]) => {
    const boundary: Point2[] = [];
    for (const p of rows) {
      while (
        boundary.length > 1 &&
        cross(boundary.at(-2)!, boundary.at(-1)!, p) <= 0
      )
        boundary.pop();
      boundary.push(p);
    }
    return boundary.slice(0, -1);
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

/** Circumscribed padding keeps the bubble itself inside the envelope. */
export function paddedHull2d(points: number[][], padding: number): Point2[] {
  const radius = Math.max(0, padding) / Math.cos(Math.PI / 8);
  return convexHull2d(
    points.flatMap(([x, y]) =>
      Array.from({ length: 8 }, (_, i) => [
        x + radius * Math.cos((i * Math.PI) / 4),
        y + radius * Math.sin((i * Math.PI) / 4),
      ]),
    ),
  );
}

/** A small enclosing cube also gives flat/singleton clusters valid 3D volume. */
export function paddedPoints3d(points: number[][], padding: number): Point3[] {
  const r = Math.max(1e-6, padding);
  return points.flatMap(([x, y, z]) =>
    [-1, 1].flatMap((dx) =>
      [-1, 1].flatMap((dy) =>
        [-1, 1].map((dz) => [x + dx * r, y + dy * r, z + dz * r] as Point3),
      ),
    ),
  );
}
