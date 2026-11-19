"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  PROFILE_PIXEL_PHASE_PER_INTERACTION,
  blendHueCounts,
  type ProfileOrientation,
} from "@homepage/content/profilePixels";

export const PROFILE_FLOW_FPS = 20;
/** Frames one interaction plays: about 0.3 seconds. */
export const PROFILE_FLOW_FRAMES_PER_INTERACTION = 6;
// A burst of interactions plays only its last second.
const MAX_FRAMES_PER_RUN = PROFILE_FLOW_FPS;
// The run-in always takes 0.8 seconds and covers at most the last two
// interactions. Measured over the first 400 counts, this keeps a single frame
// from changing more than about a quarter of the picture; four interactions
// or a steeper curve reach almost half at some counts, which reads as flicker.
const RUN_IN_TICKS = 0.8 * PROFILE_FLOW_FPS;
const RUN_IN_FRAMES = 2 * PROFILE_FLOW_FRAMES_PER_INTERACTION;
const easeOut = (progress: number) => 1 - (1 - progress) ** 2;
// Seeding turns the whole wave, which switched about two thirds of the cells
// in one frame. Over a second, the largest turn of 180 degrees moves the wave
// about three degrees per frame at 60 Hz.
const TURN_SECONDS = 1;
const easeInOut = (progress: number) =>
  progress < 0.5 ? 2 * progress ** 2 : 1 - (2 - 2 * progress) ** 2 / 2;
// A new family split moves band edges across the whole wave. Spread over the
// interaction's step, each frame moves only a few cells per edge and the
// interaction still ends with its step.
const HUE_SHIFT_SECONDS =
  PROFILE_FLOW_FRAMES_PER_INTERACTION / PROFILE_FLOW_FPS;
const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Colour areas the signature is painted with. When the family split changes
 * while the signature is on screen, the areas grow and shrink towards it from
 * where they are painted. A signature that appears and reduced motion go
 * straight to the split.
 */
export function useProfileHueCounts(
  hueCounts: readonly number[],
  shown: boolean,
) {
  const key = hueCounts.join();
  const [counts, setCounts] = useState(hueCounts);
  const painted = useRef(hueCounts);
  const wasShown = useRef(false);
  useLayoutEffect(() => {
    const target = key ? key.split(",").map(Number) : [];
    const paint = (next: readonly number[]) => {
      painted.current = next;
      setCounts(next);
    };
    const appearing = shown && !wasShown.current;
    wasShown.current = shown;
    const from = painted.current;
    if (!shown || appearing || from.join() === key || prefersReducedMotion()) {
      paint(target);
      return;
    }
    let request = 0,
      startedAt: number | undefined;
    const tick = (now: number) => {
      startedAt ??= now;
      const progress = (now - startedAt) / 1000 / HUE_SHIFT_SECONDS;
      paint(
        progress < 1
          ? blendHueCounts(from, target, easeInOut(progress))
          : target,
      );
      if (progress < 1) request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [key, shown]);
  // Before the effect catches up with a signature that appeared or changed
  // its grid size, the painted counts would not fill the new wave.
  return blendHueCounts(counts, hueCounts, 0);
}

/**
 * Angle the signature is painted at. When the first activation seeds the
 * orientation while the signature is on screen, the wave turns there from 0°
 * the shorter way round. A signature that appears, a reset, a cross-tab
 * restore of an already seeded profile and reduced motion go straight to it.
 */
export function useProfileTurn(
  orientation: ProfileOrientation | null,
  shown: boolean,
) {
  const target = orientation ?? 0;
  const [angle, setAngle] = useState<number>(target);
  const previous = useRef(orientation);
  const wasShown = useRef(false);
  useLayoutEffect(() => {
    const seeded = previous.current === null && orientation !== null;
    previous.current = orientation;
    const appearing = shown && !wasShown.current;
    wasShown.current = shown;
    if (!seeded || !shown || appearing || prefersReducedMotion()) {
      setAngle(target);
      return;
    }
    const turn = ((target + 540) % 360) - 180;
    let request = 0,
      startedAt: number | undefined;
    const tick = (now: number) => {
      startedAt ??= now;
      const progress = (now - startedAt) / 1000 / TURN_SECONDS;
      setAngle(progress < 1 ? turn * easeInOut(progress) : target);
      if (progress < 1) request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [orientation, target, shown]);
  return angle;
}

/**
 * Phase of the signature's colour wave. It rests where the interaction count
 * puts it and plays a short run of frames when the count rises while the
 * signature is on screen. With `runIn`, a signature that appears with a count
 * eases into its resting frame; without it, a profile that has just loaded
 * goes straight there, as do a reset and reduced motion.
 */
export function useProfileFlowPhase(
  interactions: number,
  shown: boolean,
  runIn = false,
) {
  const target = interactions * PROFILE_FLOW_FRAMES_PER_INTERACTION;
  const [frame, setFrame] = useState(target);
  const painted = useRef(target);
  const wasShown = useRef(false);
  // Kept until the run-in ends, so an effect that React runs again with the
  // same inputs (Strict Mode) restarts it; a new count hands over to the steps.
  const runInTo = useRef<number | null>(null);
  // A layout effect, so a jump never paints the old wave under the new shades.
  useLayoutEffect(() => {
    const paint = (next: number) => {
      painted.current = next;
      setFrame(next);
    };
    const moving = shown && !prefersReducedMotion();
    const appearing = shown && !wasShown.current;
    wasShown.current = shown;
    if (appearing && runIn && target > 0) runInTo.current = target;
    const runningIn = moving && runInTo.current === target;
    if (!runningIn) runInTo.current = null;
    if (!runningIn && !(moving && !appearing && target > painted.current)) {
      paint(target);
      return;
    }
    const from = runningIn
      ? Math.max(0, target - RUN_IN_FRAMES)
      : Math.max(painted.current, target - MAX_FRAMES_PER_RUN);
    if (runningIn) paint(from);
    let request = 0,
      startedAt: number | undefined;
    const tick = (now: number) => {
      startedAt ??= now;
      const ticks = Math.floor(((now - startedAt) / 1000) * PROFILE_FLOW_FPS);
      const next = !runningIn
        ? Math.min(target, from + 1 + ticks)
        : ticks < RUN_IN_TICKS
          ? from + (target - from) * easeOut(ticks / RUN_IN_TICKS)
          : target;
      paint(next);
      if (next < target) request = requestAnimationFrame(tick);
      else runInTo.current = null;
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [target, shown, runIn]);
  return (
    (frame * PROFILE_PIXEL_PHASE_PER_INTERACTION) /
    PROFILE_FLOW_FRAMES_PER_INTERACTION
  );
}
