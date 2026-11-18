type Point3 = [number, number, number];

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
