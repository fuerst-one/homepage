import type { GraphSeriesOption } from "echarts";

/** Shared spring tuning; scale lengths and repulsion together for small plots. */
export function graphSpringForces(
  repulsion: number,
  motion: boolean,
  scale = 1,
): GraphSeriesOption["force"] {
  return {
    initLayout: "circular",
    repulsion: repulsion * scale ** 2,
    gravity: 0.055,
    edgeLength: [65 * scale, 210 * scale],
    friction: 0.6,
    layoutAnimation: motion,
  };
}

export function interactiveSpringForces(
  repulsion: number,
  gentle: boolean,
  scale = 1,
): GraphSeriesOption["force"] {
  return {
    ...graphSpringForces(repulsion, true, scale),
    // Keep drag updates asynchronous even with reduced motion. ECharts' sync
    // solver overwrites the dragged position before fixing the node in place.
    // A smaller initial force also cools much sooner (about two seconds).
    friction: gentle ? 0.03 : 0.6,
  };
}
