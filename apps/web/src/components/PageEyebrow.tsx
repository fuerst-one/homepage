import type { ReactNode } from "react";

export function PageEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[0.65rem] uppercase tracking-[0.25em] text-neutral-400">
      {children}
    </p>
  );
}
