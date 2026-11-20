"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FrameBounds, Glyph } from "../Plasma/types";
import { PlasmaCanvas, PlasmaCanvasHandle } from "../Plasma/PlasmaCanvas";
import { useInterval } from "../Plasma/useInterval";
import { getIsReducedMotion } from "../Plasma/getIsReducedMotion";
import { useLocale } from "../i18n/LocaleProvider";
import {
  PLAYGROUND_REMEMBER_KEY,
  RIPPLES_SETUP_KEY,
  readPlaygroundPreference,
  writePlaygroundPreference,
  rememberPlaygroundPreferences,
} from "../../lib/playgroundPreferences";
import { PlaygroundToolbar } from "./PlaygroundToolbar";
import { PlaygroundSplash } from "./PlaygroundSplash";
import { useIdleOverlays } from "./useIdleOverlays";
import { useRipples } from "./ripples/useRipples";
import {
  parseRipplesSetup,
  serializeRipplesSetup,
} from "./ripples/ripplesSetup";
import { RipplesControls } from "./ripples/RipplesControls";
import { RipplesMarkers } from "./ripples/RipplesMarkers";
import { RipplesArrangement } from "./ripples/RipplesArrangement";
import { RipplesSoundToggle } from "./ripples/RipplesSoundToggle";
import { RippleMode } from "./ripples/types";
import "./playground.css";
import { useWebcamStream } from "./useWebcamStream";
import { useWebcamLuminance } from "./useWebcamLuminance";
import { useShapesLuminance } from "./useShapesLuminance";
import { getRadialLuminance } from "./getRadialLuminance";
import { useCanvasRecorder } from "./useCanvasRecorder";
import { downloadBlob } from "./downloadBlob";
import { getTimestampedFilename } from "./getTimestampedFilename";
import {
  PLASMA_FPS,
  PLASMA_LENS_WHEEL_SENSITIVITY,
  PLASMA_REDUCED_FPS,
  WEBCAM_FPS,
} from "../Plasma/constants";
import {
  DEFAULT_KNOBS,
  KNOBS_LOCAL_STORAGE_KEY,
  PLAYGROUND_PALETTES,
  SIZE_PRESETS,
  SPLASH_LOCAL_STORAGE_KEY,
  WEBCAM_RAMPS,
} from "./constants";
import { KnobState, SizeKey, Source, SplashChoice } from "./types";

const readSplashChoice = (): SplashChoice => {
  if (typeof window === "undefined") {
    return null;
  }
  let stored: string | null = null;
  try {
    stored = readPlaygroundPreference(
      window.localStorage,
      SPLASH_LOCAL_STORAGE_KEY,
    );
  } catch {
    /* Storage can be unavailable. */
  }
  if (
    stored === "camera" ||
    stored === "plasma" ||
    stored === "shapes" ||
    stored === "ripples"
  ) {
    return stored;
  }
  return null;
};

const writeSplashChoice = (choice: Exclude<SplashChoice, null>) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    writePlaygroundPreference(
      window.localStorage,
      SPLASH_LOCAL_STORAGE_KEY,
      choice,
    );
  } catch {
    /* Keep the choice in memory. */
  }
};

const isSource = (value: unknown): value is Source =>
  value === "ripples" ||
  value === "camera" ||
  value === "shapes" ||
  value === "plasma";

const isSizeKey = (value: unknown): value is SizeKey =>
  value === "small" || value === "medium" || value === "large";

const readKnobs = (): KnobState | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = readPlaygroundPreference(
      window.localStorage,
      KNOBS_LOCAL_STORAGE_KEY,
    );
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const candidate = parsed as Record<string, unknown>;
    if (!isSource(candidate.source) || !isSizeKey(candidate.size)) {
      return null;
    }
    // Contrast is no longer adjustable, so a stored choice must not stick.
    return {
      source: candidate.source,
      size: candidate.size,
      contrast: DEFAULT_KNOBS.contrast,
    };
  } catch {
    return null;
  }
};

const writeKnobs = (knobs: KnobState) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    writePlaygroundPreference(
      window.localStorage,
      KNOBS_LOCAL_STORAGE_KEY,
      JSON.stringify(knobs),
    );
  } catch {
    /* Keep the settings in memory. */
  }
};

