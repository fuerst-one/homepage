import { LoopNote, TIME_SIGNATURES, TimeSignature } from "./rippleLoop";
import { NOTE_VALUES, snapSound } from "./sourceSound";
import {
  getLfoTargets,
  Key,
  KEYS,
  LFO_TARGETS,
  MAX_PITCH,
  MIN_PITCH,
  ScaleName,
  SCALES,
  TIMBRES,
} from "./timbres";
import { RippleMode, RippleSource } from "./types";

const VERSION = 2;
const DEFAULT_PITCH = 60;
const RIPPLE_MODES: ReadonlyArray<RippleMode> = [
  "waves",
  "sand",
  "jello",
  "cymatics",
];
const MIN_BPM = 60;
const MAX_BPM = 180;

/** Everything needed to rebuild a ripples piece after a reload. */
export type RipplesSetup = {
  mode: RippleMode;
  bpm: number;
  signature: TimeSignature;
  root: Key;
  scale: ScaleName;
  sources: RippleSource[];
  notes: LoopNote[];
};

type Unknown = Record<string, unknown>;

const isRecord = (value: unknown): value is Unknown =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const oneOf = <T extends string>(
  options: ReadonlyArray<T>,
  value: unknown,
  fallback: T,
): T => (options.includes(value as T) ? (value as T) : fallback);

const numberIn = (
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;

const wholeNumber = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) ? value : null;

const parseSource = (value: unknown): RippleSource | null => {
  if (!isRecord(value)) return null;
  const id = wholeNumber(value.id);
  const timbre = TIMBRES.find((candidate) => candidate === value.timbre);
  if (id === null || !timbre) return null;
  const lfoTarget = oneOf(LFO_TARGETS, value.lfoTarget, "volume");
  return {
    id,
    x: numberIn(value.x, 0, 1, 0.5),
    y: numberIn(value.y, 0, 1, 0.5),
    rate: oneOf(
      NOTE_VALUES.map((note) => note.value),
      value.rate,
      "1/4",
    ),
    decay: snapSound("decay", numberIn(value.decay, 0, 1, 0.5)),
    strength: snapSound("strength", numberIn(value.strength, 0, 4, 1)),
    timbre,
    lfoTarget: getLfoTargets(timbre).includes(lfoTarget) ? lfoTarget : "volume",
    muted: value.muted === true,
    pitch: Math.round(
      numberIn(value.pitch, MIN_PITCH, MAX_PITCH, DEFAULT_PITCH),
    ),
  };
};

const parseNote = (value: unknown, sourceIds: Set<number>): LoopNote | null => {
  if (!isRecord(value)) return null;
  const id = wholeNumber(value.id);
  const sourceId = wholeNumber(value.sourceId);
  if (id === null || sourceId === null || !sourceIds.has(sourceId)) return null;
  return {
    id,
    sourceId,
    start: Math.round(numberIn(value.start, 0, Infinity, 0)),
    length: Math.round(numberIn(value.length, 1, Infinity, 1)),
    pitch: Math.round(
      numberIn(value.pitch, MIN_PITCH, MAX_PITCH, DEFAULT_PITCH),
    ),
  };
};

export const serializeRipplesSetup = (setup: RipplesSetup) =>
  JSON.stringify({ version: VERSION, ...setup });

/** Reads a saved setup, repairing what it can and dropping what it cannot. */
export const parseRipplesSetup = (raw: string | null): RipplesSetup | null => {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value) || value.version !== VERSION) return null;
  const sources = (Array.isArray(value.sources) ? value.sources : [])
    .map(parseSource)
    .filter((source): source is RippleSource => source !== null);
  const sourceIds = new Set(sources.map(({ id }) => id));
  const notes = (Array.isArray(value.notes) ? value.notes : [])
    .map((note) => parseNote(note, sourceIds))
    .filter((note): note is LoopNote => note !== null);
  return {
    mode: oneOf(RIPPLE_MODES, value.mode, "sand"),
    bpm: Math.round(numberIn(value.bpm, MIN_BPM, MAX_BPM, 120)),
    signature: oneOf(TIME_SIGNATURES, value.signature, "4/4"),
    root: oneOf(KEYS, value.root, "C"),
    scale: oneOf(
      Object.keys(SCALES) as ScaleName[],
      value.scale,
      "minor-pentatonic",
    ),
    sources,
    notes,
  };
};
