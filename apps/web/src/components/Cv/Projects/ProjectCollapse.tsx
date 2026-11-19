"use client";

import { useLocale } from "../../i18n/LocaleProvider";
import React, { ReactNode } from "react";

export const ProjectCollapse = ({
  expanded,
  onExpand,
  children,
}: {
  expanded: boolean;
  onExpand: () => void;
  children: ReactNode;
}) => {
  const locale = useLocale();

  if (!expanded) {
    return (
      <div>
        <button
          className="w-full border border-white/30 bg-black/60 px-4 py-3 text-center text-sm uppercase tracking-[0.2em] text-neutral-200 transition hover:border-white hover:text-white print:hidden"
          onClick={onExpand}
        >
          {locale === "de" ? "Weitere Projekte anzeigen" : "Show more projects"}
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
