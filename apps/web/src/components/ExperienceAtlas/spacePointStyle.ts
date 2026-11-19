/** A white core marks selection without replacing the cluster colour. */
export function selectedPointFill(color: string) {
  return {
    type: "radial" as const,
    x: 0.5,
    y: 0.5,
    r: 0.5,
    colorStops: [
      { offset: 0, color: "#ffffff" },
      { offset: 0.25, color: "#ffffff" },
      { offset: 0.3, color },
      { offset: 1, color },
    ],
  };
}

const MUTED_POINT = { color: "#737373", opacity: 0.28, scale: 0.6 };

/** Filtered-out projects stay locatable, but never compete with results or cluster fades. */
export function pointAppearance({
  color,
  muted,
  emphasized,
  clusterSelected,
  isPoint,
}: {
  color: string;
  muted: boolean;
  emphasized: boolean;
  clusterSelected: boolean;
  isPoint: boolean;
}) {
  if (muted) return MUTED_POINT;
  return {
    color,
    opacity: emphasized ? 1 : clusterSelected ? 0.16 : isPoint ? 0.38 : 0.6,
    scale: 1,
  };
}
