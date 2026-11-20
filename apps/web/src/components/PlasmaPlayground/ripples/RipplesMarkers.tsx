"use client";

import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useRef,
  useState,
} from "react";
import { SourceWaveMenu } from "./SourceWaveMenu";
import { SourceSound } from "./sourceSound";
import { RippleSource } from "./types";
import { useAnimationFrame } from "./useAnimationFrame";

const FLASH_SECONDS = 0.35;
const DRAG_THRESHOLD_PX = 4;
// Past this share of the width the fan opens to the left so it stays on screen.
const FLIP_FAN_AT = 0.8;

type RipplesMarkersProps = {
  de: boolean;
  sources: ReadonlyArray<RippleSource>;
  getFireAge: (id: number) => number;
  onMove: (id: number, x: number, y: number) => void;
  onRemove: (id: number) => void;
  onSoundChange: (id: number, sound: Partial<SourceSound>) => void;
  getPreviewBeats: (id: number) => number;
};

type Drag = { id: number; startX: number; startY: number; moved: boolean };

export const RipplesMarkers = ({
  de,
  sources,
  getFireAge,
  onMove,
  onRemove,
  onSoundChange,
  getPreviewBeats,
}: RipplesMarkersProps) => {
  const [openId, setOpenId] = useState<number | null>(null);
  const closeMenu = useCallback(() => setOpenId(null), []);
  const layerRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef(new Map<number, HTMLButtonElement>());
  const dragRef = useRef<Drag | null>(null);

  useAnimationFrame(() => {
    for (const [id, marker] of markerRefs.current) {
      const flash = Math.max(0, 1 - getFireAge(id) / FLASH_SECONDS);
      marker.style.setProperty("--flash", flash.toFixed(3));
    }
  });

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    id: number,
  ) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    const layer = layerRef.current;
    if (!drag || !layer) return;
    const distance = Math.hypot(
      event.clientX - drag.startX,
      event.clientY - drag.startY,
    );
    if (!drag.moved && distance < DRAG_THRESHOLD_PX) return;
    drag.moved = true;
    const rect = layer.getBoundingClientRect();
    onMove(
      drag.id,
      (event.clientX - rect.left) / rect.width,
      (event.clientY - rect.top) / rect.height,
    );
  };

  const handlePointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && !drag.moved) {
      setOpenId((current) => (current === drag.id ? null : drag.id));
    }
  };

  return (
    <div ref={layerRef} className="ripples-markers">
      {sources.map((source, index) => (
        <button
          key={source.id}
          ref={(element) => {
            if (element) markerRefs.current.set(source.id, element);
            else markerRefs.current.delete(source.id);
          }}
          type="button"
          className="ripples-marker"
          data-source-marker
          data-muted={source.muted || undefined}
          aria-expanded={openId === source.id}
          style={{ left: `${source.x * 100}%`, top: `${source.y * 100}%` }}
          aria-label={
            de
              ? `Quelle ${index + 1} – ziehen zum Verschieben, klicken für Einstellungen`
              : `Source ${index + 1} – drag to move, click for settings`
          }
          onPointerDown={(event) => handlePointerDown(event, source.id)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
          onKeyDown={(event) => {
            if (event.key === "Delete" || event.key === "Backspace") {
              onRemove(source.id);
            } else if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpenId(openId === source.id ? null : source.id);
            }
          }}
        >
          {index + 1}
        </button>
      ))}
      {sources.map((source, index) =>
        source.id === openId ? (
          <SourceWaveMenu
            key={source.id}
            de={de}
            number={index + 1}
            sound={source}
            previewBeats={getPreviewBeats(source.id)}
            side={source.x > FLIP_FAN_AT ? "left" : "right"}
            style={{ left: `${source.x * 100}%`, top: `${source.y * 100}%` }}
            onChange={(sound) => onSoundChange(source.id, sound)}
            onDelete={() => {
              onRemove(source.id);
              closeMenu();
            }}
            onClose={closeMenu}
          />
        ) : null,
      )}
    </div>
  );
};
