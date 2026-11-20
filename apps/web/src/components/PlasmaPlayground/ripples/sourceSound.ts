import type { RippleMode } from "./types";

/** Note lengths a bounce can last, with their length in quarter-note beats. */
export const NOTE_VALUES = [
  { value: "1/1", beats: 4 },
  { value: "1/2", beats: 2 },
  { value: "1/4.", beats: 1.5 },
  { value: "1/4", beats: 1 },
  { value: "1/8.", beats: 0.75 },
  { value: "1/4T", beats: 2 / 3 },
  { value: "1/8", beats: 0.5 },
  { value: "1/8T", beats: 1 / 3 },
] as const;

export type NoteValue = (typeof NOTE_VALUES)[number]["value"];

export const getNoteBeats = (rate: NoteValue) =>
  NOTE_VALUES.find(({ value }) => value === rate)?.beats ?? 1;

/** How a single source vibrates while one of its notes plays. */
export type SourceSound = {
  /** Slices a note into bounces of this length at the current tempo. */
  rate: NoteValue;
  /** 0 keeps every bounce equally strong; 1 lets the last bounce vanish. */
  decay: number;
  strength: number;
};

/** A source's sound resolved against a tempo and the length of one note. */
export type Vibration = Omit<SourceSound, "rate"> & {
  /** Bounces per second. */
  frequency: number;
  /** How many bounces fit into the note; the last one may be cut short. */
  bounces: number;
};

export const DEFAULT_SOUND: SourceSound = {
  rate: "1/4",
  decay: 0.5,
  strength: 1,
};

export const toVibration = (
  { rate, ...rest }: SourceSound,
  bpm: number,
  noteBeats: number,
): Vibration => ({
  ...rest,
  frequency: bpm / 60 / getNoteBeats(rate),
  bounces: noteBeats / getNoteBeats(rate),
});

/** How many of a source's bounce ranges a ripple lingers in each medium without decay. */
const FADE_SPANS: Record<RippleMode, number> = {
  waves: 6,
  jello: 1.5,
  sand: 3,
  cymatics: 6,
};
/** Full decay shortens the lingering to a tenth. */
const DECAY_FADE_SHARE = 0.9;
/**
 * While a note plays, ripples must overlap long enough to form standing waves;
 * their still lines are what shape the sand per pitch and timbre. Jello keeps
 * its heavy damping, its wobble is the point.
 */
const PLAYING_DAMPING: Record<RippleMode, number> = {
  waves: 0.5,
  jello: Infinity,
  sand: 1.5,
  cymatics: 0.5,
};

/** e^-3 ≈ 5%: after the fade the ripple is all but gone. */
const FADE_TO_DAMPING = 3;

/**
 * Amplitude of a source's vibration the given time after its step fired, or
 * null once all bounces are done. The vibration fades smoothly from the first
 * bounce on and ends the run at (1 - decay) of its strength.
 */
export const getBounceAmplitude = (
  { frequency, bounces, decay, strength }: Vibration,
  secondsSinceFire: number,
): number | null => {
  const bounce = secondsSinceFire * frequency;
  if (secondsSinceFire < 0 || bounce >= bounces) return null;
  if (decay === 0) return strength;
  return strength * (1 - decay) ** (bounce / bounces);
};

/**
 * Plate damping for a medium. After the notes end it is scaled to the last
 * source's bounce range and decay, so the plate settles quickly; while a note
 * plays it rings longer so standing waves can form.
 */
export const getPlateDamping = (
  mode: RippleMode,
  { frequency, bounces, decay }: Vibration,
  { playing }: { playing: boolean } = { playing: false },
) => {
  const bounceRangeSeconds = bounces / frequency;
  const fadeSeconds =
    bounceRangeSeconds * FADE_SPANS[mode] * (1 - DECAY_FADE_SHARE * decay);
  const settling = FADE_TO_DAMPING / fadeSeconds;
  return playing ? Math.min(settling, PLAYING_DAMPING[mode]) : settling;
};

/**
 * LFO values 0..1 sampled evenly across the note: one swell per bounce,
 * shrinking with decay, scaled by strength.
 */
export const getLfoCurve = (vibration: Vibration, count: number) => {
  const noteSeconds = vibration.bounces / vibration.frequency;
  return Float32Array.from({ length: count }, (_, index) => {
    const seconds = (index / count) * noteSeconds;
    const amplitude = getBounceAmplitude(vibration, seconds) ?? 0;
    const swell =
      (1 - Math.cos(2 * Math.PI * vibration.frequency * seconds)) / 2;
    return (amplitude / SOUND_RANGES.strength.max) * swell;
  });
};

export type NumericSoundKey = Exclude<keyof SourceSound, "rate">;

type SoundRange = { min: number; max: number; step: number };

export const SOUND_RANGES: Record<NumericSoundKey, SoundRange> = {
  decay: { min: 0, max: 0.95, step: 0.05 },
  strength: { min: 0.2, max: 4, step: 0.1 },
};

/** Clamps a value into its range and onto its step grid. */
export const snapSound = (key: NumericSoundKey, value: number) => {
  const { min, max, step } = SOUND_RANGES[key];
  const snapped = Math.round((value - min) / step) * step + min;
  return Number(Math.min(max, Math.max(min, snapped)).toFixed(4));
};

/** The note whose length is closest to the given beats, compared on a log scale. */
export const nearestNote = (beats: number): NoteValue =>
  NOTE_VALUES.reduce((best, note) =>
    Math.abs(Math.log(note.beats / beats)) <
    Math.abs(Math.log(best.beats / beats))
      ? note
      : best,
  ).value;
