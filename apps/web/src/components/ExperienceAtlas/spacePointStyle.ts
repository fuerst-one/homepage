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
