export const TIMBRES = [
  "sine",
  "triangle",
  "square",
  "saw",
  "noise",
  "fm-bell",
  "pluck",
  "bass",
  "kick",
  "snare",
  "hihat",
] as const;

export type Timbre = (typeof TIMBRES)[number];

export const LFO_TARGETS = ["volume", "lowpass", "highpass", "pitch"] as const;

export type LfoTarget = (typeof LFO_TARGETS)[number];

/**
 * Modulations that audibly change each timbre. A pure sine has no overtones,
 * so filtering it only changes its loudness; noise has no pitch to bend.
 */
const TARGETS_BY_TIMBRE: Record<Timbre, ReadonlyArray<LfoTarget>> = {
  sine: ["volume", "pitch"],
  triangle: ["volume", "lowpass", "highpass", "pitch"],
  square: ["volume", "lowpass", "highpass", "pitch"],
  saw: ["volume", "lowpass", "highpass", "pitch"],
  noise: ["volume", "lowpass", "highpass"],
  "fm-bell": ["volume", "lowpass", "pitch"],
  pluck: ["volume", "lowpass", "pitch"],
  bass: ["volume", "lowpass", "pitch"],
  kick: ["volume", "pitch"],
  snare: ["volume", "lowpass", "highpass"],
  hihat: ["volume", "highpass"],
};

export const getLfoTargets = (timbre: Timbre) => TARGETS_BY_TIMBRE[timbre];

export const KEYS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export type Key = (typeof KEYS)[number];

/** Semitones above the root that belong to each scale. */
export const SCALES = {
  "minor-pentatonic": [0, 3, 5, 7, 10],
  "major-pentatonic": [0, 2, 4, 7, 9],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  blues: [0, 3, 5, 6, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
} as const satisfies Record<string, ReadonlyArray<number>>;

export type ScaleName = keyof typeof SCALES;

export type ScaleChoice = { root: Key; scale: ScaleName };

/** Playable pitches as MIDI notes, C2 to C6. */
export const MIN_PITCH = 36;
export const MAX_PITCH = 84;

const isInScale = (pitch: number, { root, scale }: ScaleChoice) => {
  const interval = (((pitch - KEYS.indexOf(root)) % 12) + 12) % 12;
  return (SCALES[scale] as ReadonlyArray<number>).includes(interval);
};

/**
 * The next tone of the scale above (1) or below (-1) the pitch. A pitch that
 * is off the scale, e.g. after the scale changed, snaps onto it this way.
 */
export const stepPitch = (
  pitch: number,
  direction: 1 | -1,
  choice: ScaleChoice,
) => {
  for (
    let next = pitch + direction;
    next >= MIN_PITCH && next <= MAX_PITCH;
    next += direction
  ) {
    if (isInScale(next, choice)) return next;
  }
  return pitch;
};

export const getMidiFrequency = (pitch: number) =>
  440 * 2 ** ((pitch - 69) / 12);

export const getNoteName = (pitch: number) =>
  `${KEYS[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
