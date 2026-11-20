"use client";

import { Volume2, VolumeX } from "lucide-react";

type RipplesSoundToggleProps = {
  de: boolean;
  soundOn: boolean;
  onToggle: () => void;
};

/** Sound stays off until asked for; browsers only allow audio after a click. */
export const RipplesSoundToggle = ({
  de,
  soundOn,
  onToggle,
}: RipplesSoundToggleProps) => {
  const label = soundOn
    ? de
      ? "Ton ausschalten"
      : "Turn sound off"
    : de
      ? "Ton einschalten"
      : "Turn sound on";
  return (
    <button
      type="button"
      className="playground-chip playground-icon-chip"
      onClick={onToggle}
      aria-pressed={soundOn}
      aria-label={label}
      title={label}
    >
      {soundOn ? (
        <Volume2 size={14} aria-hidden />
      ) : (
        <VolumeX size={14} aria-hidden />
      )}
    </button>
  );
};
