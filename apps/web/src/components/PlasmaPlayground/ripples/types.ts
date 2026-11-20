import type { SourceSound } from "./sourceSound";
import type { LfoTarget, Timbre } from "./timbres";

export type RippleMode = "waves" | "sand" | "jello" | "cymatics";

export type RippleEngineOptions = {
  width: number;
  height: number;
  /** Cell width divided by cell height, so ripples stay round on screen. */
  cellAspect: number;
  /** Wavefront speed in cell rows per second. */
  speed: number;
  /** How fast ripples lose energy, per second; sand absorbs far more than water. */
  damping: number;
};

export type RippleEngine = {
  emit: (x: number, y: number) => void;
  step: (dtSeconds: number) => void;
  setDamping: (damping: number) => void;
  /** Flattens the surface instantly. */
  reset: () => void;
  /** Signed wave height per cell, roughly within -1..1. */
  readonly height: Float32Array;
};

/** What a source sounds like when one of its notes plays. */
export type SourceVoice = {
  timbre: Timbre;
  /** The setting the bounce waveform modulates while a note plays. */
  lfoTarget: LfoTarget;
  /** MIDI pitch for notes added to the source. */
  pitch: number;
};

/** A placed source; x and y are fractions of the canvas so they survive size changes. */
export type RippleSource = {
  id: number;
  x: number;
  y: number;
  /** A muted source keeps its notes but neither plays nor shakes the plate. */
  muted: boolean;
} & SourceSound &
  SourceVoice;
