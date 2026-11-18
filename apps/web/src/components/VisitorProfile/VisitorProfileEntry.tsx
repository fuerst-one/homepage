"use client";

import dynamic from "next/dynamic";
const VisitorProfile = dynamic(() => import("./VisitorProfile"), {
  ssr: false,
});
export function VisitorProfileEntry() {
  return (
    <>
      <VisitorProfile />
      {/* Keep footer controls reachable above the fixed profile launcher. */}
      <div aria-hidden="true" className="h-20 shrink-0 print:hidden" />
    </>
  );
}
