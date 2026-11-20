"use client";

import { useEffect, useRef } from "react";

/** Runs the callback every animation frame without re-rendering React. */
export const useAnimationFrame = (callback: () => void) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      callbackRef.current();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
};
