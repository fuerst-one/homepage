"use client";

import {
  Aperture,
  ArrowLeft,
  Camera,
  Check,
  Circle,
  Copy,
  ImageUp,
  Pause,
  Play,
  Save,
  Shapes,
  Square,
  Waves,
} from "lucide-react";
import Link from "../i18n/LocalizedLink";
import { cn } from "../../lib/utils";
import { SegmentedControl, SegmentedOption } from "./SegmentedControl";
import { RecorderStatus } from "./useCanvasRecorder";
import { KnobState, SizeKey, Source } from "./types";

const ICON_SIZE = 14;

type PlaygroundToolbarProps = {
  de: boolean;
  isHidden: boolean;
  knobs: KnobState;
  pendingSource: Source | null;
  isPaused: boolean;
  copyStatus: "idle" | "copied";
  snapStatus: "idle" | "saved";
  recorderStatus: RecorderStatus;
  recorderElapsedSeconds: number;
  remember: boolean;
  hasUploadedFile: boolean;
  onKnobChange: <K extends keyof KnobState>(
    key: K,
    value: KnobState[K],
  ) => void;
  onTogglePause: () => void;
  onCopy: () => void;
  onSnap: () => void;
  onToggleRec: () => void;
  onUpload: () => void;
  onRememberChange: (remember: boolean) => void;
  onEngagedChange: (engaged: boolean) => void;
};

const formatElapsed = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;

const getInteractionHint = (source: Source, de: boolean): string | null => {
  if (source === "plasma") {
    return de
      ? "Klicken für Wellen · Scrollen zum Zoomen"
      : "Click for ripples · Scroll to zoom";
  }
  if (source === "shapes") {
    return de
      ? "Ziehen zum Drehen · Klicken für nächste Form · Scrollen zum Zoomen"
      : "Drag to orbit · Click for next shape · Scroll to zoom";
  }
  return null;
};

