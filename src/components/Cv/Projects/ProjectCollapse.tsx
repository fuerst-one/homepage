"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import React, { ReactNode, useState } from "react";

export const ProjectCollapse = ({ children }: { children: ReactNode }) => {
  const locale = useLocale();
  const [isCollapsed, setIsCollapsed] = useState(true);

  if (isCollapsed) {
    return (
      <div>
        <button
          className="w-full border border-white/30 bg-black/60 px-4 py-3 text-center text-sm uppercase tracking-[0.2em] text-neutral-200 transition hover:border-white hover:text-white print:hidden"
          onClick={() => setIsCollapsed(false)}
        >
          {locale === "de" ? "Weitere Projekte anzeigen" : "Show more projects"}
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
