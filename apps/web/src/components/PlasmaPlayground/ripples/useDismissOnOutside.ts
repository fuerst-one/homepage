"use client";

import { RefObject, useEffect } from "react";

/** Closes a source menu on Escape or on a press outside it and its marker. */
export const useDismissOnOutside = (
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
) => {
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (ref.current?.contains(event.target as Node)) return;
      if ((event.target as Element).closest?.("[data-source-marker]")) return;
      // Clicking away only closes the menu; it must not place a new source.
      event.stopPropagation();
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [ref, onClose]);
};
