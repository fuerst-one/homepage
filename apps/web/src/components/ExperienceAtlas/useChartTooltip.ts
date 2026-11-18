import { useEffect, useMemo, type RefObject } from "react";
import type { EChartsType } from "echarts";
import { createTooltipDismissal } from "./spaceTooltip";

export function useChartTooltip(
  chart: RefObject<EChartsType | null>,
  scope: unknown,
) {
  const tooltip = useMemo(() => createTooltipDismissal(), []);
  useEffect(() => tooltip.leave(), [scope, tooltip]);
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      tooltip.dismiss();
      if (chart.current && !chart.current.isDisposed())
        chart.current.dispatchAction({ type: "hideTip" });
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [chart, tooltip]);
  return tooltip;
}
