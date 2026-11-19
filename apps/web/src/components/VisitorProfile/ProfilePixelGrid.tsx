"use client";

import { useMemo } from "react";
import {
  encodeProfilePayload,
  paintProfilePixels,
} from "@homepage/content/profilePixels";
import { useLocale } from "../i18n/LocaleProvider";
import { useVisitorProfileStore } from "./profileStore";
import {
  useProfileFlowPhase,
  useProfileHueCounts,
  useProfileTurn,
} from "./useProfileFlowPhase";
import { useProfileSnapshot } from "./useProfileSnapshot";

/** With `runIn`, a profile that appears with interactions eases into its resting frame. */
export function ProfilePixelGrid({ runIn = false }: { runIn?: boolean }) {
  const de = useLocale() === "de";
  const seededOrientation = useVisitorProfileStore((s) => s.orientation);
  const orientation = seededOrientation ?? 0;
  const interactions = useVisitorProfileStore((s) => s.interactions);
  const { catalog, interests } = useProfileSnapshot();
  const signature = useMemo(
    () =>
      catalog
        ? encodeProfilePayload(catalog.terms, interests, interactions)
        : null,
    [catalog, interests, interactions],
  );
  const phase = useProfileFlowPhase(interactions, signature !== null, runIn);
  const angle = useProfileTurn(seededOrientation, signature !== null);
  const hueCounts = useProfileHueCounts(
    signature?.hueCounts ?? [],
    signature !== null,
  );
  const pixels = useMemo(
    () =>
      signature &&
      paintProfilePixels({ ...signature, hueCounts }, angle, phase),
    [signature, hueCounts, angle, phase],
  );
  if (!signature || !pixels) return null;
  return (
    <svg
      viewBox={`0 0 ${signature.size} ${signature.size}`}
      shapeRendering="crispEdges"
      className="profile-pixel-grid"
      role="img"
      data-profile-grid
      data-grid-size={signature.size}
      data-grid-levels={signature.levels}
      data-grid-orientation={orientation}
      data-grid-interactions={signature.interactions}
      aria-label={
        de
          ? `Dein Interessenprofil, ${signature.size} mal ${signature.size} Pixel, ${signature.levels} Stufen pro Interesse`
          : `Your interest profile, ${signature.size} by ${signature.size} pixels, ${signature.levels} levels per interest`
      }
    >
      {pixels.map((color, i) => (
        <rect
          key={i}
          x={i % signature.size}
          y={Math.floor(i / signature.size)}
          width={1}
          height={1}
          fill={`#${color.toString(16).padStart(6, "0")}`}
        />
      ))}
    </svg>
  );
}
