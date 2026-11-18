"use client";

import { useId, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Heart } from "lucide-react";
import { useLocale } from "../i18n/LocaleProvider";
import { Button } from "../Button";
import { useVisitorProfileStore as useProfile } from "./profileStore";

type Action = "project_saved" | "project_unsaved" | "project_more";
/** Compact actions for the preview footer and the visitor's saved-project list. */
export function ProjectProfileActions({
  projectId,
  projectName,
  relatedHref,
  focusFallbackId,
  onAction,
}: {
  projectId: string;
  projectName: string;
  relatedHref?: string;
  focusFallbackId?: string;
  onAction?: (kind: Action) => void;
}) {
  const de = useLocale() === "de";
  const enabled = useProfile((s) => s.enabled);
  const saved = useProfile(
    (s) => !!s.profile.projectChoices?.[projectId]?.saved,
  );
  const tooltipId = useId();
  const [tooltipPosition, setTooltipPosition] = useState<{
    left: number;
    top: number;
    below: boolean;
  } | null>(null);
  const tooltipOpen = !!tooltipPosition;
  useEffect(() => {
    if (!tooltipOpen) return;
    const hide = () => setTooltipPosition(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [tooltipOpen]);
  const showTooltip = (element: HTMLElement) => {
    const box = element.getBoundingClientRect();
    const below = box.top < 88;
    setTooltipPosition({
      left: Math.max(8, Math.min(innerWidth - 216, box.right - 208)),
      top: below ? box.bottom + 8 : box.top - 8,
      below,
    });
  };
  const tooltip = !enabled
    ? de
      ? "Starte dein Live-Profil, um Projekte zu merken."
      : "Start your live profile to save projects."
    : saved
      ? de
        ? "Aus deinen gemerkten Projekten im Profil entfernen."
        : "Remove from your saved projects in your profile."
      : de
        ? "In deinem Profil für später merken."
        : "Save to your profile for later.";
  const label = saved
    ? de
      ? `Projekt nicht mehr merken: ${projectName}`
      : `Unsave project: ${projectName}`
    : de
      ? `Projekt merken: ${projectName}`
      : `Save project: ${projectName}`;
  const iconClass =
    "size-11 border-white/25 bg-transparent text-neutral-300 hover:border-white hover:bg-white/5 hover:text-white [&>span]:p-0";
  return (
    <div
      data-profile-ui
      className="pointer-events-auto flex flex-wrap items-center gap-2 print:hidden"
      role="group"
      aria-label={`${de ? "Projektaktionen für" : "Project actions for"} ${projectName}`}
    >
      <span
        className="inline-flex"
        onMouseEnter={(event) => showTooltip(event.currentTarget)}
        onMouseLeave={() => setTooltipPosition(null)}
        onFocus={(event) => showTooltip(event.currentTarget)}
        onBlur={() => setTooltipPosition(null)}
      >
        {enabled ? (
          <Button
            type="button"
            data-project-save
            aria-label={label}
            aria-describedby={tooltipId}
            aria-pressed={saved}
            title={tooltip}
            className={`${iconClass} ${saved ? "border-primary/50 text-primary" : ""}`}
            onClick={(event) => {
              const button = event.currentTarget;
              const kind = saved ? "project_unsaved" : "project_saved";
              useProfile.getState().record(kind, projectId);
              onAction?.(kind);
              if (focusFallbackId)
                requestAnimationFrame(() => {
                  if (!button.isConnected)
                    document
                      .getElementById(focusFallbackId)
                      ?.focus({ preventScroll: true });
                });
            }}
          >
            <Heart
              size={18}
              strokeWidth={1.5}
              fill={saved ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </Button>
        ) : (
          <Button
            href="/profile"
            prefetch={false}
            data-project-save
            aria-label={label}
            aria-describedby={tooltipId}
            title={tooltip}
            className={iconClass}
          >
            <Heart size={18} strokeWidth={1.5} aria-hidden="true" />
          </Button>
        )}
        {tooltipPosition &&
          createPortal(
            <span
              id={tooltipId}
              role="tooltip"
              style={{
                left: tooltipPosition.left,
                top: tooltipPosition.top,
                transform: tooltipPosition.below
                  ? undefined
                  : "translateY(-100%)",
              }}
              className="pointer-events-none fixed z-[200] w-52 max-w-[calc(100vw-16px)] border border-white/25 bg-neutral-950 px-3 py-2 text-xs font-normal leading-relaxed text-neutral-200 shadow-lg"
            >
              {tooltip}
            </span>,
            document.body,
          )}
      </span>
      {relatedHref && (
        <Button
          href={relatedHref}
          prefetch={false}
          data-project-more
          className="min-h-11 border-white/25 bg-transparent text-neutral-300 hover:border-white hover:bg-white/5 hover:text-white [&>span]:px-3"
          onClick={() => {
            useProfile.getState().record("project_more", projectId);
            onAction?.("project_more");
          }}
        >
          {de ? "Mehr wie dieses" : "More like this"}
        </Button>
      )}
    </div>
  );
}
