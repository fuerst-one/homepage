"use client";
import { useState } from "react";
import type { Locale } from "@homepage/content/i18n";
import type { PROFILE_RATE_PLACES } from "@homepage/content/visitorProfileSignals";
import { recordVisitorInteraction } from "./VisitorProfile/profileStore";

export type MaltRatePlace = (typeof PROFILE_RATE_PLACES)[number];

export function MaltRateReveal({
  locale,
  place,
  rate,
}: {
  locale: Locale;
  place: MaltRatePlace;
  rate: string;
}) {
  const de = locale === "de";
  const [revealed, setRevealed] = useState(false);
  return (
    <span aria-live="polite">
      {revealed ? (
        <span className="text-white">{rate}</span>
      ) : (
        <button
          type="button"
          className="group inline-flex items-baseline gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          onClick={() => {
            setRevealed(true);
            recordVisitorInteraction("rate_revealed", place);
          }}
        >
          <span
            aria-hidden="true"
            className="select-none text-white blur-sm transition group-hover:blur-[3px]"
          >
            {rate}
          </span>
          <span className="text-xs underline underline-offset-4 group-hover:text-white">
            {de ? "Tagessatz anzeigen" : "Show rate"}
          </span>
        </button>
      )}
    </span>
  );
}
