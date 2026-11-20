"use client";

import { Eraser, Minus, Plus, Undo2, Volume2, VolumeX } from "lucide-react";
import {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from "react";
import { SegmentedControl } from "../SegmentedControl";
import { LoopNote, TIME_SIGNATURES, TimeSignature } from "./rippleLoop";
import {
  getLfoTargets,
  getNoteName,
  Key,
  KEYS,
  LfoTarget,
  ScaleChoice,
  ScaleName,
  SCALES,
  stepPitch,
  Timbre,
  TIMBRES,
} from "./timbres";
import { RippleSource, SourceVoice } from "./types";
import { useAnimationFrame } from "./useAnimationFrame";

const MIN_BPM = 60;
const MAX_BPM = 180;
const BPM_STEP = 5;
const ICON_SIZE = 14;

const TIMBRE_LABELS: Record<Timbre, string> = {
  sine: "Sine",
  triangle: "Triangle",
  square: "Square",
  saw: "Saw",
  noise: "Noise",
  "fm-bell": "FM bell",
  pluck: "Pluck",
  bass: "Bass",
  kick: "Kick",
  snare: "Snare",
  hihat: "Hi-hat",
};

const getTargetLabels = (de: boolean): Record<LfoTarget, string> => ({
  volume: de ? "Lautstärke" : "Volume",
  lowpass: de ? "Tiefpass" : "Low-pass",
  highpass: de ? "Hochpass" : "High-pass",
  pitch: de ? "Tonhöhe" : "Pitch",
});

/** Vertical pointer travel that moves a note one scale step up or down. */
const PITCH_DRAG_PX = 8;

const getScaleLabels = (de: boolean): Record<ScaleName, string> => ({
  "minor-pentatonic": de ? "Moll-Pentatonik" : "Minor pentatonic",
  "major-pentatonic": de ? "Dur-Pentatonik" : "Major pentatonic",
  major: de ? "Dur" : "Major",
  minor: de ? "Moll" : "Minor",
  dorian: de ? "Dorisch" : "Dorian",
  blues: "Blues",
  chromatic: de ? "Chromatisch" : "Chromatic",
});

type Drag =
  | { mode: "move"; noteId: number; grabOffset: number }
  | { mode: "pitch"; noteId: number; originY: number; originPitch: number }
  | { mode: "resize-end"; noteId: number; start: number }
  | { mode: "resize-start"; noteId: number; end: number };

type RipplesArrangementProps = {
  de: boolean;
  sources: ReadonlyArray<RippleSource>;
  notes: ReadonlyArray<LoopNote>;
  stepCount: number;
  signature: TimeSignature;
  bpm: number;
  scaleChoice: ScaleChoice;
  getPlayhead: () => number;
  onBpmChange: (bpm: number) => void;
  onSignatureChange: (signature: TimeSignature) => void;
  onRootChange: (root: Key) => void;
  onScaleChange: (scale: ScaleName) => void;
  onVoiceChange: (sourceId: number, voice: Partial<SourceVoice>) => void;
  onMutedChange: (sourceId: number, muted: boolean) => void;
  onAddNote: (sourceId: number, start: number) => LoopNote | null;
  onMoveNote: (noteId: number, start: number) => void;
  onResizeNote: (noteId: number, length: number) => void;
  onNoteSpanChange: (noteId: number, start: number, length: number) => void;
  onNotePitchChange: (noteId: number, pitch: number) => void;
  onRemoveNote: (noteId: number) => void;
  onUndo: () => void;
  onClear: () => void;
};

const getStepsPerBeat = (signature: TimeSignature) =>
  signature.endsWith("/8") ? 2 : 4;

export const RipplesArrangement = ({
  de,
  sources,
  notes,
  stepCount,
  signature,
  bpm,
  scaleChoice,
  getPlayhead,
  onBpmChange,
  onSignatureChange,
  onRootChange,
  onScaleChange,
  onVoiceChange,
  onMutedChange,
  onAddNote,
  onMoveNote,
  onResizeNote,
  onNoteSpanChange,
  onNotePitchChange,
  onRemoveNote,
  onUndo,
  onClear,
}: RipplesArrangementProps) => {
  const lanesRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const targetLabels = getTargetLabels(de);
  const scaleLabels = getScaleLabels(de);

  useAnimationFrame(() => {
    lanesRef.current?.style.setProperty(
      "--playhead",
      (getPlayhead() / stepCount).toFixed(4),
    );
  });

  /** Walks the pitch through the current scale, snapping it on the first step. */
  const stepPitchBy = (pitch: number, steps: number) => {
    let next = pitch;
    for (let i = 0; i < Math.abs(steps); i++) {
      next = stepPitch(next, steps > 0 ? 1 : -1, scaleChoice);
    }
    return next;
  };

  const stepAt = (grid: HTMLElement, clientX: number) => {
    const rect = grid.getBoundingClientRect();
    return Math.floor(((clientX - rect.left) / rect.width) * stepCount);
  };

  const handleGridPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    sourceId: number,
  ) => {
    if (event.button !== 0) return;
    const grid = event.currentTarget;
    const step = stepAt(grid, event.clientX);
    const target = event.target as HTMLElement;
    const noteElement = target.closest<HTMLElement>("[data-note-id]");
    grid.setPointerCapture(event.pointerId);
    if (noteElement) {
      const noteId = Number(noteElement.dataset.noteId);
      const note = notes.find(({ id }) => id === noteId);
      if (!note) return;
      setSelectedId(noteId);
      noteElement.focus({ preventScroll: true });
      const grip = target.closest<HTMLElement>("[data-grip]")?.dataset.grip;
      dragRef.current =
        grip === "end"
          ? { mode: "resize-end", noteId, start: note.start }
          : grip === "start"
            ? { mode: "resize-start", noteId, end: note.start + note.length }
            : target.closest("[data-pitch]")
              ? {
                  mode: "pitch",
                  noteId,
                  originY: event.clientY,
                  originPitch: note.pitch,
                }
              : { mode: "move", noteId, grabOffset: step - note.start };
      return;
    }
    // Like a piano roll: a click adds a note, dragging on sets its length.
    const note = onAddNote(sourceId, step);
    if (!note) return;
    setSelectedId(note.id);
    dragRef.current = {
      mode: "resize-end",
      noteId: note.id,
      start: note.start,
    };
  };

  const handleGridPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const step = stepAt(event.currentTarget, event.clientX);
    const note = notes.find(({ id }) => id === drag.noteId);
    if (!note) return;
    if (drag.mode === "resize-end") {
      const length = Math.max(1, step - drag.start + 1);
      if (length !== note.length) onResizeNote(note.id, length);
      return;
    }
    if (drag.mode === "resize-start") {
      const start = Math.min(step, drag.end - 1);
      if (start !== note.start) {
        onNoteSpanChange(note.id, start, drag.end - start);
      }
      return;
    }
    if (drag.mode === "move") {
      const start = step - drag.grabOffset;
      if (start !== note.start) onMoveNote(note.id, start);
      return;
    }
    const steps = Math.round((drag.originY - event.clientY) / PITCH_DRAG_PX);
    const pitch = stepPitchBy(drag.originPitch, steps);
    if (pitch !== note.pitch) onNotePitchChange(note.id, pitch);
  };

  const handleGridWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.closest("[data-pitch]")) return;
    const noteId =
      target.closest<HTMLElement>("[data-note-id]")?.dataset.noteId;
    const note = notes.find(({ id }) => id === Number(noteId));
    if (!note) return;
    onNotePitchChange(
      note.id,
      stepPitch(note.pitch, event.deltaY < 0 ? 1 : -1, scaleChoice),
    );
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  // The lane captures the pointer for dragging, so the browser sends the
  // double-click to the lane, not the note; find the note under the pointer.
  const handleGridDoubleClick = (
    event: MouseEvent<HTMLDivElement>,
    sourceId: number,
  ) => {
    const step = stepAt(event.currentTarget, event.clientX);
    const note = notes.find(
      (candidate) =>
        candidate.sourceId === sourceId &&
        step >= candidate.start &&
        step < candidate.start + candidate.length,
    );
    if (!note) return;
    onRemoveNote(note.id);
    setSelectedId(null);
  };

  const handleNoteKey = (note: LoopNote, event: KeyboardEvent<HTMLElement>) => {
    const handled = () => event.preventDefault();
    if (event.key === "ArrowUp") {
      handled();
      onNotePitchChange(note.id, stepPitch(note.pitch, 1, scaleChoice));
    } else if (event.key === "ArrowDown") {
      handled();
      onNotePitchChange(note.id, stepPitch(note.pitch, -1, scaleChoice));
    } else if (event.key === "ArrowLeft") {
      handled();
      onMoveNote(note.id, note.start - 1);
    } else if (event.key === "ArrowRight") {
      handled();
      onMoveNote(note.id, note.start + 1);
    } else if (event.key === "Delete" || event.key === "Backspace") {
      handled();
      onRemoveNote(note.id);
      setSelectedId(null);
    }
  };

  const stepsPerBeat = getStepsPerBeat(signature);
  const gridStyle = {
    "--steps": stepCount,
    "--beat-steps": stepsPerBeat,
  } as CSSProperties;

  return (
    <div className="ripples-arrangement">
      <div className="ripples-timeline-header">
        <div className="playground-field">
          <span className="playground-field-label">Tempo</span>
          <div className="playground-segments">
            <button
              type="button"
              className="playground-segment"
              onClick={() => onBpmChange(Math.max(MIN_BPM, bpm - BPM_STEP))}
              disabled={bpm <= MIN_BPM}
              aria-label={de ? "Langsamer" : "Slower"}
            >
              <Minus size={ICON_SIZE} aria-hidden />
            </button>
            <output className="ripples-bpm" aria-live="polite">
              {bpm} BPM
            </output>
            <button
              type="button"
              className="playground-segment"
              onClick={() => onBpmChange(Math.min(MAX_BPM, bpm + BPM_STEP))}
              disabled={bpm >= MAX_BPM}
              aria-label={de ? "Schneller" : "Faster"}
            >
              <Plus size={ICON_SIZE} aria-hidden />
            </button>
          </div>
        </div>
        <SegmentedControl
          label={de ? "Takt" : "Time"}
          value={signature}
          options={TIME_SIGNATURES.map((value) => ({ value, label: value }))}
          onChange={onSignatureChange}
        />
        <label className="playground-field">
          <span className="playground-field-label">
            {de ? "Skala" : "Scale"}
          </span>
          <select
            className="ripples-select"
            value={scaleChoice.root}
            aria-label={de ? "Grundton" : "Root"}
            onChange={(event) => onRootChange(event.target.value as Key)}
          >
            {KEYS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            className="ripples-select"
            value={scaleChoice.scale}
            aria-label={de ? "Skala" : "Scale"}
            onChange={(event) => onScaleChange(event.target.value as ScaleName)}
          >
            {(Object.keys(SCALES) as ScaleName[]).map((value) => (
              <option key={value} value={value}>
                {scaleLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <div className="ripples-timeline-actions">
          <button
            type="button"
            className="playground-action"
            onClick={onUndo}
            disabled={sources.length === 0}
          >
            <Undo2 size={ICON_SIZE} aria-hidden />
            <span>{de ? "Rückgängig" : "Undo"}</span>
          </button>
          <button
            type="button"
            className="playground-action"
            onClick={onClear}
            disabled={sources.length === 0}
          >
            <Eraser size={ICON_SIZE} aria-hidden />
            <span>{de ? "Leeren" : "Clear"}</span>
          </button>
        </div>
      </div>
      <div ref={lanesRef} className="ripples-lanes">
        {sources.length === 0 && (
          <p className="ripples-lanes-empty">
            {de
              ? "Klicke auf die Fläche, um eine Quelle zu setzen."
              : "Click the plate to place a source."}
          </p>
        )}
        {sources.map((source, index) => (
          <div
            key={source.id}
            className="ripples-lane"
            data-muted={source.muted || undefined}
          >
            <div className="ripples-lane-head">
              <span className="ripples-lane-number">{index + 1}</span>
              <button
                type="button"
                className="ripples-lane-mute"
                aria-pressed={source.muted}
                aria-label={
                  source.muted
                    ? de
                      ? `Quelle ${index + 1} einschalten`
                      : `Unmute source ${index + 1}`
                    : de
                      ? `Quelle ${index + 1} stummschalten`
                      : `Mute source ${index + 1}`
                }
                title={
                  source.muted
                    ? de
                      ? "Einschalten"
                      : "Unmute"
                    : de
                      ? "Stummschalten"
                      : "Mute"
                }
                onClick={() => onMutedChange(source.id, !source.muted)}
              >
                {source.muted ? (
                  <VolumeX size={13} aria-hidden />
                ) : (
                  <Volume2 size={13} aria-hidden />
                )}
              </button>
              <select
                className="ripples-select"
                value={source.timbre}
                aria-label={de ? "Klang" : "Sound"}
                onChange={(event) =>
                  onVoiceChange(source.id, {
                    timbre: event.target.value as Timbre,
                  })
                }
              >
                {TIMBRES.map((timbre) => (
                  <option key={timbre} value={timbre}>
                    {TIMBRE_LABELS[timbre]}
                  </option>
                ))}
              </select>
              <select
                className="ripples-select"
                value={source.lfoTarget}
                aria-label={de ? "LFO steuert" : "LFO modulates"}
                onChange={(event) =>
                  onVoiceChange(source.id, {
                    lfoTarget: event.target.value as LfoTarget,
                  })
                }
              >
                {getLfoTargets(source.timbre).map((target) => (
                  <option key={target} value={target}>
                    {targetLabels[target]}
                  </option>
                ))}
              </select>
            </div>
            <div
              className="ripples-lane-grid"
              style={gridStyle}
              onPointerDown={(event) => handleGridPointerDown(event, source.id)}
              onPointerMove={handleGridPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onWheel={handleGridWheel}
              onDoubleClick={(event) => handleGridDoubleClick(event, source.id)}
            >
              {notes
                .filter((note) => note.sourceId === source.id)
                .map((note) => (
                  <div
                    key={note.id}
                    data-note-id={note.id}
                    className="ripples-note"
                    data-selected={note.id === selectedId || undefined}
                    tabIndex={0}
                    role="button"
                    aria-label={`${getNoteName(note.pitch)}, ${
                      de ? "Schritt" : "step"
                    } ${note.start + 1}, ${note.length} ${
                      de ? "Schritte" : "steps"
                    }`}
                    style={{
                      left: `${(note.start / stepCount) * 100}%`,
                      width: `${(note.length / stepCount) * 100}%`,
                    }}
                    onKeyDown={(event) => handleNoteKey(note, event)}
                  >
                    <span className="ripples-note-grip" data-grip="start" />
                    <span
                      className="ripples-note-name"
                      data-pitch
                      title={
                        de
                          ? "Hoch/runter ziehen ändert die Tonhöhe"
                          : "Drag up or down to change the pitch"
                      }
                    >
                      {getNoteName(note.pitch)}
                    </span>
                    <span className="ripples-note-grip" data-grip="end" />
                  </div>
                ))}
            </div>
          </div>
        ))}
        {sources.length > 0 && (
          <span className="ripples-playhead" aria-hidden />
        )}
      </div>
    </div>
  );
};
