export type SpaceViewport = {
  orbit: {
    position: [number, number, number];
    target: [number, number, number];
  };
  network?: { zoom: number; center?: (number | string)[] };
};

/** One viewport for the workbench, never one per aggregation. */
export function createSpaceViewport(): SpaceViewport {
  return { orbit: { position: [6.4, 3.5, 8.7], target: [0, 0, 0] } };
}
