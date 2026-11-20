"use client";

import { Trash2 } from "lucide-react";
import {
  CSSProperties,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  useRef,
} from "react";
import {
  NOTE_VALUES,
  snapSound,
  SOUND_RANGES,
  SourceSound,
  toVibration,
} from "./sourceSound";
import { useDismissOnOutside } from "./useDismissOnOutside";
import {
  decayFromEnvelopeRatio,
  EDITOR_BPM,
  getWaveformSamples,
  getWaveHandles,
  MAX_STRENGTH,
  rateFromCycleEnd,
  strengthFromEnvelopeHeight,
  getNoteSpan,
} from "./waveformGeometry";

const VIEW_WIDTH = 240;
const VIEW_HEIGHT = 112;
const AXIS_Y = 48;
const HALF_HEIGHT = 42;
const SAMPLE_COUNT = 240;

type HandleId = keyof SourceSound;

// The rate knob sits on its own lane below the wave, at the end of the first bounce.
const RATE_LANE_Y = 102;
const yOf = (amplitude: number) =>
  AXIS_Y - (amplitude / MAX_STRENGTH) * HALF_HEIGHT;
const ENVELOPE_POINTS = 32;

type SourceWaveMenuProps = {
  de: boolean;
  number: number;
  sound: SourceSound;
  /** Length of the note the preview shows, in beats. */
  previewBeats: number;
  side: "right" | "left";
  style: CSSProperties;
  onChange: (sound: Partial<SourceSound>) => void;
  onDelete: () => void;
  onClose: () => void;
};

