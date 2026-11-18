"use client";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import {
  BarChart,
  LineChart,
  ScatterChart,
  TreemapChart,
} from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { EChartsReactProps } from "echarts-for-react";

echarts.use([
  BarChart,
  LineChart,
  ScatterChart,
  TreemapChart,
  GridComponent,
  TooltipComponent,
  SVGRenderer,
]);
export function WorkChart(props: Omit<EChartsReactProps, "echarts">) {
  return <ReactEChartsCore {...props} echarts={echarts} />;
}
