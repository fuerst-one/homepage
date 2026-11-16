"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PlasmaCanvas, PlasmaCanvasHandle } from "../Plasma/PlasmaCanvas";
import { PLAYGROUND_CHARACTERS } from "../Plasma/constants";
import { useShapesLuminance } from "../PlasmaPlayground/useShapesLuminance";
import { createLandingGeometry } from "./shapeGeometries";
import { createLandingIconGeometry } from "./iconGeometries";

const emptyGeometries = () => [];
const createGeometry = (index: number) =>
  index < 6 ? createLandingGeometry(index) : createLandingIconGeometry(index);

const RAMP = PLAYGROUND_CHARACTERS.slice(0, PLAYGROUND_CHARACTERS.length / 2);
const CELL_SIZE = 6;
// Keep the preview footprint while sampling more detail into smaller glyphs.
const WIDTH = Math.ceil(800 / CELL_SIZE);
const HEIGHT = Math.ceil(448 / CELL_SIZE);

export default function LandingShape({
  shapeIndex,
  paused,
  reducedMotion,
  active,
  interactionTarget,
  onReadyChange,
}: {
  shapeIndex: number;
  paused: boolean;
  reducedMotion: boolean;
  active: boolean;
  interactionTarget: HTMLElement | null;
  onReadyChange?: (ready: boolean) => void;
}) {
  const canvasRef = useRef<PlasmaCanvasHandle>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const onCanvasReady = useCallback((canvas: HTMLCanvasElement | null) => {
    setCanvasReady(Boolean(canvas));
  }, []);
  const { sample, ready } = useShapesLuminance(active, interactionTarget, {
    createGeometries: emptyGeometries,
    createGeometry,
    shapeIndex,
    paused,
    reducedMotion,
  });

  useEffect(() => {
    if (!active || !ready || !canvasReady) return;
    let firstFrame = true;
    let raf = 0;
    let lastFrame = 0;
    let lastInteractionAt = performance.now();
    let dragging = false;
    const render = (time: number) => {
      if (time - lastFrame >= 1000 / 30) {
        const result = sample({
          width: WIDTH,
          height: HEIGHT,
          cellAspect: 1,
          contrast: "medium",
        });
        if (result) {
          canvasRef.current?.renderLuminance(result.luminance, WIDTH, HEIGHT);
          if (firstFrame) {
            firstFrame = false;
            onReadyChange?.(true);
          }
        }
        lastFrame = time;
      }
      raf = 0;
      if (
        !(paused || reducedMotion) ||
        dragging ||
        time - lastInteractionAt < 600
      )
        raf = requestAnimationFrame(render);
    };
    const onPointerDown = () => {
      dragging = true;
      lastInteractionAt = performance.now();
      if (!raf) raf = requestAnimationFrame(render);
    };
    const onPointerUp = () => {
      dragging = false;
      lastInteractionAt = performance.now();
    };
    interactionTarget?.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      interactionTarget?.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [
    active,
    ready,
    canvasReady,
    sample,
    paused,
    reducedMotion,
    shapeIndex,
    interactionTarget,
    onReadyChange,
  ]);

  useEffect(() => {
    if (!active || !ready || !canvasReady) onReadyChange?.(false);
    return () => onReadyChange?.(false);
  }, [active, ready, canvasReady, onReadyChange]);

  return (
    <PlasmaCanvas
      ref={canvasRef}
      onCanvasReady={onCanvasReady}
      ramp={RAMP}
      cellSize={CELL_SIZE}
      cellWidth={CELL_SIZE}
      fontPx={6.75}
      gridWidth={WIDTH}
      gridHeight={HEIGHT}
      className="landing-shape-canvas"
    />
  );
}
