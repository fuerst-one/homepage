"use client";

import { useMemo } from "react";
import { encodeProfilePixels } from "@homepage/content/profilePixels";
import { useLocale } from "../i18n/LocaleProvider";
import { useProfileSnapshot } from "./useProfileSnapshot";

export function ProfilePixelGrid() {
  const de = useLocale() === "de";
  const { catalog, interests } = useProfileSnapshot();
  const signature = useMemo(
    () => (catalog ? encodeProfilePixels(catalog.terms, interests) : null),
    [catalog, interests],
  );
  if (!signature) return null;
  return (
    <svg
      viewBox={`0 0 ${signature.size} ${signature.size}`}
      shapeRendering="crispEdges"
      className="profile-pixel-grid"
      role="img"
      data-profile-grid
      data-grid-size={signature.size}
      data-grid-levels={signature.levels}
      aria-label={
        de
          ? `Dein Interessenprofil, ${signature.size} mal ${signature.size} Pixel, ${signature.levels} Stufen pro Interesse`
          : `Your interest profile, ${signature.size} by ${signature.size} pixels, ${signature.levels} levels per interest`
      }
    >
      {signature.pixels.map((color, i) => (
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
