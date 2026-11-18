"use client";

import dynamic from "next/dynamic";
const VisitorProfile = dynamic(() => import("./VisitorProfile"), {
  ssr: false,
});
export function VisitorProfileEntry() {
  return <VisitorProfile />;
}
