"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { ServiceLocale, ServiceSlug } from "../../data/services";
import styles from "./sculpture.module.css";

const LandingShape = dynamic(() => import("./ServiceHeroShape"), {
  ssr: false,
});

const studies = {
  "product-interfaces": {
    shape: 0,
    en: "Made for interaction",
    de: "Für Interaktion gemacht",
  },
  "ai-automation": {
    shape: 4,
    en: "Connected systems",
    de: "Verbundene Systeme",
  },
  "ai-products": {
    shape: 5,
    en: "New possibilities",
    de: "Neue Möglichkeiten",
  },
};

export function ServiceHeroSculpture({
  slug,
  locale,
}: {
  slug: ServiceSlug;
  locale: ServiceLocale;
}) {
  const study = studies[slug];
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    const updateVisibility = () => setDocumentVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    media.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry.isIntersecting),
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [target]);

  const active = inView && documentVisible;
  const de = locale === "de";
  const dragHint = de ? "Ziehen zum Drehen" : "Drag to orbit";
  const keyboardHint = de
    ? "Umschalt + Pfeiltasten zum Drehen."
    : "Shift + arrow keys to rotate.";
  const controlLabel = reducedMotion
    ? de
      ? "Bewegung reduziert"
      : "Reduced motion enabled"
    : paused
      ? de
        ? "Animation fortsetzen"
        : "Resume animation"
      : de
        ? "Animation pausieren"
        : "Pause animation";

  return (
    <figure
      className={styles.sculpture}
      data-service={slug}
      data-ready={ready}
      data-paused={paused || reducedMotion}
    >
      <div
        ref={setTarget}
        className={styles.art}
        role="group"
        tabIndex={ready ? 0 : -1}
        aria-label={`${study[locale]}. ${dragHint}. ${keyboardHint}`}
      >
        <span className={styles.crosshair} aria-hidden="true">
          +
        </span>
        <svg
          className={styles.fallback}
          viewBox="0 0 400 360"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          aria-hidden="true"
        >
          {slug === "product-interfaces" ? (
            <g transform="translate(200 170) rotate(9)">
              <rect x="-118" y="-106" width="186" height="80" rx="16" />
              <rect x="-106" y="-96" width="162" height="56" rx="12" />
              <path
                d="M-42 10V-66C-42-86-14-86-14-66V-4C-14-28 14-28 14-6V8C14-16 42-16 42 8V20C42-2 70-2 70 20V57C70 84 52 91 44 110H-22C-44 88-57 72-68 54L-90 19C-104-3-80-17-66 3Z"
                fill="#0c0e0b"
                strokeWidth="2"
              />
              <rect
                x="-27"
                y="104"
                width="78"
                height="18"
                rx="4"
                fill="#0c0e0b"
              />
            </g>
          ) : slug === "ai-automation" ? (
            <g transform="translate(200 180)">
              <circle r="72" />
              <circle r="30" />
              {Array.from({ length: 12 }, (_, i) => (
                <path
                  key={i}
                  d="M-10-72V-94H10V-72"
                  transform={`rotate(${i * 30})`}
                />
              ))}
            </g>
          ) : (
            <g transform="translate(200 180)">
              {[0, 60, 120].map((angle) => (
                <ellipse
                  key={angle}
                  rx="110"
                  ry="48"
                  transform={`rotate(${angle})`}
                />
              ))}
              <circle r="15" />
            </g>
          )}
        </svg>
        <div className={styles.stage} aria-hidden="true">
          {active && (
            <LandingShape
              shapeIndex={study.shape}
              paused={paused}
              reducedMotion={reducedMotion}
              active
              interactionTarget={target}
              keyboardOrbit
              onReadyChange={setReady}
            />
          )}
        </div>
        <span className={styles.dragHint} aria-hidden="true">
          ↔ {dragHint}
        </span>
        <span className={styles.coordinates} aria-hidden="true">
          X / Y / Z
        </span>
      </div>
      <figcaption>
        <span>
          <span className={styles.dot} aria-hidden="true" />
          {study[locale]}
        </span>
        <button
          type="button"
          aria-label={controlLabel}
          aria-pressed={paused}
          disabled={!ready || reducedMotion}
          onClick={() => setPaused((value) => !value)}
        >
          <span aria-hidden="true">{paused || reducedMotion ? "▷" : "Ⅱ"}</span>
        </button>
      </figcaption>
    </figure>
  );
}
