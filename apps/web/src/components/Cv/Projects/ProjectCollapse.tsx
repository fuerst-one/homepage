"use client";

import { useLocale } from "../../i18n/LocaleProvider";
import { Button } from "../../Button";
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
      <div className="py-8 md:py-12">
        <Button
          type="button"
          variant="cta"
          className="min-h-14 w-full md:min-h-16 print:hidden"
          onClick={onExpand}
        >
          {locale === "de" ? "Weitere Projekte anzeigen" : "Show more projects"}
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};
