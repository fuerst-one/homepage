"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createWaveFieldEngine,
  WaveFieldEngine,
} from "./createWaveFieldEngine";
import { createRippleAudio, RippleAudio } from "./rippleAudio";
import { createRippleLoop, LoopNote, TimeSignature } from "./rippleLoop";
import { createHumSignal, createPlateSignal } from "./plateVoice";
import { RipplesSetup } from "./ripplesSetup";
import { createSandLayer, SandLayer } from "./sandLayer";
import {
  DEFAULT_SOUND,
  getLfoCurve,
  getNoteBeats,
  getPlateDamping,
  SourceSound,
  toVibration,
} from "./sourceSound";
import { getLfoTargets, getMidiFrequency, Key, ScaleName } from "./timbres";
import { RippleMode, RippleSource, SourceVoice } from "./types";

// Fast enough that the finer rings of a timbre's overtones stay wider than a cell.
const RIPPLE_SPEED = 30;
const MAX_FRAME_SECONDS = 0.05;
// After a pause or a hidden tab, skip the missed steps instead of firing them all at once.
const MAX_CATCH_UP_SECONDS = 0.25;
const DEFAULT_BPM = 120;
const DEFAULT_SIGNATURE: TimeSignature = "4/4";
const DEFAULT_ROOT: Key = "C";
const DEFAULT_SCALE: ScaleName = "minor-pentatonic";
const STEPS_PER_BEAT = 4;
const LFO_CURVE_POINTS = 256;
// Gives the audio thread a moment so notes start on time instead of late.
const AUDIO_LOOKAHEAD_SECONDS = 0.02;

const DEFAULT_VOICE: SourceVoice = {
  timbre: "pluck",
  lfoTarget: "volume",
  pitch: 60,
};

type SampleArgs = { width: number; height: number; cellAspect: number };

type Simulation = {
  key: string;
  width: number;
  height: number;
  engine: WaveFieldEngine;
  sand: SandLayer;
  luminance: Uint8Array;
};

/** The note a source is currently playing on the plate. */
type Playing = {
  engineStart: number;
  noteSeconds: number;
  /** The plate's shaking for the note, seconds after it started. */
  signal: (seconds: number) => number | null;
};

const resolveLfoTarget = (source: RippleSource) =>
  getLfoTargets(source.timbre).includes(source.lfoTarget)
    ? source.lfoTarget
    : "volume";

const atRest = () => 0;

type RipplesOptions = { mode: RippleMode };

const nowSeconds = () => performance.now() / 1000;

const toCell = (simulation: Simulation, { x, y }: RippleSource) => ({
  x: Math.min(
    simulation.width - 1,
    Math.max(0, Math.floor(x * simulation.width)),
  ),
  y: Math.min(
    simulation.height - 1,
    Math.max(0, Math.floor(y * simulation.height)),
  ),
});

const createSimulation = (
  key: string,
  { width, height, cellAspect }: SampleArgs,
) => ({
  key,
  width,
  height,
  engine: createWaveFieldEngine({
    width,
    height,
    cellAspect,
    speed: RIPPLE_SPEED,
    damping: getPlateDamping(
      "waves",
      toVibration(DEFAULT_SOUND, DEFAULT_BPM, 1),
    ),
  }),
  sand: createSandLayer(width, height, cellAspect),
  luminance: new Uint8Array(width * height),
});

const stepsToBeats = (steps: number) => steps / STEPS_PER_BEAT;

/** A new note lasts one bounce of the source's rate. */
const defaultNoteSteps = (rate: SourceSound["rate"]) =>
  Math.max(1, Math.round(getNoteBeats(rate) * STEPS_PER_BEAT));

