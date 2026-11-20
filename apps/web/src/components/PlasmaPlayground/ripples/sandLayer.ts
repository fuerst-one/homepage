import { RippleMode } from "./types";

const GRAINS_PER_CELL = 6;
const SHAKING_SMOOTHING_SECONDS = 0.1;
/** Hop length in cell rows per frame-second for a fully shaking cell. */
const HOP_PER_SECOND = 200;
const PILE_FOR_FULL_BRIGHTNESS = GRAINS_PER_CELL * 3;
/**
 * Like real sand, grains need a minimum shake before they move at all, so the
 * faint after-ripples of a bounce leave them still.
 */
const SHAKE_THRESHOLD = 0.15 ** 2;
const BURST_GLOW = 0.35;
const WAVE_GAIN = 1.6;
const SEED = 0x9e3779b9;

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

export type SandLayer = {
  update: (wave: Float32Array, dtSeconds: number, mode: RippleMode) => void;
  writeLuminance: (
    wave: Float32Array,
    mode: RippleMode,
    out: Uint8Array,
  ) => void;
  reset: () => void;
};

const createRandom = () => {
  let state = SEED;
  return {
    reset: () => {
      state = SEED;
    },
    next: () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    },
  };
};

/**
 * Sand as grains that hop further the harder their spot shakes, so they pile up
 * where the plate stays still and stay there until something shakes them again.
 */
export const createSandLayer = (
  width: number,
  height: number,
  cellAspect: number,
): SandLayer => {
  const size = width * height;
  const grainCount = size * GRAINS_PER_CELL;
  const grainX = new Float32Array(grainCount);
  const grainY = new Float32Array(grainCount);
  const shaking = new Float32Array(size);
  const counts = new Uint16Array(size);
  const random = createRandom();

  const reset = () => {
    random.reset();
    for (let i = 0; i < grainCount; i++) {
      const cell = Math.floor(i / GRAINS_PER_CELL);
      grainX[i] = (cell % width) + random.next();
      grainY[i] = Math.floor(cell / width) + random.next();
    }
    shaking.fill(0);
  };
  reset();

  const reflect = (value: number, limit: number) => {
    if (value < 0) return Math.min(-value, limit - 1e-3);
    if (value >= limit) return Math.max(2 * limit - value - 1e-3, 0);
    return value;
  };

  return {
    reset,
    update: (wave, dtSeconds, mode) => {
      if (mode !== "sand" && mode !== "cymatics") return;
      const blend = Math.min(1, dtSeconds / SHAKING_SMOOTHING_SECONDS);
      for (let i = 0; i < size; i++) {
        shaking[i] += (wave[i] * wave[i] - shaking[i]) * blend;
      }
      const hopScale = HOP_PER_SECOND * dtSeconds;
      for (let g = 0; g < grainCount; g++) {
        const cell = Math.floor(grainY[g]) * width + Math.floor(grainX[g]);
        const excess = shaking[cell] - SHAKE_THRESHOLD;
        if (excess <= 0) continue;
        const hop = hopScale * Math.sqrt(excess) * random.next();
        const angle = random.next() * 2 * Math.PI;
        grainX[g] = reflect(
          grainX[g] + (Math.cos(angle) * hop) / cellAspect,
          width,
        );
        grainY[g] = reflect(grainY[g] + Math.sin(angle) * hop, height);
      }
    },
    writeLuminance: (wave, mode, out) => {
      if (mode === "waves" || mode === "jello") {
        for (let i = 0; i < size; i++) {
          out[i] = Math.round(clamp01(Math.abs(wave[i]) * WAVE_GAIN) * 255);
        }
        return;
      }
      counts.fill(0);
      for (let g = 0; g < grainCount; g++) {
        counts[Math.floor(grainY[g]) * width + Math.floor(grainX[g])]++;
      }
      const glow = mode === "sand" ? BURST_GLOW : 0;
      for (let i = 0; i < size; i++) {
        const pile = counts[i] / PILE_FOR_FULL_BRIGHTNESS;
        const crest = clamp01(Math.abs(wave[i]) * WAVE_GAIN) * glow;
        out[i] = Math.round(clamp01(pile + crest) * 255);
      }
    },
  };
};
