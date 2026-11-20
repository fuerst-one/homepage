import { getBounceAmplitude, SOUND_RANGES, Vibration } from "./sourceSound";
import { LfoTarget, Timbre } from "./timbres";

/**
 * Real notes vibrate hundreds of times a second; the plate can only show a few.
 * It plays a slowed-down copy instead: C4 shakes it three times a second and
 * every octave doubles that, so intervals and melodies survive.
 */
const PLATE_C4_HZ = 3;
/** Faster overtones would make rings finer than one character cell. */
export const MAX_PLATE_HZ = 12;
const NOISE_HZ = 8;
const MAX_STRENGTH = SOUND_RANGES.strength.max;
/**
 * Overtones are quiet next to the fundamental; on the plate they get a larger
 * share (square-root compression) so their finer lines show up in the sand.
 */
const emphasise = (gain: number) => Math.sign(gain) * Math.sqrt(Math.abs(gain));

type Recipe = {
  /** Overtones as multiples of the plate frequency, with their loudness. */
  partials: ReadonlyArray<{ ratio: number; gain: number }>;
  /** Share of smoothed random shaking, for noisy sounds. */
  noise: number;
  noiseHz?: number;
  /** Pitch falls from this multiple to the note over the given share of it. */
  sweep?: { from: number; share: number };
  /** The shaking fades out over this share of the note, like a drum or pluck. */
  fadeShare?: number;
};

const RECIPES: Record<Timbre, Recipe> = {
  sine: { partials: [{ ratio: 1, gain: 1 }], noise: 0 },
  triangle: {
    partials: [
      { ratio: 1, gain: 1 },
      { ratio: 3, gain: -1 / 9 },
      { ratio: 5, gain: 1 / 25 },
    ],
    noise: 0,
  },
  square: {
    partials: [
      { ratio: 1, gain: 1 },
      { ratio: 3, gain: 1 / 3 },
      { ratio: 5, gain: 1 / 5 },
      { ratio: 7, gain: 1 / 7 },
    ],
    noise: 0,
  },
  saw: {
    partials: [
      { ratio: 1, gain: 1 },
      { ratio: 2, gain: -1 / 2 },
      { ratio: 3, gain: 1 / 3 },
      { ratio: 4, gain: -1 / 4 },
      { ratio: 5, gain: 1 / 5 },
    ],
    noise: 0,
  },
  noise: { partials: [], noise: 1 },
  // Bell overtones do not line up with the fundamental, hence irregular shapes.
  "fm-bell": {
    partials: [
      { ratio: 1, gain: 1 },
      { ratio: 2.76, gain: 0.6 },
      { ratio: 5.4, gain: 0.35 },
    ],
    noise: 0,
    fadeShare: 1,
  },
  pluck: {
    partials: [
      { ratio: 1, gain: 1 },
      { ratio: 2, gain: 0.6 },
      { ratio: 3, gain: 0.4 },
      { ratio: 4, gain: 0.3 },
    ],
    noise: 0,
    fadeShare: 0.8,
  },
  bass: {
    partials: [
      { ratio: 0.5, gain: 1 },
      { ratio: 1, gain: 0.5 },
    ],
    noise: 0,
  },
  kick: {
    partials: [{ ratio: 1, gain: 1 }],
    noise: 0,
    sweep: { from: 3, share: 0.3 },
    fadeShare: 0.5,
  },
  snare: {
    partials: [{ ratio: 1, gain: 0.5 }],
    noise: 0.8,
    fadeShare: 0.3,
  },
  hihat: { partials: [], noise: 1, noiseHz: 12, fadeShare: 0.12 },
};

export type PlatePartial = { frequency: number; gain: number };

export const getPlateFrequency = (pitch: number) =>
  PLATE_C4_HZ * 2 ** ((pitch - 60) / 12);

export const getPlatePartials = (
  timbre: Timbre,
  pitch: number,
): PlatePartial[] => {
  const base = getPlateFrequency(pitch);
  return RECIPES[timbre].partials
    .map(({ ratio, gain }) => ({
      frequency: ratio * base,
      gain: emphasise(gain),
    }))
    .filter(({ frequency }) => frequency <= MAX_PLATE_HZ);
};

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

