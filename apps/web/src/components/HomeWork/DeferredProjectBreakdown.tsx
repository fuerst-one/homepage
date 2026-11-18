"use client";

import dynamic from "next/dynamic";
import { DeferredWorkView } from "./DeferredWorkView";
import type ProjectBreakdownChart from "./ProjectBreakdownChart";
import type { ComponentProps } from "react";

const Chart = dynamic(() => import("./ProjectBreakdownChart"), { ssr: false });

export function DeferredProjectBreakdown(
  props: ComponentProps<typeof ProjectBreakdownChart>,
) {
  return (
    <DeferredWorkView>
      <Chart {...props} />
    </DeferredWorkView>
  );
}
