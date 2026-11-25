"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { ConnectionExplorerNext } from "../ExperienceAtlas/ConnectionExplorerNext";
import { useLocale } from "../i18n/LocaleProvider";
import { DeferredWorkView } from "./DeferredWorkView";

const Explorer = dynamic(
  () =>
    import("../ExperienceAtlas/ConnectionExplorerNext").then(
      (module) => module.ConnectionExplorerNext,
    ),
  { ssr: false, loading: ExplorerLoading },
);

function ExplorerLoading() {
  const locale = useLocale();
  return (
    <p className="home-explorer-loading" role="status">
      {locale === "de" ? "Explorer wird geladen…" : "Loading Explorer…"}
    </p>
  );
}

export function DeferredExplorer(
  data: Pick<
    ComponentProps<typeof ConnectionExplorerNext>,
    "projects" | "semanticData"
  >,
) {
  const locale = useLocale();
  return (
    <DeferredWorkView fallback={<ExplorerLoading />}>
      <Explorer {...data} locale={locale} variant="embedded" />
    </DeferredWorkView>
  );
}
