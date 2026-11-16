import { PLASMA_GLITCH_DURATION, PLASMA_GLITCH_INTERVAL } from "../constants";

export type GlitchState = {
  /** Burst amplitude, 0 when calm, ~0.35–1 during a sub-burst. */
  burst: number;
  /** Pattern seed; stable within a sub-burst, re-rolled at each one. */
  seed: number;
};

const CALM: GlitchState = { burst: 0, seed: 0 };

// Cheap 1D hash, mirrors the GLSL hash11 shape. Because this is now the sole
// source of truth (the shader reads the result rather than recomputing it),
// it does not need to bit-match GLSL float precision.
const hash11 = (p: number): number => {
  let x = p * 0.1031;
  x -= Math.floor(x);
  x *= x + 33.33;
  x *= x + x;
  return x - Math.floor(x);
};

/**
 * Deterministic glitch schedule shared by the WebGL tear and the DOM link
 * animation. One short burst per interval, placed at a hashed offset, then
 * cut into 2–4 instantly-switching sub-bursts that each re-roll the pattern.
 */
export const getGlitchState = (timeSec: number): GlitchState => {
  const slot = Math.floor(timeSec / PLASMA_GLITCH_INTERVAL);
  const slotT = timeSec - slot * PLASMA_GLITCH_INTERVAL;
  const start =
    hash11(slot) * (PLASMA_GLITCH_INTERVAL - PLASMA_GLITCH_DURATION);
  const local = slotT - start;
  if (local < 0 || local >= PLASMA_GLITCH_DURATION) {
    return CALM;
  }
  const subCount = 2 + Math.floor(hash11(slot * 2.17) * 3);
  const sub = Math.floor((local / PLASMA_GLITCH_DURATION) * subCount);
  const seed = slot * 17 + sub * 3.7;
  const burst = 0.35 + 0.65 * hash11(seed * 7.13);
  return { burst, seed };
};

/** Change the pace of calm periods without speeding up the bursts themselves. */
export const createGlitchClock = () => {
  let timeline = 0;
  let previousTime = 0;
  return {
    sample(timeSec: number, frequency = 1): GlitchState {
      // Ignore long gaps while a tab is hidden or animation is paused.
      let remaining = Math.min(0.25, Math.max(0, timeSec - previousTime));
      previousTime = timeSec;
      while (remaining > 1e-9) {
        const slot = Math.floor(timeline / PLASMA_GLITCH_INTERVAL);
        const start =
          slot * PLASMA_GLITCH_INTERVAL +
          hash11(slot) * (PLASMA_GLITCH_INTERVAL - PLASMA_GLITCH_DURATION);
        const end = start + PLASMA_GLITCH_DURATION;
        const inBurst = timeline >= start - 1e-9 && timeline < end - 1e-9;
        const boundary =
          timeline < start - 1e-9
            ? start
            : inBurst
              ? end
              : (slot + 1) * PLASMA_GLITCH_INTERVAL;
        const rate = inBurst ? 1 : Math.max(0.1, frequency);
        const untilBoundary = (boundary - timeline) / rate;
        const step = Math.min(remaining, untilBoundary);
        timeline = step === untilBoundary ? boundary : timeline + step * rate;
        remaining -= step;
      }
      return getGlitchState(timeline);
    },
  };
};
