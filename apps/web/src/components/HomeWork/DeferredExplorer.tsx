"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { ExperienceAtlas } from "../ExperienceAtlas/ExperienceAtlas";
import { useLocale } from "../i18n/LocaleProvider";
import { DeferredWorkView } from "./DeferredWorkView";

const Explorer = dynamic(
  () =>
    import("../ExperienceAtlas/ExperienceAtlas").then(
      (module) => module.ExperienceAtlas,
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
    ComponentProps<typeof ExperienceAtlas>,
    "projects" | "semanticData"
  >,
) {
  return (
    <DeferredWorkView fallback={<ExplorerLoading />}>
      <Explorer {...data} embedded wheelZoomRequiresShift />
    </DeferredWorkView>
  );
}
