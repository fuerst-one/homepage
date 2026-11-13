import type { BufferGeometry } from "three";

/** Each scene owns its geometry; additional catalog entries are built on demand. */
export const createGeometryCache = (
  initial: BufferGeometry[],
  create?: (index: number) => BufferGeometry,
) => {
  const geometries = new Map(
    initial.map((geometry, index) => [index, geometry]),
  );
  return {
    get(index: number): BufferGeometry {
      const cached = geometries.get(index);
      if (cached) return cached;
      const geometry = create?.(index) ?? initial[0];
      if (!geometry) throw new Error("No shape geometry available");
      geometries.set(index, geometry);
      return geometry;
    },
    dispose() {
      for (const geometry of new Set(geometries.values())) geometry.dispose();
      geometries.clear();
    },
  };
};
