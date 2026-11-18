"use client";

import type { Locale } from "@homepage/content/i18n";
import { atlasText, atlasTerm, atlasCount } from "./atlasCopy";
import { useAtlasCopy } from "./useAtlasCopy";
import type { SpaceConnections } from "./spaceConnections";

/** The 2D chart uses the same recorded fields as the 3D card. */
export function clusterTooltipElement(
  group: SpaceConnections["groups"][number],
  locale: Locale = "en",
): HTMLElement {
  const element = document.createElement("div");
  element.className = "vs-cluster-tooltip-body";
  const title = document.createElement("strong");
  title.textContent = atlasTerm(locale, group.label);
  element.append(title);
  const count = document.createElement("span");
  count.textContent = `${atlasCount(locale, group.ids.length)} · ${atlasText(locale, "recorded traits")}`;
  element.append(count);
  for (const term of group.terms.slice(0, 4)) {
    const row = document.createElement("span");
    row.textContent = atlasTerm(locale, term.term);
    const value = document.createElement("b");
    value.textContent = `${term.count}/${term.total}`;
    row.append(value);
    element.append(row);
  }
  const hint = document.createElement("small");
  hint.textContent = atlasText(locale, "Click to explore this cluster");
  element.append(hint);
  return element;
}

export function SpaceClusterTooltip({
  group,
  id,
  className = "",
}: {
  group: SpaceConnections["groups"][number];
  id?: string;
  className?: string;
}) {
  const { locale, t, term } = useAtlasCopy();
  return (
    <div className={`vs-cluster-tooltip ${className}`} role="tooltip" id={id}>
      <strong>{term(group.label)}</strong>
      <span>
        {atlasCount(locale, group.ids.length)} · {t("recorded traits")}
      </span>
      {group.terms.slice(0, 4).map((item) => (
        <span key={item.term}>
          {term(item.term)}
          <b>
            {item.count}/{item.total}
          </b>
        </span>
      ))}
      <small>{t("Click to explore this cluster")}</small>
    </div>
  );
}