export const useRipples = (
  active: boolean,
  canvas: HTMLCanvasElement | null,
  { mode }: RipplesOptions,
) => {
  const simulationRef = useRef<Simulation | null>(null);
  const loopRef = useRef(
    createRippleLoop({ bpm: DEFAULT_BPM, signature: DEFAULT_SIGNATURE }),
  );
  const audioRef = useRef<RippleAudio | null>(null);
  const sourcesRef = useRef<RippleSource[]>([]);
  const lastFiredRef = useRef(new Map<number, number>());
  const playingRef = useRef(new Map<number, Playing>());
  /** The plate fades like the note that started last. */
  const fadeRef = useRef<{ sourceId: number; noteBeats: number } | null>(null);
  const templateRef = useRef<SourceSound & SourceVoice>({
    ...DEFAULT_SOUND,
    ...DEFAULT_VOICE,
  });
  const lastFrameRef = useRef<number | null>(null);
  const nextIdRef = useRef(1);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const [sources, setSources] = useState<RippleSource[]>([]);
  const [bpm, setBpmState] = useState(DEFAULT_BPM);
  const [signature, setSignatureState] =
    useState<TimeSignature>(DEFAULT_SIGNATURE);
  const [root, setRoot] = useState<Key>(DEFAULT_ROOT);
  const [scale, setScale] = useState<ScaleName>(DEFAULT_SCALE);
  const [soundOn, setSoundOn] = useState(false);
  const [, setLoopVersion] = useState(0);
  const loopChanged = useCallback(
    () => setLoopVersion((version) => version + 1),
    [],
  );

  const commitSources = useCallback((next: RippleSource[]) => {
    sourcesRef.current = next;
    setSources(next);
  }, []);

  const startNote = useCallback((note: LoopNote, wallTime: number) => {
    const source = sourcesRef.current.find(({ id }) => id === note.sourceId);
    if (!source || source.muted) return;
    const noteBeats = stepsToBeats(note.length);
    lastFiredRef.current.set(source.id, wallTime);
    fadeRef.current = { sourceId: source.id, noteBeats };
    const bpm = loopRef.current.bpm;
    const vibration = toVibration(source, bpm, noteBeats);
    const lfoTarget = resolveLfoTarget(source);
    const simulation = simulationRef.current;
    if (simulation) {
      // The plate plays a slowed-down copy of the same note the speaker plays.
      playingRef.current.set(source.id, {
        engineStart: simulation.engine.time,
        noteSeconds: vibration.bounces / vibration.frequency,
        signal: createPlateSignal({
          timbre: source.timbre,
          pitch: note.pitch,
          lfoTarget,
          vibration,
          seed: source.id,
        }),
      });
    }
    const audio = audioRef.current;
    const audioTime = audio?.isEnabled ? audio.currentTime() : null;
    if (!audio || audioTime === null) return;
    audio.play({
      timbre: source.timbre,
      frequency: getMidiFrequency(note.pitch),
      startTime: audioTime + AUDIO_LOOKAHEAD_SECONDS,
      duration: (noteBeats * 60) / bpm,
      lfoTarget,
      lfoCurve: getLfoCurve(vibration, LFO_CURVE_POINTS),
    });
  }, []);

  const sample = useCallback(
    (args: SampleArgs) => {
      const simulationKey = `${args.width}x${args.height}:${args.cellAspect}`;
      if (simulationRef.current?.key !== simulationKey) {
        simulationRef.current = createSimulation(simulationKey, args);
        playingRef.current.clear();
      }
      const simulation = simulationRef.current;
      const mode = modeRef.current;

      const now = nowSeconds();
      const last = lastFrameRef.current;
      lastFrameRef.current = now;
      const elapsed = last === null ? 0 : now - last;
      const fired = loopRef.current.advance(elapsed);
      if (elapsed <= MAX_CATCH_UP_SECONDS) {
        for (const note of fired) startNote(note, now);
      }

      const engineTime = simulation.engine.time;
      const bpm = loopRef.current.bpm;
      const oscillators = sourcesRef.current.map((source) => {
        const cell = toCell(simulation, source);
        if (source.muted) return { ...cell, signal: atRest };
        if (mode === "cymatics") {
          return {
            ...cell,
            signal: createHumSignal({
              timbre: source.timbre,
              pitch: source.pitch,
              strength: source.strength,
              seed: source.id,
            }),
          };
        }
        const playing = playingRef.current.get(source.id);
        if (
          playing &&
          engineTime - playing.engineStart >= playing.noteSeconds
        ) {
          playingRef.current.delete(source.id);
        }
        const current = playingRef.current.get(source.id);
        // A source that is not playing is held still, like a speaker that
        // stops dead, so its spot does not keep ringing after the note.
        return {
          ...cell,
          signal: current
            ? (seconds: number) =>
                current.signal(seconds - current.engineStart) ?? 0
            : atRest,
        };
      });
      const fade = fadeRef.current;
      const fadeSource = sourcesRef.current.find(
        ({ id }) => id === fade?.sourceId,
      );
      simulation.engine.setDamping(
        getPlateDamping(
          mode,
          toVibration(fadeSource ?? DEFAULT_SOUND, bpm, fade?.noteBeats ?? 1),
          {
            playing:
              mode === "cymatics"
                ? sourcesRef.current.some(({ muted }) => !muted)
                : playingRef.current.size > 0,
          },
        ),
      );
      simulation.engine.setOscillators(oscillators);

      const dt = Math.min(elapsed, MAX_FRAME_SECONDS);
      if (dt > 0) {
        simulation.engine.step(dt);
        simulation.sand.update(simulation.engine.height, dt, mode);
      }
      simulation.sand.writeLuminance(
        simulation.engine.height,
        mode,
        simulation.luminance,
      );
      return { luminance: simulation.luminance };
    },
    [startNote],
  );

  useEffect(() => {
    if (!active || !canvas) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      const source: RippleSource = {
        ...templateRef.current,
        muted: false,
        id: nextIdRef.current++,
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
      };
      commitSources([...sourcesRef.current, source]);
      const { note, isAhead } = loopRef.current.recordNote(source.id, {
        length: defaultNoteSteps(source.rate),
        pitch: source.pitch,
      });
      loopChanged();
      // A click that rounds up to the next step is fired by the loop moments later.
      if (!isAhead) startNote(note, nowSeconds());
    };
    canvas.addEventListener("pointerdown", handlePointerDown);
    return () => canvas.removeEventListener("pointerdown", handlePointerDown);
  }, [active, canvas, commitSources, loopChanged, startNote]);

  useEffect(() => () => audioRef.current?.dispose(), []);

  const removeSource = useCallback(
    (id: number) => {
      loopRef.current.removeSource(id);
      lastFiredRef.current.delete(id);
      playingRef.current.delete(id);
      commitSources(sourcesRef.current.filter((source) => source.id !== id));
      loopChanged();
    },
    [commitSources, loopChanged],
  );

  const moveSource = useCallback(
    (id: number, x: number, y: number) => {
      commitSources(
        sourcesRef.current.map((source) =>
          source.id === id
            ? {
                ...source,
                x: Math.min(1, Math.max(0, x)),
                y: Math.min(1, Math.max(0, y)),
              }
            : source,
        ),
      );
    },
    [commitSources],
  );

  /** Edits a source's sound or voice; new sources start from the last edit. */
  const updateSource = useCallback(
    (id: number, change: Partial<SourceSound & SourceVoice>) => {
      const next = sourcesRef.current.map((source) => {
        if (source.id !== id) return source;
        const edited = { ...source, ...change };
        if (!getLfoTargets(edited.timbre).includes(edited.lfoTarget)) {
          edited.lfoTarget = "volume";
        }
        return edited;
      });
      const edited = next.find((source) => source.id === id);
      if (edited) {
        const { rate, decay, strength, timbre, lfoTarget, pitch } = edited;
        templateRef.current = {
          rate,
          decay,
          strength,
          timbre,
          lfoTarget,
          pitch,
        };
      }
      commitSources(next);
    },
    [commitSources],
  );

  const setSourceMuted = useCallback(
    (id: number, muted: boolean) => {
      if (muted) playingRef.current.delete(id);
      commitSources(
        sourcesRef.current.map((source) =>
          source.id === id ? { ...source, muted } : source,
        ),
      );
    },
    [commitSources],
  );

  const addNote = useCallback(
    (sourceId: number, start: number) => {
      const source = sourcesRef.current.find(({ id }) => id === sourceId);
      if (!source) return null;
      const note = loopRef.current.addNote({
        sourceId,
        start,
        length: defaultNoteSteps(source.rate),
        pitch: source.pitch,
      });
      loopChanged();
      return note;
    },
    [loopChanged],
  );

  const editNotes = useCallback(
    <A extends unknown[]>(apply: (...args: A) => void) =>
      (...args: A) => {
        apply(...args);
        loopChanged();
      },
    [loopChanged],
  );

  /** Flattens the water and spreads the sand evenly; sources and notes stay. */
  const resetField = useCallback(() => {
    playingRef.current.clear();
    simulationRef.current?.engine.reset();
    simulationRef.current?.sand.reset();
  }, []);

  const undo = useCallback(() => {
    const lastSource = sourcesRef.current.at(-1);
    if (lastSource) removeSource(lastSource.id);
  }, [removeSource]);

  const clear = useCallback(() => {
    loopRef.current.clear();
    lastFiredRef.current.clear();
    playingRef.current.clear();
    commitSources([]);
    simulationRef.current?.sand.reset();
    loopChanged();
  }, [commitSources, loopChanged]);

  const setBpm = useCallback((value: number) => {
    loopRef.current.setBpm(value);
    setBpmState(value);
  }, []);

  const setSignature = useCallback(
    (value: TimeSignature) => {
      loopRef.current.setSignature(value);
      setSignatureState(value);
      loopChanged();
    },
    [loopChanged],
  );

  /** Rebuilds a saved piece; the plate's mode is restored by the caller. */
  const restore = useCallback(
    (setup: Omit<RipplesSetup, "mode">) => {
      const loop = loopRef.current;
      loop.setBpm(setup.bpm);
      loop.setSignature(setup.signature);
      loop.loadNotes(setup.notes);
      setBpmState(setup.bpm);
      setSignatureState(setup.signature);
      setRoot(setup.root);
      setScale(setup.scale);
      nextIdRef.current = Math.max(0, ...setup.sources.map(({ id }) => id)) + 1;
      const last = setup.sources.at(-1);
      if (last) {
        const { rate, decay, strength, timbre, lfoTarget, pitch } = last;
        templateRef.current = {
          rate,
          decay,
          strength,
          timbre,
          lfoTarget,
          pitch,
        };
      }
      commitSources(setup.sources);
      loopChanged();
    },
    [commitSources, loopChanged],
  );

  const toggleSound = useCallback(async () => {
    if (audioRef.current?.isEnabled) {
      audioRef.current.disable();
      setSoundOn(false);
      return;
    }
    audioRef.current ??= createRippleAudio();
    await audioRef.current.enable();
    setSoundOn(audioRef.current.isEnabled);
  }, []);

  const getPlayhead = useCallback(() => loopRef.current.position, []);
  /** The source's longest note, or one bounce when it has no notes yet. */
  const getPreviewBeats = useCallback((sourceId: number) => {
    const lengths = loopRef.current.notes
      .filter((note) => note.sourceId === sourceId)
      .map((note) => stepsToBeats(note.length));
    if (lengths.length > 0) return Math.max(...lengths);
    const source = sourcesRef.current.find(({ id }) => id === sourceId);
    return getNoteBeats(source?.rate ?? DEFAULT_SOUND.rate);
  }, []);
  const getFireAge = useCallback(
    (id: number) => nowSeconds() - (lastFiredRef.current.get(id) ?? -Infinity),
    [],
  );

  const loop = loopRef.current;
  return {
    sample,
    sources,
    notes: loop.notes,
    stepCount: loop.stepCount,
    bpm,
    signature,
    root,
    scale,
    soundOn,
    setBpm,
    setSignature,
    setRoot,
    setScale,
    toggleSound,
    removeSource,
    moveSource,
    updateSource,
    setSourceMuted,
    addNote,
    moveNote: editNotes(loop.moveNote),
    resizeNote: editNotes(loop.resizeNote),
    setNoteSpan: editNotes(loop.setNoteSpan),
    restore,
    setNotePitch: editNotes(loop.setNotePitch),
    removeNote: editNotes(loop.removeNote),
    resetField,
    undo,
    clear,
    getPlayhead,
    getPreviewBeats,
    getFireAge,
  };
};
