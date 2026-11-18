import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { loadTs } from "./helpers/load-ts.mjs";

const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const echarts = require("echarts");
const { interactiveSpringForces } = loadTs(
  new URL(
    "../apps/web/src/components/ProjectLab/graphForces.ts",
    import.meta.url,
  ),
);

for (const gentle of [false, true]) {
  test(`drag follows the pointer with ${gentle ? "gentle" : "full"} springs`, async () => {
    const chart = echarts.init(null, null, {
      renderer: "svg",
      ssr: true,
      width: 800,
      height: 500,
    });
    try {
      chart.setOption({
        animation: false,
        series: [
          {
            type: "graph",
            layout: "force",
            draggable: true,
            force: interactiveSpringForces(260, gentle),
            data: [{ id: "a" }, { id: "b" }, { id: "c" }],
            links: [
              { source: "a", target: "b" },
              { source: "b", target: "c" },
            ],
          },
        ],
      });
      // Exercise ECharts' real drag handler: it used to settle synchronously,
      // overwriting the pointer's new position before recording the move.
      const data = chart.getModel().getSeriesByIndex(0).getData();
      const neighbourBefore = [...data.getItemLayout(1)];
      const element = data.getItemGraphicEl(0);
      const target = [element.x + 100, element.y + 70];
      element.x = target[0];
      element.y = target[1];
      element.trigger("drag", { offsetX: target[0], offsetY: target[1] });
      assert.ok(Math.abs(data.getItemLayout(0)[0] - target[0]) < 1);
      assert.ok(Math.abs(data.getItemLayout(0)[1] - target[1]) < 1);
      await new Promise((resolve) => setTimeout(resolve, 50));
      assert.deepEqual(
        data.getItemLayout(0),
        target,
        "held node stays at the pointer",
      );
      assert.ok(
        Math.hypot(
          ...data
            .getItemLayout(1)
            .map((value, i) => value - neighbourBefore[i]),
        ) > 0.01,
        "linked neighbours respond to the spring",
      );
      element.trigger("dragend", {});
      await new Promise((resolve) => setTimeout(resolve, 50));
      assert.ok(
        Math.hypot(
          ...data.getItemLayout(0).map((value, i) => value - target[i]),
        ) > 0.01,
        "released node relaxes back into the network",
      );
    } finally {
      chart.dispose();
    }
  });
}
