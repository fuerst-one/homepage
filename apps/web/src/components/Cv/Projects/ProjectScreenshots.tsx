"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { FaChevronLeft } from "@react-icons/all-files/fa/FaChevronLeft";
import { FaChevronRight } from "@react-icons/all-files/fa/FaChevronRight";
import { cn } from "../../../lib/utils";

export const ProjectScreenshots = ({
  screenshots,
  projectName,
  locale = "en",
  imageDetails = {},
  fit = "cover",
  priority = false,
}: {
  screenshots: string[];
  projectName: string;
  locale?: "en" | "de";
  imageDetails?: Record<
    string,
    { alt?: string; caption?: string; kind?: "screenshot" | "illustration" }
  >;
  fit?: "cover" | "contain";
  priority?: boolean;
}) => {
  const sanitizedScreenshots = useMemo(
    () => screenshots.filter(Boolean),
    [screenshots],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!sanitizedScreenshots.length) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((previous) => {
      if (previous < sanitizedScreenshots.length) {
        return previous;
      }

      return 0;
    });
  }, [sanitizedScreenshots]);

  if (!sanitizedScreenshots.length) {
    return null;
  }

  const showNavigation = sanitizedScreenshots.length > 1;
  const currentIndex = Math.min(activeIndex, sanitizedScreenshots.length - 1);
  const current = imageDetails[sanitizedScreenshots[currentIndex]];
  const de = locale === "de";
  const goToIndex = (index: number) => {
    if (!showNavigation) return;
    const nextIndex =
      (index + sanitizedScreenshots.length) % sanitizedScreenshots.length;
    setActiveIndex(nextIndex);
  };

  return (
    <div
      className="mt-4 select-none print:hidden"
      role="group"
      aria-roledescription={de ? "Bildergalerie" : "carousel"}
      aria-label={projectName}
      tabIndex={showNavigation ? 0 : undefined}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          goToIndex(currentIndex + (event.key === "ArrowLeft" ? -1 : 1));
        }
      }}
    >
      <div className="relative overflow-hidden border border-white/20 bg-black">
        <div
          className={cn(
            "relative w-full",
            fit === "contain" ? "aspect-[16/10]" : "aspect-video",
          )}
        >
          {sanitizedScreenshots.map((src, index) => (
            <Fragment key={`${src}-${index}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={
                  imageDetails[src]?.alt ||
                  `${projectName} ${de ? "Screenshot" : "screenshot"} ${index + 1}`
                }
                aria-hidden={index !== currentIndex}
                loading={priority && index === 0 ? "eager" : "lazy"}
                fetchPriority={priority && index === 0 ? "high" : undefined}
                className={cn(
                  "absolute inset-0 h-full w-full transition-opacity duration-500 motion-reduce:transition-none",
                  fit === "contain" ? "object-contain" : "object-cover",
                  index === currentIndex
                    ? "opacity-100"
                    : "pointer-events-none opacity-0",
                )}
              />
            </Fragment>
          ))}
        </div>
      </div>
      {current && (
        <div
          className="select-text border-x border-b border-white/20 p-3 text-xs leading-relaxed text-neutral-300"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="text-[0.65rem] uppercase tracking-wider text-neutral-400">
            {current.kind === "illustration"
              ? de
                ? "Konzeptillustration"
                : "Conceptual illustration"
              : de
                ? "Produkt-Screenshot"
                : "Product screenshot"}
          </p>
          {current.caption && <p className="mt-1">{current.caption}</p>}
        </div>
      )}
      {showNavigation && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => goToIndex(currentIndex - 1)}
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/30 hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            aria-label={de ? "Vorheriges Bild" : "Previous image"}
          >
            <FaChevronLeft aria-hidden="true" />
          </button>
          <div className="flex flex-wrap justify-center">
            {sanitizedScreenshots.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={
                  de ? `Bild ${index + 1} anzeigen` : `Show image ${index + 1}`
                }
                aria-pressed={index === currentIndex}
                className="flex h-11 w-11 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-2.5 w-2.5 border border-white/30",
                    index === currentIndex
                      ? "border-white bg-white"
                      : "bg-transparent",
                  )}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => goToIndex(currentIndex + 1)}
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/30 hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            aria-label={de ? "Nächstes Bild" : "Next image"}
          >
            <FaChevronRight aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};