export const PlasmaPlayground = () => {
  const de = useLocale() === "de";
  const [remember, setRemember] = useState(false);
  const [knobs, setKnobs] = useState<KnobState>(DEFAULT_KNOBS);
  const [isOverlayEngaged, setIsOverlayEngaged] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [bounds, setBounds] = useState<FrameBounds | null>(null);
  const [splashChoice, setSplashChoice] = useState<SplashChoice>(null);
  const [splashHydrated, setSplashHydrated] = useState(false);
  const [pendingSource, setPendingSource] = useState<Source | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [snapStatus, setSnapStatus] = useState<"idle" | "saved">("idle");
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
    null,
  );
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<Glyph[][] | null>(null);
  const canvasRef = useRef<PlasmaCanvasHandle | null>(null);
  const captureFpsRef = useRef(PLASMA_FPS);

  const sizeMetrics = SIZE_PRESETS[knobs.size];
  const { cellSize, fontPx } = sizeMetrics;
  const cellWidth = sizeMetrics.cellWidth ?? cellSize;
  const showSplash = splashHydrated && splashChoice === null;
  const showChrome = splashHydrated && splashChoice !== null;
  const isCameraSource = knobs.source === "camera";
  const isShapesSource = knobs.source === "shapes";
  const isRipplesSource = knobs.source === "ripples";
  const [rippleMode, setRippleMode] = useState<RippleMode>("sand");

  const { stream, permission, request } = useWebcamStream(isCameraSource);
  const {
    videoRef,
    sample: sampleCamera,
    ready: cameraReady,
  } = useWebcamLuminance(stream);
  const { sample: sampleShapes, ready: shapesReady } = useShapesLuminance(
    isShapesSource,
    isShapesSource ? canvasElement : null,
  );
  const ripples = useRipples(isRipplesSource, canvasElement, {
    mode: rippleMode,
  });
  const sampleRipples = ripples.sample;
  const { restore: restoreRipples } = ripples;
  const [ripplesRestored, setRipplesRestored] = useState(false);

  useEffect(() => {
    try {
      const saved = parseRipplesSetup(
        readPlaygroundPreference(window.localStorage, RIPPLES_SETUP_KEY),
      );
      if (saved) {
        const { mode, ...setup } = saved;
        restoreRipples(setup);
        setRippleMode(mode);
      }
    } catch {
      /* Storage can be unavailable; the piece then starts empty. */
    }
    setRipplesRestored(true);
  }, [restoreRipples]);

  useEffect(() => {
    // Saving before the restore ran would overwrite the saved piece with an empty one.
    if (!ripplesRestored) return;
    try {
      writePlaygroundPreference(
        window.localStorage,
        RIPPLES_SETUP_KEY,
        serializeRipplesSetup({
          mode: rippleMode,
          bpm: ripples.bpm,
          signature: ripples.signature,
          root: ripples.root,
          scale: ripples.scale,
          sources: ripples.sources,
          notes: [...ripples.notes],
        }),
      );
    } catch {
      /* Keep the piece in memory. */
    }
  }, [
    ripplesRestored,
    remember,
    rippleMode,
    ripples.bpm,
    ripples.signature,
    ripples.root,
    ripples.scale,
    ripples.sources,
    ripples.notes,
  ]);

  useEffect(() => {
    try {
      setRemember(
        readPlaygroundPreference(
          window.localStorage,
          PLAYGROUND_REMEMBER_KEY,
        ) === "true",
      );
    } catch {
      /* No persistent settings. */
    }
    const splash = readSplashChoice();
    const persistedKnobs = readKnobs();
    if (persistedKnobs) {
      setKnobs(persistedKnobs);
    } else if (splash) {
      setKnobs({ ...DEFAULT_KNOBS, source: splash });
    }
    setSplashChoice(splash);
    setSplashHydrated(true);
  }, []);

  useEffect(() => {
    if (!splashHydrated) {
      return;
    }
    writeKnobs(knobs);
  }, [knobs, splashHydrated]);

  useEffect(() => {
    const update = () => {
      const width = Math.floor(window.innerWidth / cellWidth) - 1;
      const height = Math.floor(window.innerHeight / cellSize) - 1;
      setBounds({ width: Math.max(10, width), height: Math.max(10, height) });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [cellSize, cellWidth]);

  const togglePause = useCallback(() => setIsPaused((p) => !p), []);

  const handleCopy = useCallback(() => {
    const current = frameRef.current;
    if (!current || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    const text = current
      .map((row) => row.map((glyph) => glyph.character).join(""))
      .join("\n");
    void navigator.clipboard.writeText(text).then(() => {
      setCopyStatus("copied");
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => {
        setCopyStatus("idle");
        copyTimerRef.current = null;
      }, 1500);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      if (snapTimerRef.current) {
        clearTimeout(snapTimerRef.current);
      }
    };
  }, []);

  const handleSnap = useCallback(() => {
    if (!canvasElement) {
      return;
    }
    canvasElement.toBlob((blob) => {
      if (!blob) {
        return;
      }
      downloadBlob(blob, getTimestampedFilename("png"));
      setSnapStatus("saved");
      if (snapTimerRef.current) {
        clearTimeout(snapTimerRef.current);
      }
      snapTimerRef.current = setTimeout(() => {
        setSnapStatus("idle");
        snapTimerRef.current = null;
      }, 1500);
    }, "image/png");
  }, [canvasElement]);

  const handleRecordingComplete = useCallback(
    (blob: Blob, mimeType: string) => {
      const extension = mimeType.includes("webm") ? "webm" : "bin";
      downloadBlob(blob, getTimestampedFilename(extension));
    },
    [],
  );

  const recorder = useCanvasRecorder(handleRecordingComplete);

  const handleToggleRec = useCallback(() => {
    if (recorder.status === "recording") {
      recorder.stop();
      return;
    }
    if (recorder.status !== "idle" || !canvasElement) {
      return;
    }
    recorder.start(canvasElement, captureFpsRef.current);
  }, [recorder, canvasElement]);

  const requestSourceChange = useCallback(
    async (next: Source) => {
      if (next === knobs.source) {
        return;
      }
      if (next !== "camera") {
        setKnobs((prev) => ({ ...prev, source: next }));
        setPendingSource(null);
        return;
      }
      if (permission === "granted") {
        setKnobs((prev) => ({ ...prev, source: next }));
        return;
      }
      setPendingSource(next);
      const result = await request();
      if (result === "granted") {
        setKnobs((prev) => ({ ...prev, source: next }));
        setPendingSource(null);
        return;
      }
      setPendingSource(null);
      writeSplashChoice("plasma");
      setSplashChoice("plasma");
    },
    [knobs.source, permission, request],
  );

  const handleKnobChange = useCallback(
    <K extends keyof KnobState>(key: K, value: KnobState[K]) => {
      if (key === "source") {
        void requestSourceChange(value as Source);
        return;
      }
      setKnobs((prev) => ({ ...prev, [key]: value }));
    },
    [requestSourceChange],
  );

  const handleChooseSplash = useCallback(
    (source: Exclude<SplashChoice, null>) => {
      writeSplashChoice(source);
      setSplashChoice(source);
      void requestSourceChange(source);
    },
    [requestSourceChange],
  );

  const handleRememberChange = useCallback(
    (checked: boolean) => {
      try {
        const allowed = rememberPlaygroundPreferences(
          window.localStorage,
          checked,
        );
        setRemember(allowed);
        if (allowed) {
          writeKnobs(knobs);
          if (splashChoice) writeSplashChoice(splashChoice);
        }
      } catch {
        setRemember(false);
      }
    },
    [knobs, splashChoice],
  );

  useEffect(() => {
    if (!splashHydrated || showSplash || pendingSource !== null) {
      return;
    }
    if (knobs.source === "camera" && permission === "idle") {
      void requestSourceChange("camera");
    }
  }, [
    splashHydrated,
    showSplash,
    pendingSource,
    knobs.source,
    permission,
    requestSourceChange,
  ]);

  useEffect(() => {
    if (!canvasElement || knobs.source !== "plasma") {
      return;
    }
    if (getIsReducedMotion()) {
      return;
    }
    const handle = canvasRef.current;
    if (!handle) {
      return;
    }
    const toCellCoords = (event: PointerEvent) => {
      const rect = canvasElement.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) / cellWidth,
        y: (event.clientY - rect.top) / cellSize,
      };
    };
    const handleMove = (event: PointerEvent) => {
      const { x, y } = toCellCoords(event);
      handle.setCursor(x, y);
    };
    const handleLeave = () => {
      handle.clearCursor();
    };
    const handleDown = (event: PointerEvent) => {
      const { x, y } = toCellCoords(event);
      handle.emitRipple(x, y);
    };
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const next =
        handle.getLensScale() - event.deltaY * PLASMA_LENS_WHEEL_SENSITIVITY;
      handle.setLensScale(next);
    };
    canvasElement.addEventListener("pointermove", handleMove);
    canvasElement.addEventListener("pointerleave", handleLeave);
    canvasElement.addEventListener("pointerdown", handleDown);
    canvasElement.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvasElement.removeEventListener("pointermove", handleMove);
      canvasElement.removeEventListener("pointerleave", handleLeave);
      canvasElement.removeEventListener("pointerdown", handleDown);
      canvasElement.removeEventListener("wheel", handleWheel);
      handle.clearCursor();
    };
  }, [canvasElement, knobs.source, cellWidth, cellSize]);

  const isRecording = recorder.status === "recording";
  const areOverlaysHidden = useIdleOverlays(
    !showChrome ||
      isPaused ||
      isRecording ||
      isOverlayEngaged ||
      pendingSource !== null,
  );

  const knobsRef = useRef(knobs);
  knobsRef.current = knobs;
  const sampleCameraRef = useRef(sampleCamera);
  sampleCameraRef.current = sampleCamera;
  const cameraReadyRef = useRef(cameraReady);
  cameraReadyRef.current = cameraReady;
  const sampleShapesRef = useRef(sampleShapes);
  sampleShapesRef.current = sampleShapes;
  const shapesReadyRef = useRef(shapesReady);
  shapesReadyRef.current = shapesReady;
  const sampleRipplesRef = useRef(sampleRipples);
  sampleRipplesRef.current = sampleRipples;

  const handleTextFrame = useCallback((next: Glyph[][]) => {
    frameRef.current = next;
  }, []);

  const renderFrame = useCallback(
    (currentBounds: FrameBounds) => {
      const handle = canvasRef.current;
      if (!handle) return;
      const k = knobsRef.current;
      const { width, height } = currentBounds;
      const cellAspect = cellWidth / cellSize;

      if (k.source === "camera") {
        const sampleResult = cameraReadyRef.current
          ? sampleCameraRef.current({
              width,
              height,
              cellAspect,
              contrast: k.contrast,
            })
          : null;
        if (sampleResult) {
          handle.renderLuminance(sampleResult.luminance, width, height);
        } else {
          const radial = getRadialLuminance({ width, height, cellAspect });
          handle.renderLuminance(radial, width, height);
        }
        return;
      }

      if (k.source === "shapes") {
        const sampleResult = shapesReadyRef.current
          ? sampleShapesRef.current({
              width,
              height,
              cellAspect,
              contrast: k.contrast,
            })
          : null;
        if (sampleResult) {
          handle.renderLuminance(sampleResult.luminance, width, height);
        } else {
          handle.renderPlasma();
        }
        return;
      }

      if (k.source === "ripples") {
        const { luminance } = sampleRipplesRef.current({
          width,
          height,
          cellAspect,
        });
        handle.renderLuminance(luminance, width, height);
        return;
      }

      handle.renderPlasma();
    },
    [cellWidth, cellSize],
  );

  useEffect(() => {
    if (bounds) {
      renderFrame(bounds);
    }
  }, [bounds, renderFrame, knobs.size, knobs.contrast]);

  const isAnimatedSource =
    knobs.source === "camera" ||
    knobs.source === "shapes" ||
    knobs.source === "ripples";
  const targetFps = isAnimatedSource ? WEBCAM_FPS : PLASMA_FPS;
  const reducedMotion =
    knobs.source === "plasma" && getIsReducedMotion()
      ? PLASMA_REDUCED_FPS
      : null;
  const effectiveFps = reducedMotion ?? targetFps;
  const intervalMs = 1000 / effectiveFps;
  captureFpsRef.current = effectiveFps;

  useInterval(() => {
    if (bounds && !isPaused) {
      renderFrame(bounds);
    }
  }, intervalMs);

  const canvasWidthPx = (bounds?.width ?? 0) * cellWidth;
  const canvasHeightPx = (bounds?.height ?? 0) * cellSize;

  return (
    <div
      className="playground"
      data-idle={areOverlaysHidden}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        className="relative"
        style={{ width: canvasWidthPx, height: canvasHeightPx }}
      >
        {bounds && (
          <PlasmaCanvas
            ref={canvasRef}
            ramp={
              knobs.source === "plasma" || knobs.source === "shapes"
                ? PLAYGROUND_PALETTES[knobs.contrast]
                : WEBCAM_RAMPS[knobs.contrast]
            }
            cellSize={cellSize}
            cellWidth={cellWidth}
            fontPx={fontPx}
            gridWidth={bounds.width}
            gridHeight={bounds.height}
            onTextFrame={handleTextFrame}
            onCanvasReady={setCanvasElement}
          />
        )}
        {showChrome && isRipplesSource && (
          <RipplesMarkers
            de={de}
            sources={ripples.sources}
            getFireAge={ripples.getFireAge}
            onMove={ripples.moveSource}
            onRemove={ripples.removeSource}
            onSoundChange={ripples.updateSource}
            getPreviewBeats={ripples.getPreviewBeats}
          />
        )}
      </div>
      {showChrome && (
        <PlaygroundToolbar
          de={de}
          isHidden={areOverlaysHidden}
          knobs={knobs}
          pendingSource={pendingSource}
          isPaused={isPaused}
          copyStatus={copyStatus}
          snapStatus={snapStatus}
          recorderStatus={recorder.status}
          recorderElapsedSeconds={recorder.elapsedSeconds}
          remember={remember}
          rippleMode={isRipplesSource ? rippleMode : null}
          sourceControls={
            isRipplesSource && (
              <RipplesControls
                de={de}
                mode={rippleMode}
                onModeChange={setRippleMode}
                onResetField={ripples.resetField}
              />
            )
          }
          dockContent={
            isRipplesSource && (
              <RipplesArrangement
                de={de}
                sources={ripples.sources}
                notes={ripples.notes}
                stepCount={ripples.stepCount}
                signature={ripples.signature}
                bpm={ripples.bpm}
                scaleChoice={{ root: ripples.root, scale: ripples.scale }}
                getPlayhead={ripples.getPlayhead}
                onBpmChange={ripples.setBpm}
                onSignatureChange={ripples.setSignature}
                onRootChange={ripples.setRoot}
                onScaleChange={ripples.setScale}
                onVoiceChange={ripples.updateSource}
                onMutedChange={ripples.setSourceMuted}
                onAddNote={ripples.addNote}
                onMoveNote={ripples.moveNote}
                onResizeNote={ripples.resizeNote}
                onNoteSpanChange={ripples.setNoteSpan}
                onNotePitchChange={ripples.setNotePitch}
                onRemoveNote={ripples.removeNote}
                onUndo={ripples.undo}
                onClear={ripples.clear}
              />
            )
          }
          cornerContent={
            isRipplesSource && (
              <RipplesSoundToggle
                de={de}
                soundOn={ripples.soundOn}
                onToggle={ripples.toggleSound}
              />
            )
          }
          onKnobChange={handleKnobChange}
          onTogglePause={togglePause}
          onCopy={handleCopy}
          onSnap={handleSnap}
          onToggleRec={handleToggleRec}
          onRememberChange={handleRememberChange}
          onEngagedChange={setIsOverlayEngaged}
        />
      )}
      {showSplash && <PlaygroundSplash de={de} onChoose={handleChooseSplash} />}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        aria-hidden
        className="pointer-events-none absolute h-px w-px opacity-0"
        style={{ top: 0, left: 0 }}
      />
    </div>
  );
};
