"use client";

import { useEffect, useState } from "react";

export const OVERLAY_IDLE_MS = 3000;

const ACTIVITY_EVENTS = [
  "pointermove",
  "pointerdown",
  "keydown",
  "wheel",
  "focusin",
] as const;

export const getAreOverlaysHidden = ({
  msSinceActivity,
  isPinned,
}: {
  msSinceActivity: number;
  isPinned: boolean;
}): boolean => !isPinned && msSinceActivity >= OVERLAY_IDLE_MS;

export const useIdleOverlays = (isPinned: boolean): boolean => {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    let lastActivityAt = performance.now();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const evaluate = () => {
      const msSinceActivity = performance.now() - lastActivityAt;
      const hidden = getAreOverlaysHidden({ msSinceActivity, isPinned });
      setIsHidden(hidden);
      if (!hidden && !isPinned) {
        timer = setTimeout(evaluate, OVERLAY_IDLE_MS - msSinceActivity);
      }
    };

    const handleActivity = () => {
      lastActivityAt = performance.now();
      if (timer) clearTimeout(timer);
      evaluate();
    };

    evaluate();
    for (const type of ACTIVITY_EVENTS) {
      window.addEventListener(type, handleActivity, { passive: true });
    }
    return () => {
      if (timer) clearTimeout(timer);
      for (const type of ACTIVITY_EVENTS) {
        window.removeEventListener(type, handleActivity);
      }
    };
  }, [isPinned]);

  return isHidden;
};
