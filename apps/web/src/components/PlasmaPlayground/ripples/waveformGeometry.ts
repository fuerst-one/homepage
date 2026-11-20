import {
  getBounceAmplitude,
  nearestNote,
  snapSound,
  SOUND_RANGES,
  Vibration,
} from "./sourceSound";

/**
 * The editor shows exactly one note. Its geometry works in beats, so it takes
 * a vibration resolved at 60 BPM, where one beat lasts one second.
 */
export const EDITOR_BPM = 60;

export const getNoteSpan = (vibration: Vibration) =>
  vibration.bounces / vibration.frequency;

export type WaveHandle = { seconds: number; amplitude: number };

/** Signed vibration height at evenly spaced beats across the note. */
export const getWaveformSamples = (vibration: Vibration, count: number) =>
  Array.from({ length: count }, (_, index) => {
    const beats = (index * getNoteSpan(vibration)) / count;
    const amplitude = getBounceAmplitude(vibration, beats) ?? 0;
    return amplitude * Math.sin(2 * Math.PI * vibration.frequency * beats);
  });

/** The strongest source fills the editor's half-height. */
export const MAX_STRENGTH = SOUND_RANGES.strength.max;

export const getWaveHandles = (vibration: Vibration) => ({
  envelopeStart: { seconds: 0, amplitude: vibration.strength },
  envelopeEnd: {
    seconds: vibration.bounces / vibration.frequency,
    amplitude: vibration.strength * (1 - vibration.decay),
  },
  cycleEnd: { seconds: 1 / vibration.frequency, amplitude: 0 },
});

export const rateFromCycleEnd = (beats: number) =>
  nearestNote(Math.max(beats, 1e-3));

/** Height as a share of the editor's half-height. */
export const strengthFromEnvelopeHeight = (height: number) =>
  snapSound("strength", height * MAX_STRENGTH);

export const decayFromEnvelopeRatio = (endToStart: number) =>
  snapSound("decay", 1 - endToStart);
