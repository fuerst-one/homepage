import type { Intersection } from "three";

export function prioritizeSpaceHits<T extends Intersection>(items: T[]): T[] {
  return items
    .filter(({ object }) => {
      for (
        let current: typeof object | null = object;
        current;
        current = current.parent
      ) {
        if (!current.visible) return false;
      }
      return true;
    })
    .sort(
      (a, b) =>
        (b.object.userData.pickPriority ?? 0) -
          (a.object.userData.pickPriority ?? 0) || a.distance - b.distance,
    );
}