export const PlaygroundToolbar = ({
  de,
  isHidden,
  knobs,
  pendingSource,
  isPaused,
  copyStatus,
  snapStatus,
  recorderStatus,
  recorderElapsedSeconds,
  remember,
  hasUploadedFile,
  onKnobChange,
  onTogglePause,
  onCopy,
  onSnap,
  onToggleRec,
  onUpload,
  onRememberChange,
  onEngagedChange,
}: PlaygroundToolbarProps) => {
  const sources: SegmentedOption<Source>[] = [
    {
      value: "plasma",
      label: "Plasma",
      icon: <Waves size={ICON_SIZE} aria-hidden />,
    },
    {
      value: "camera",
      label: de ? "Kamera" : "Camera",
      icon: <Camera size={ICON_SIZE} aria-hidden />,
      isBusy: pendingSource === "camera",
    },
    {
      value: "upload",
      label: de ? "Datei" : "Upload",
      icon: <ImageUp size={ICON_SIZE} aria-hidden />,
    },
    {
      value: "shapes",
      label: de ? "Formen" : "Shapes",
      icon: <Shapes size={ICON_SIZE} aria-hidden />,
    },
  ];
  const sizes: SegmentedOption<SizeKey>[] = [
    {
      value: "small",
      label: "S",
      description: de ? "Kleine Zeichen" : "Small characters",
    },
    {
      value: "medium",
      label: "M",
      description: de ? "Mittlere Zeichen" : "Medium characters",
    },
    {
      value: "large",
      label: "L",
      description: de ? "Große Zeichen" : "Large characters",
    },
  ];
  const isRecording = recorderStatus === "recording";
  const canRecord =
    recorderStatus !== "unsupported" && recorderStatus !== "detecting";
  const hint = getInteractionHint(knobs.source, de);
  const copyLabel =
    copyStatus === "copied"
      ? de
        ? "Kopiert"
        : "Copied"
      : de
        ? "Text kopieren"
        : "Copy text";
  const snapLabel =
    snapStatus === "saved"
      ? de
        ? "Bild gespeichert"
        : "Snapshot saved"
      : de
        ? "Bild speichern"
        : "Save snapshot";
  const recLabel = isRecording
    ? de
      ? "Aufnahme stoppen"
      : "Stop recording"
    : de
      ? "Video aufnehmen"
      : "Record video";
  const rememberTooltip = remember
    ? de
      ? "Auf diesem Gerät gemerkt · Klicken zum Vergessen"
      : "Remembered on this device · Click to forget"
    : de
      ? "Einstellungen auf diesem Gerät merken (freiwillig)"
      : "Remember settings on this device (optional)";
  const pauseLabel = isPaused
    ? de
      ? "Animation fortsetzen"
      : "Resume animation"
    : de
      ? "Animation anhalten"
      : "Pause animation";
  const engagementHandlers = {
    onPointerEnter: () => onEngagedChange(true),
    onPointerLeave: () => onEngagedChange(false),
    onFocus: () => onEngagedChange(true),
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        onEngagedChange(false);
      }
    },
  };

  return (
    <div className="playground-overlays" data-hidden={isHidden}>
      <div
        className="playground-corner playground-corner-start"
        {...engagementHandlers}
      >
        <Link href="/" className="playground-chip">
          <ArrowLeft size={ICON_SIZE} aria-hidden />
          <span>FUERST.ONE</span>
        </Link>
      </div>
      <div
        className="playground-corner playground-corner-end"
        role="toolbar"
        aria-label={de ? "Ansicht und Export" : "View and export"}
        {...engagementHandlers}
      >
        <button
          type="button"
          className="playground-chip playground-icon-chip"
          onClick={onTogglePause}
          aria-label={pauseLabel}
          title={pauseLabel}
        >
          {isPaused ? (
            <Play size={ICON_SIZE} aria-hidden />
          ) : (
            <Pause size={ICON_SIZE} aria-hidden />
          )}
        </button>
        <SegmentedControl
          label={de ? "Zeichengröße" : "Character size"}
          isGroupLabelHidden
          value={knobs.size}
          options={sizes}
          onChange={(value) => onKnobChange("size", value)}
        />
        <div className="playground-icon-group">
          <button
            type="button"
            className="playground-icon-button"
            onClick={onCopy}
            aria-label={copyLabel}
            data-tooltip={copyLabel}
          >
            {copyStatus === "copied" ? (
              <Check size={ICON_SIZE} aria-hidden />
            ) : (
              <Copy size={ICON_SIZE} aria-hidden />
            )}
          </button>
          <button
            type="button"
            className="playground-icon-button"
            onClick={onSnap}
            aria-label={snapLabel}
            data-tooltip={snapLabel}
          >
            {snapStatus === "saved" ? (
              <Check size={ICON_SIZE} aria-hidden />
            ) : (
              <Aperture size={ICON_SIZE} aria-hidden />
            )}
          </button>
          {canRecord && (
            <button
              type="button"
              className={cn(
                "playground-icon-button",
                isRecording && "is-recording",
              )}
              onClick={onToggleRec}
              aria-label={recLabel}
              data-tooltip={recLabel}
              aria-pressed={isRecording}
            >
              {isRecording ? (
                <Square size={ICON_SIZE} aria-hidden fill="currentColor" />
              ) : (
                <Circle size={ICON_SIZE} aria-hidden fill="currentColor" />
              )}
              {isRecording && (
                <span>{formatElapsed(recorderElapsedSeconds)}</span>
              )}
            </button>
          )}
          <button
            type="button"
            className="playground-icon-button"
            onClick={() => onRememberChange(!remember)}
            aria-label={
              de
                ? "Einstellungen auf diesem Gerät merken (freiwillig)"
                : "Remember settings on this device (optional)"
            }
            aria-pressed={remember}
            data-tooltip={rememberTooltip}
          >
            <Save size={ICON_SIZE} aria-hidden />
          </button>
        </div>
        <span className="sr-only" aria-live="polite">
          {copyStatus === "copied" ? copyLabel : ""}
          {snapStatus === "saved" ? snapLabel : ""}
        </span>
      </div>

      <div className="playground-dock">
        {hint && <p className="playground-hint">{hint}</p>}
        <div
          className="playground-toolbar"
          role="toolbar"
          aria-label={de ? "Plasma-Quelle" : "Plasma source"}
          {...engagementHandlers}
        >
          <SegmentedControl
            label={de ? "Quelle" : "Source"}
            value={knobs.source}
            options={sources}
            onChange={(value) => onKnobChange("source", value)}
          />
          {knobs.source === "upload" && hasUploadedFile && (
            <button
              type="button"
              className="playground-action"
              onClick={onUpload}
            >
              <ImageUp size={ICON_SIZE} aria-hidden />
              <span>{de ? "Andere Datei" : "Replace file"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