/**
 * How much of each overtone plays at LFO value u (0..1). Low-pass lets
 * overtones in from the bottom as it opens; high-pass removes them from the
 * bottom as it rises. Other targets leave every overtone in.
 */
export const getPartialWeights = (
  target: LfoTarget,
  u: number,
  partials: ReadonlyArray<PlatePartial>,
) =>
  partials.map((_, index) => {
    if (target === "lowpass") return clamp01(1 + u * partials.length - index);
    if (target === "highpass") {
      return clamp01(index + 1 - u * (partials.length - 1));
    }
    return 1;
  });

const hash = (index: number, seed: number) => {
  const s = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};

/** Random shaking that changes smoothly, rate times a second. */
const smoothNoise = (seconds: number, rate: number, seed: number) => {
  const position = seconds * rate;
  const index = Math.floor(position);
  const blend = (1 - Math.cos((position - index) * Math.PI)) / 2;
  return hash(index, seed) * (1 - blend) + hash(index + 1, seed) * blend;
};

/** Sums the recipe at a phase, normalised so its peak is about one. */
const createCarrier = (timbre: Timbre, pitch: number, seed: number) => {
  const recipe = RECIPES[timbre];
  const partials = getPlatePartials(timbre, pitch);
  const norm =
    partials.reduce((sum, { gain }) => sum + Math.abs(gain), 0) +
      recipe.noise || 1;
  return {
    recipe,
    partials,
    sample: (
      cycles: number,
      weights: ReadonlyArray<number>,
      noiseAt: number,
    ) => {
      let value = 0;
      partials.forEach(({ frequency, gain }, index) => {
        value +=
          gain * weights[index] * Math.sin(2 * Math.PI * frequency * cycles);
      });
      value +=
        recipe.noise * smoothNoise(noiseAt, recipe.noiseHz ?? NOISE_HZ, seed);
      return value / norm;
    },
  };
};

type PlateNote = {
  timbre: Timbre;
  pitch: number;
  lfoTarget: LfoTarget;
  vibration: Vibration;
  /** Varies the noise between sources. */
  seed: number;
};

/**
 * The plate's shaking for one note, seconds after it started, or null once it
 * ended. It follows the note's sound: the timbre's overtones at the slowed
 * pitch, shaped by the source's bounces like the sound's LFO.
 */
export const createPlateSignal = ({
  timbre,
  pitch,
  lfoTarget,
  vibration,
  seed,
}: PlateNote) => {
  const carrier = createCarrier(timbre, pitch, seed);
  const { recipe } = carrier;
  const noteSeconds = vibration.bounces / vibration.frequency;
  // Pitch can bend, so phase is integrated rather than computed from time.
  let cycles = 0;
  let lastSeconds = 0;
  return (seconds: number): number | null => {
    if (seconds < 0 || seconds >= noteSeconds) return null;
    const amplitude = getBounceAmplitude(vibration, seconds) ?? 0;
    const swell =
      (1 - Math.cos(2 * Math.PI * vibration.frequency * seconds)) / 2;
    const u = (amplitude / MAX_STRENGTH) * swell;
    let rate = lfoTarget === "pitch" ? 2 ** u : 1;
    if (recipe.sweep) {
      const { from, share } = recipe.sweep;
      rate *= 1 + (from - 1) * Math.exp(-seconds / (share * noteSeconds));
    }
    cycles += rate * Math.max(0, seconds - lastSeconds);
    lastSeconds = seconds;
    const level = lfoTarget === "volume" ? amplitude * swell : amplitude;
    const fade = recipe.fadeShare
      ? Math.exp(-seconds / (recipe.fadeShare * noteSeconds))
      : 1;
    const weights = getPartialWeights(lfoTarget, u, carrier.partials);
    return level * fade * carrier.sample(cycles, weights, seconds);
  };
};

/** A source humming its timbre without end, as in cymatics. */
export const createHumSignal = ({
  timbre,
  pitch,
  strength,
  seed,
}: {
  timbre: Timbre;
  pitch: number;
  strength: number;
  seed: number;
}) => {
  const carrier = createCarrier(timbre, pitch, seed);
  const weights = carrier.partials.map(() => 1);
  return (seconds: number) =>
    strength * carrier.sample(seconds, weights, seconds);
};