export const SourceWaveMenu = ({
  de,
  number,
  sound,
  previewBeats,
  side,
  style,
  onChange,
  onDelete,
  onClose,
}: SourceWaveMenuProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef<HandleId | null>(null);
  useDismissOnOutside(panelRef, onClose);

  // Resolved at 60 BPM so the editor's "seconds" read as beats.
  const vibration = toVibration(sound, EDITOR_BPM, previewBeats);
  const handles = getWaveHandles(vibration);
  const samples = getWaveformSamples(vibration, SAMPLE_COUNT);
  const noteSpan = getNoteSpan(vibration);
  const xOf = (beats: number) =>
    (Math.min(beats, noteSpan) / noteSpan) * VIEW_WIDTH;
  const rateIndex = NOTE_VALUES.findIndex(({ value }) => value === sound.rate);
  const path = samples
    .map((value, index) => {
      const x = (index / SAMPLE_COUNT) * VIEW_WIDTH;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${yOf(value).toFixed(1)}`;
    })
    .join(" ");
  const envelope = Array.from({ length: ENVELOPE_POINTS + 1 }, (_, index) => {
    const seconds = (index / ENVELOPE_POINTS) * handles.envelopeEnd.seconds;
    const amplitude =
      sound.strength *
      (1 - sound.decay) ** (seconds / handles.envelopeEnd.seconds);
    return `${index === 0 ? "M" : "L"}${xOf(seconds).toFixed(1)},${yOf(amplitude).toFixed(1)}`;
  }).join(" ");

  const toView = (event: ReactPointerEvent<SVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      beats: ((event.clientX - rect.left) / rect.width) * noteSpan,
      height:
        (AXIS_Y - ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT) /
        HALF_HEIGHT,
    };
  };

  const applyDrag = (id: HandleId, event: ReactPointerEvent<SVGElement>) => {
    const point = toView(event);
    if (!point) return;
    if (id === "strength") {
      onChange({ strength: strengthFromEnvelopeHeight(point.height) });
    } else if (id === "decay") {
      const startHeight = sound.strength / MAX_STRENGTH;
      onChange({ decay: decayFromEnvelopeRatio(point.height / startHeight) });
    } else {
      onChange({ rate: rateFromCycleEnd(point.beats) });
    }
  };

  const nudge = (key: HandleId, event: KeyboardEvent<SVGElement>) => {
    const delta =
      event.key === "ArrowUp" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowDown" || event.key === "ArrowLeft"
          ? -1
          : 0;
    if (delta === 0) return;
    event.preventDefault();
    if (key === "rate") {
      // Right and up lengthen the bounce; the notes are listed longest first.
      const next = Math.min(
        NOTE_VALUES.length - 1,
        Math.max(0, rateIndex - delta),
      );
      onChange({ rate: NOTE_VALUES[next].value });
      return;
    }
    onChange({
      [key]: snapSound(key, sound[key] + delta * SOUND_RANGES[key].step),
    });
  };

  const handleProps = (id: HandleId, label: string, valueText: string) => {
    const range =
      id === "rate"
        ? { min: 0, max: NOTE_VALUES.length - 1, now: rateIndex }
        : { ...SOUND_RANGES[id], now: sound[id] };
    return {
      role: "slider",
      tabIndex: 0,
      "aria-label": label,
      "aria-valuemin": range.min,
      "aria-valuemax": range.max,
      "aria-valuenow": range.now,
      "aria-valuetext": valueText,
      className: "ripples-wave-handle",
      "data-handle": id,
      onPointerDown: (event: ReactPointerEvent<SVGElement>) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        draggingRef.current = id;
      },
      onPointerMove: (event: ReactPointerEvent<SVGElement>) => {
        if (draggingRef.current === id) applyDrag(id, event);
      },
      onPointerUp: () => {
        draggingRef.current = null;
      },
      onPointerCancel: () => {
        draggingRef.current = null;
      },
      onKeyDown: (event: KeyboardEvent<SVGElement>) => nudge(id, event),
    };
  };

  const labels = {
    strength: de ? "Stärke" : "Strength",
    decay: de ? "Abklingen" : "Decay",
    rate: de ? "Notenwert" : "Rate",
  };

  return (
    <div
      ref={panelRef}
      className="ripples-wave"
      data-side={side}
      style={style}
      role="group"
      aria-label={de ? `Quelle ${number}` : `Source ${number}`}
    >
      <svg
        ref={svgRef}
        className="ripples-wave-plot"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      >
        <line
          className="ripples-wave-axis"
          x1={0}
          x2={VIEW_WIDTH}
          y1={AXIS_Y}
          y2={AXIS_Y}
        />
        <line
          className="ripples-wave-lane"
          x1={0}
          x2={VIEW_WIDTH}
          y1={RATE_LANE_Y}
          y2={RATE_LANE_Y}
        />
        <line
          className="ripples-wave-guide"
          x1={xOf(handles.cycleEnd.seconds)}
          x2={xOf(handles.cycleEnd.seconds)}
          y1={AXIS_Y}
          y2={RATE_LANE_Y}
        />
        <path className="ripples-wave-envelope" d={envelope} />
        <path className="ripples-wave-path" d={path} />
        <g
          {...handleProps(
            "strength",
            labels.strength,
            sound.strength.toFixed(1),
          )}
          transform={`translate(${xOf(handles.envelopeStart.seconds)} ${yOf(handles.envelopeStart.amplitude)})`}
        >
          <circle className="ripples-wave-hit" r={14} />
          <circle className="ripples-wave-knob" r={6} />
          <text className="ripples-wave-knob-label" x={10} y={-6}>
            {labels.strength}
          </text>
        </g>
        <g
          {...handleProps("decay", labels.decay, sound.decay.toFixed(2))}
          transform={`translate(${xOf(handles.envelopeEnd.seconds)} ${yOf(handles.envelopeEnd.amplitude)})`}
        >
          <circle className="ripples-wave-hit" r={14} />
          <circle className="ripples-wave-knob" r={6} />
          {/* The decay knob sits on the right edge, so its label goes left. */}
          <text
            className="ripples-wave-knob-label"
            x={-10}
            y={-6}
            textAnchor="end"
          >
            {labels.decay}
          </text>
        </g>
        <g
          {...handleProps("rate", labels.rate, sound.rate)}
          transform={`translate(${xOf(handles.cycleEnd.seconds)} ${RATE_LANE_Y})`}
        >
          <circle className="ripples-wave-hit" r={14} />
          <rect
            className="ripples-wave-knob"
            x={-5}
            y={-5}
            width={10}
            height={10}
            rx={2}
          />
          <text className="ripples-wave-knob-label" x={10} y={3}>
            {sound.rate}
          </text>
        </g>
      </svg>
      <div className="ripples-wave-footer">
        <span>
          {sound.rate} · {labels.decay.toLowerCase()} {sound.decay.toFixed(2)} ·{" "}
          {labels.strength.toLowerCase()} {sound.strength.toFixed(1)}
        </span>
        <button
          type="button"
          className="ripples-wave-delete"
          onClick={onDelete}
          aria-label={
            de ? `Quelle ${number} löschen` : `Delete source ${number}`
          }
          title={de ? "Löschen" : "Delete"}
        >
          <Trash2 size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
};
