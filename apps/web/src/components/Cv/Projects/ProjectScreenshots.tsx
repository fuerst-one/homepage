"use client";
import { useImageDescriptions } from "./ImageDescription";
import { GeneratedImageDescription } from "./GeneratedImageDescription";
import type { PublicImageDescription } from "@homepage/database/imageDescriptions";

import { Fragment, useEffect, useMemo, useState, useRef } from "react";
import { FaChevronLeft } from "@react-icons/all-files/fa/FaChevronLeft";
import { FaChevronRight } from "@react-icons/all-files/fa/FaChevronRight";
import * as Dialog from "@radix-ui/react-dialog";
import {
  recordVisitorInteraction,
  useVisitorProfileStore,
} from "../../VisitorProfile/profileStore";
import { cn } from "../../../lib/utils";
import { useLocale } from "../../i18n/LocaleProvider";

export const ProjectScreenshots = ({
  screenshots,
  projectName,
  projectId,
  accentColor,
  initialDescriptions,
  locale: localeOverride,
  viewer = false,
  imageDetails = {},
  fit = "cover",
  priority = false,
  initialIndex = 0,
  onImageChange,
}: {
  screenshots: string[];
  projectName: string;
  projectId?: string;
  accentColor?: string | null;
  initialDescriptions?: PublicImageDescription[];
  locale?: "en" | "de";
  viewer?: boolean;
  imageDetails?: Record<
    string,
    { alt?: string; caption?: string; kind?: "screenshot" | "illustration" }
  >;
  fit?: "cover" | "contain";
  priority?: boolean;
  initialIndex?: number;
  onImageChange?: (index: number) => void;
}) => {
  const contextLocale = useLocale();
  const locale = localeOverride ?? contextLocale;
  const descriptions = useImageDescriptions(
    projectId,
    locale,
    initialDescriptions,
  );
  const sanitizedScreenshots = useMemo(
    () => screenshots.filter(Boolean),
    [screenshots],
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [expanded, setExpanded] = useState(false);
  const enabled = useVisitorProfileStore((s) => s.enabled);
  const seen = useRef(new Set<number>());
  useEffect(() => {
    seen.current.clear();
  }, [enabled, projectId]);

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
    if (nextIndex === currentIndex) return;
    setActiveIndex(nextIndex);
    onImageChange?.(nextIndex);
    if (enabled && projectId) {
      seen.current.add(currentIndex);
      seen.current.add(nextIndex);
      if (seen.current.size >= Math.min(3, sanitizedScreenshots.length))
        recordVisitorInteraction("gallery_explored", projectId);
    }
  };

  return (
    <div
      className={cn(
        "select-none print:hidden",
        viewer ? "flex min-h-0 flex-1 flex-col" : "mt-4",
      )}
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
      <div
        className={cn(
          "relative overflow-hidden border border-white/20 bg-black",
          accentColor && "p-3 sm:p-4",
          viewer && "min-h-0 flex-1",
        )}
        style={accentColor ? { backgroundColor: accentColor } : undefined}
      >
        <div
          className={cn(
            "relative w-full bg-black",
            accentColor && "shadow-[0_8px_22px_#0007]",
            viewer
              ? "h-full"
              : fit === "contain"
                ? "aspect-[16/10]"
                : "aspect-video",
          )}
        >
          {sanitizedScreenshots.map((src, index) => (
            <Fragment key={`${src}-${index}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={
                  imageDetails[src]?.alt ||
                  descriptions.find((row) => row.href === src)?.altText ||
                  `${projectName} ${de ? "Screenshot" : "screenshot"} ${index + 1}`
                }
                lang={
                  !imageDetails[src]?.alt &&
                  descriptions.find((row) => row.href === src)?.altText
                    ? "en"
                    : undefined
                }
                aria-hidden={index !== currentIndex}
                loading={priority && index === 0 ? "eager" : "lazy"}
                fetchPriority={priority && index === 0 ? "high" : undefined}
                className={cn(
                  "absolute inset-0 h-full w-full transition-opacity duration-500 motion-reduce:transition-none",
                  viewer || fit === "contain"
                    ? "object-contain"
                    : "object-cover",
                  index === currentIndex
                    ? "opacity-100"
                    : "pointer-events-none opacity-0",
                )}
              />
            </Fragment>
          ))}
        </div>
      </div>
      {!viewer && (
        <Dialog.Root
          open={expanded}
          onOpenChange={(open) => {
            setExpanded(open);
            if (open && projectId)
              recordVisitorInteraction("gallery_explored", projectId);
          }}
        >
          <Dialog.Trigger asChild>
            <button
              type="button"
              className="mt-2 inline-flex min-h-11 items-center self-end text-xs text-neutral-300 underline underline-offset-4"
            >
              {de ? "Bilder vergrößern ↗" : "Enlarge images ↗"}
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[110] bg-black/90" />
            <Dialog.Content
              className="fixed inset-3 z-[111] flex min-h-0 flex-col border border-white/25 bg-black p-4 sm:inset-8"
              aria-describedby={undefined}
            >
              <div className="mb-3 flex shrink-0 items-center justify-between gap-4">
                <Dialog.Title className="text-base text-white">
                  {projectName}
                </Dialog.Title>
                <Dialog.Close className="min-h-11 px-3 text-sm text-white">
                  {de ? "Schließen" : "Close"} ×
                </Dialog.Close>
              </div>
              <ProjectScreenshots
                screenshots={sanitizedScreenshots}
                projectName={projectName}
                projectId={projectId}
                accentColor={accentColor}
                initialDescriptions={descriptions}
                locale={locale}
                imageDetails={imageDetails}
                initialIndex={currentIndex}
                onImageChange={setActiveIndex}
                viewer
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
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
      <GeneratedImageDescription
        key={sanitizedScreenshots[currentIndex]}
        description={
          descriptions.find(
            (row) => row.href === sanitizedScreenshots[currentIndex],
          )?.description ?? ""
        }
        locale={locale}
      />
      {showNavigation && (
        <div className="mt-2 flex shrink-0 items-center justify-between gap-2">
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
                onClick={() => goToIndex(index)}
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
