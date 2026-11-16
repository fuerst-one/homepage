"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { localizedLinkPath } from "@/lib/i18n";
import Link from "@/components/i18n/LocalizedLink";
import {
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pause,
  Play,
} from "lucide-react";
import { FrameBounds } from "../Plasma/types";
import { useInterval } from "../Plasma/useInterval";
import {
  LANDING_CHARACTERS,
  PLASMA_LANDING_LENS_SCALE,
} from "../Plasma/constants";
import { PlasmaCanvas, PlasmaCanvasHandle } from "../Plasma/PlasmaCanvas";
import { LegalFooter } from "../Plasma/LegalFooter";
import { LabelOverlay } from "../Plasma/LabelOverlay";
import { getLabelPlacementAtPoint } from "../Plasma/getLabelGroupPlacements";
import { useResponsiveMetrics } from "../Plasma/useResponsiveMetrics";
import { createHeroPreviewController } from "./createHeroPreviewController";
import { getDistanceReaction } from "./getDistanceReaction";
import { NEUTRAL_PLASMA_MOTION } from "../Plasma/motion";
import {
  LandingCommand,
  resolveExplicitCommand,
  getLocalizedSuggestions,
  localizeCommand,
} from "./commands";
import { getRailScrollState } from "./getRailScrollState";
import {
  searchProjectIndex,
  SearchFilter,
  SearchProject,
  SearchSuggestion,
} from "./projectSearch";
import { useProjectSearch } from "./useProjectSearch";
import { ProjectSearchResults } from "./ProjectSearchResults";
import "./landing.css";

const LandingShape = dynamic(() => import("./LandingShape"), { ssr: false });
const BRAND_PLACEMENTS = [
  {
    row: 0,
    startCol: 0,
    label: {
      label: "FUERST.ONE",
      href: "/cv",
      glitch: true,
      style: { fontWeight: 700 },
    },
  },
];
const EMPTY_SEARCH = { projects: [], suggestions: [] };
type DisplaySuggestion = LandingCommand | SearchSuggestion;

export const PlasmaLanding = ({
  headline = "A little curiosity goes a long way.",
}: {
  headline?: string;
}) => {
  const locale = useLocale();
  const de = locale === "de";
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const SUGGESTIONS = useMemo(() => getLocalizedSuggestions(locale), [locale]);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<PlasmaCanvasHandle>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const { cellSize, fontPx } = useResponsiveMetrics();
  const lensOriginRef = useRef({ x: 0, y: 0 });
  const lensTargetRef = useRef<{ x: number; y: number } | null>(null);
  const lensPositionRef = useRef<{ x: number; y: number } | null>(null);
  const distanceCursorRef = useRef<{ x: number; y: number } | null>(null);
  const motionRef = useRef({ ...NEUTRAL_PLASMA_MOTION });
  const [showIcon, setShowIcon] = useState(false);
  const [shapeMounted, setShapeMounted] = useState(false);
  const [shapeReady, setShapeReady] = useState(false);
  const heroPreviewRef = useRef<ReturnType<
    typeof createHeroPreviewController
  > | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const manualScrollRef = useRef(false);
  const centerRailRef = useRef(true);
  const [bounds, setBounds] = useState<FrameBounds | null>(null);
  const [brandOffset, setBrandOffset] = useState({ x: 0, y: 0 });
  const [interactionTarget, setInteractionTarget] =
    useState<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollState, setScrollState] = useState({
    back: false,
    forward: false,
  });
  const [isPlaying, setIsPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visible, setVisible] = useState(true);
  const [focused, setFocused] = useState(false);
  const [input, setInput] = useState("");
  const [searchFilter, setSearchFilter] = useState<SearchFilter>();
  const [previewProject, setPreviewProject] = useState<SearchProject | null>(
    null,
  );
  const [status, setStatus] = useState("");
  const hasQuery = Boolean(input.trim());
  const {
    index: searchIndex,
    loading: searchLoading,
    error: searchError,
    retry: retrySearch,
  } = useProjectSearch(focused || hasQuery);
  const search = useMemo(
    () =>
      searchIndex && hasQuery
        ? searchProjectIndex(searchIndex, input, searchFilter)
        : EMPTY_SEARCH,
    [searchIndex, hasQuery, input, searchFilter],
  );
  const explicitCommand = useMemo(() => {
    if (!hasQuery || searchFilter) return null;
    const command = resolveExplicitCommand(input, locale);
    return command ? localizeCommand(command, locale) : null;
  }, [hasQuery, input, searchFilter, locale]);
  const suggestions: DisplaySuggestion[] = useMemo(
    () =>
      !hasQuery
        ? SUGGESTIONS
        : explicitCommand
          ? [explicitCommand]
          : search.suggestions,
    [hasQuery, explicitCommand, search.suggestions, SUGGESTIONS],
  );
  const currentIndex = Math.min(
    activeIndex,
    Math.max(0, suggestions.length - 1),
  );
  const active = suggestions[currentIndex] ?? SUGGESTIONS[0];
  const shownShape = previewProject?.shape ?? active.shape;
  const suggestionsId = useId();
  const showResults = hasQuery && !explicitCommand;
  const loadingSuggestions = searchLoading && !explicitCommand;
  const busy = loadingSuggestions || navigating;
  const progress = navigating
    ? de
      ? "Seite wird geöffnet …"
      : "Opening page…"
    : loadingSuggestions
      ? de
        ? "Vorschläge werden geladen …"
        : "Loading suggestions…"
      : "";
  const paused = !isPlaying;
  const isShapeMode = showIcon && shapeReady;
  const renderBackdrop = useCallback(() => {
    const handle = canvasRef.current;
    if (!handle) return;
    const target = reducedMotion
      ? lensOriginRef.current
      : (lensTargetRef.current ?? lensOriginRef.current);
    const position = reducedMotion
      ? { ...target }
      : (lensPositionRef.current ?? { ...target });
    position.x += (target.x - position.x) * 0.16;
    position.y += (target.y - position.y) * 0.16;
    lensPositionRef.current = position;
    handle.setLensScale(PLASMA_LANDING_LENS_SCALE);
    handle.setCursor(position.x, position.y);
    const motion =
      bounds && !showIcon && !reducedMotion && isPlaying
        ? getDistanceReaction({
            cursor: distanceCursorRef.current,
            origin: lensOriginRef.current,
            bounds,
            calmRadius: Math.max(12, 100 / cellSize),
          })
        : NEUTRAL_PLASMA_MOTION;
    const smoothed = motionRef.current;
    const reactionDisabled = showIcon || reducedMotion || !isPlaying;
    for (const key of ["glitchFrequency", "brightness"] as const) {
      if (reactionDisabled) {
        smoothed[key] = NEUTRAL_PLASMA_MOTION[key];
        continue;
      }
      smoothed[key] += (motion[key] - smoothed[key]) * 0.12;
      if (Math.abs(motion[key] - smoothed[key]) < 0.001)
        smoothed[key] = motion[key];
    }
    backdropRef.current?.style.setProperty(
      "--plasma-brightness",
      String(smoothed.brightness),
    );
    handle.renderPlasma(smoothed);
  }, [reducedMotion, bounds, showIcon, isPlaying, cellSize]);
  const onBackdropReady = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (canvas) renderBackdrop();
    },
    [renderBackdrop],
  );
  const getGlitchIntensity = useCallback(
    () => canvasRef.current?.getGlitchIntensity() ?? 0,
    [],
  );

  useEffect(() => {
    const controller = createHeroPreviewController(setShowIcon);
    heroPreviewRef.current = controller;
    return () => {
      controller.dispose();
      heroPreviewRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (showIcon) {
      setShapeMounted(true);
      return;
    }
    // Retain the final canvas frame during the return to the wordmark.
    const timer = window.setTimeout(() => setShapeMounted(false), 650);
    return () => window.clearTimeout(timer);
  }, [showIcon]);

  const updateScrollState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const next = getRailScrollState(
      rail.scrollLeft,
      rail.scrollWidth,
      rail.clientWidth,
    );
    setScrollState((previous) =>
      previous.back === next.back && previous.forward === next.forward
        ? previous
        : next,
    );
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(rail);
    for (const chip of rail.children) observer.observe(chip);
    updateScrollState();
    return () => observer.disconnect();
  }, [updateScrollState, suggestions]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => {
      const rect = container.getBoundingClientRect();
      const stage = interactionTarget?.getBoundingClientRect();
      lensOriginRef.current = {
        x: stage
          ? (stage.left + stage.width / 2 - rect.left) / cellSize
          : container.clientWidth / cellSize / 2,
        y: stage
          ? (stage.top + stage.height / 2 - rect.top) / cellSize
          : container.clientHeight / cellSize / 3,
      };
      if (stage) {
        const placement = getLabelPlacementAtPoint(
          BRAND_PLACEMENTS[0].label,
          lensOriginRef.current,
        );
        // The backdrop grid starts at the landing's origin, not the stage's.
        setBrandOffset({
          x: placement.startCol * cellSize - (stage.left - rect.left),
          y: placement.row * cellSize - (stage.top - rect.top),
        });
      }
      setBounds({
        width: Math.max(1, Math.floor(container.clientWidth / cellSize)),
        height: Math.max(1, Math.floor(container.clientHeight / cellSize)),
      });
    };
    const resize = new ResizeObserver(update);
    resize.observe(container);
    if (interactionTarget) resize.observe(interactionTarget);
    update();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    updateMotion();
    media.addEventListener("change", updateMotion);
    let intersects = true;
    const updateVisibility = () => setVisible(intersects && !document.hidden);
    const intersection = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting;
      updateVisibility();
    });
    intersection.observe(container);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      resize.disconnect();
      intersection.disconnect();
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, [cellSize, interactionTarget]);

  useEffect(() => {
    const rail = railRef.current;
    const chip = rail?.children[currentIndex] as HTMLElement | undefined;
    if (!rail || !chip || manualScrollRef.current || !centerRailRef.current)
      return;
    rail.scrollTo({
      left: chip.offsetLeft - (rail.clientWidth - chip.clientWidth) / 2,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  }, [currentIndex, reducedMotion, suggestions]);

  useEffect(() => {
    renderBackdrop();
  }, [bounds, renderBackdrop]);

  useInterval(() => {
    if (visible && isPlaying && !reducedMotion) renderBackdrop();
  }, 1000 / 24);

  const preview = (index: number, center = true, reveal = true) => {
    if (reveal) heroPreviewRef.current?.touch();
    setPreviewProject(null);
    centerRailRef.current = center;
    if (center) manualScrollRef.current = false;
    setActiveIndex(index);
  };

  const execute = (command: LandingCommand) => {
    const index = SUGGESTIONS.findIndex((item) => item.id === command.id);
    if (index >= 0) preview(index);
    if (command.href) {
      // The typed input uses the same allowlisted destinations as the links.
      navigate(command.href);
      return;
    }
    if (command.action === "pause") setIsPlaying(false);
    if (command.action === "play") setIsPlaying(true);
    setStatus(command.caption);
    setInput("");
    setSearchFilter(undefined);
  };

  const navigate = (href: string) => {
    startNavigation(() => router.push(localizedLinkPath(href, locale)));
  };

  const chooseSuggestion = (suggestion: DisplaySuggestion) => {
    if ("kind" in suggestion && suggestion.kind === "keyword") {
      setSearchFilter(suggestion.filter);
      setInput(suggestion.label);
      setStatus("");
      preview(0);
      return;
    }
    if (suggestion.href) navigate(suggestion.href);
    else if (!("kind" in suggestion)) execute(suggestion);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (navigating) return;
    if (hasQuery && !explicitCommand && (searchLoading || searchError)) return;
    if (hasQuery && suggestions[currentIndex]) {
      chooseSuggestion(suggestions[currentIndex]);
      return;
    }
  };

  const move = (direction: number) => {
    const rail = railRef.current;
    if (!rail) return;
    manualScrollRef.current = true;
    rail.scrollBy({
      left: direction * rail.clientWidth * 0.75,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  };

  return (
    <div
      ref={containerRef}
      className="landing"
      data-paused={paused || reducedMotion}
      data-searching={showResults}
      data-hero={isShapeMode ? "shape" : "brand"}
      data-shape-mounted={shapeMounted}
      onPointerMove={(event) => {
        if (event.pointerType === "touch" || reducedMotion) return;
        const rect = event.currentTarget.getBoundingClientRect();
        distanceCursorRef.current = {
          x: (event.clientX - rect.left) / cellSize,
          y: (event.clientY - rect.top) / cellSize,
        };
      }}
      onPointerLeave={() => {
        distanceCursorRef.current = null;
      }}
    >
      <div ref={backdropRef} className="landing-backdrop" aria-hidden="true">
        {bounds && (
          <PlasmaCanvas
            ref={canvasRef}
            onCanvasReady={onBackdropReady}
            ramp={LANDING_CHARACTERS}
            cellSize={cellSize}
            cellWidth={cellSize}
            fontPx={fontPx}
            gridWidth={bounds.width}
            gridHeight={bounds.height}
            postProcess
          />
        )}
      </div>
      <header className="landing-header">
        <Link
          href="/"
          prefetch={false}
          className="landing-wordmark"
          aria-label="Fuerst.one home"
        >
          FUERST.ONE<span aria-hidden="true">_</span>
        </Link>
        <div className="landing-header-actions">
          <LanguageSwitcher />
          <Link href="/plasma" prefetch={false}>
            {de ? "basteln" : "tinker"} <span aria-hidden="true">↗</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsPlaying((value) => !value)}
            aria-label={
              de
                ? isPlaying
                  ? "Animation pausieren"
                  : "Animation fortsetzen"
                : isPlaying
                  ? "Pause animation"
                  : "Resume animation"
            }
            aria-pressed={!isPlaying}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
        </div>
      </header>
      <div className="landing-content">
        <p className="landing-eyebrow">
          {de ? "UX + KI-ENGINEER" : "UX + AI ENGINEER"}{" "}
          <span aria-hidden="true">/</span>{" "}
          {de ? "NEUGIERIG AUS PRINZIP" : "CURIOUS BY DEFAULT"}
        </p>
        <div
          ref={setInteractionTarget}
          className="landing-stage"
          data-shape={shownShape}
          data-project={
            previewProject?.id ??
            ("kind" in active && active.kind === "project"
              ? active.id
              : undefined)
          }
          onPointerMove={(event) => {
            if (showIcon) {
              heroPreviewRef.current?.touch();
            } else if (!reducedMotion && containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              lensTargetRef.current = {
                x: (event.clientX - rect.left) / cellSize,
                y: (event.clientY - rect.top) / cellSize,
              };
              if (paused) renderBackdrop();
            }
          }}
          onPointerLeave={() => {
            lensTargetRef.current = null;
          }}
          onPointerDown={() => {
            if (isShapeMode) heroPreviewRef.current?.hold();
          }}
          onPointerUp={() => {
            if (showIcon) heroPreviewRef.current?.release();
          }}
          onPointerCancel={() => {
            if (showIcon) heroPreviewRef.current?.release();
          }}
        >
          <div
            className="landing-brand"
            aria-hidden={isShapeMode}
            inert={isShapeMode}
          >
            <div
              style={{
                position: "absolute",
                left: brandOffset.x,
                top: brandOffset.y,
                width: cellSize * BRAND_PLACEMENTS[0].label.label.length,
                height: cellSize,
              }}
            >
              <LabelOverlay
                placements={BRAND_PLACEMENTS}
                cellSize={cellSize}
                fontPx={fontPx + 2}
                getGlitchIntensity={
                  isPlaying && visible && !reducedMotion && !isShapeMode
                    ? getGlitchIntensity
                    : undefined
                }
              />
            </div>
          </div>
          <div className="landing-sculpture" aria-hidden="true">
            {shapeMounted && (
              <LandingShape
                shapeIndex={shownShape}
                paused={paused}
                reducedMotion={reducedMotion}
                active={visible && showIcon}
                interactionTarget={interactionTarget}
                onReadyChange={setShapeReady}
              />
            )}
          </div>
          <span className="landing-stage-corner landing-stage-corner-tl" />
          <span className="landing-stage-corner landing-stage-corner-br" />
          <span className="landing-stage-index" aria-hidden="true">
            {String(currentIndex + 1).padStart(2, "0")}{" "}
            <span>
              / {String(Math.max(1, suggestions.length)).padStart(2, "0")}
            </span>
          </span>
          <span className="landing-stage-hint" aria-hidden="true">
            drag to rotate ↔
          </span>
        </div>
        <div className="landing-intro">
          <p className="landing-title">{headline}</p>
          <p
            key={previewProject?.id ?? active.id}
            className="landing-caption"
            lang={
              previewProject
                ? previewProject.summaryLocale
                : "captionLocale" in active
                  ? active.captionLocale
                  : locale
            }
          >
            {previewProject
              ? previewProject.summary || previewProject.name
              : hasQuery && !suggestions.length
                ? de
                  ? "Finde ein Projekt, eine Technologie oder ein gemeinsames Interesse."
                  : "Find a project, a technology, or a shared interest."
                : active.caption}
          </p>
        </div>
        <div
          className="landing-console"
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setFocused(false);
          }}
        >
          <form
            className="landing-input-box"
            onSubmit={submit}
            aria-busy={busy}
          >
            <span className="landing-prompt" aria-hidden="true">
              ↳
            </span>
            <label className="sr-only" htmlFor="landing-command">
              {de
                ? "Was möchtest du entdecken?"
                : "Where would you like to go?"}
            </label>
            <input
              id="landing-command"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setSearchFilter(undefined);
                setStatus("");
                preview(0, true, showIcon);
              }}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === "Escape") {
                  setInput("");
                  setSearchFilter(undefined);
                  setStatus("");
                  preview(0, true, showIcon);
                } else if (
                  hasQuery &&
                  suggestions.length &&
                  (event.key === "ArrowDown" || event.key === "ArrowUp")
                ) {
                  event.preventDefault();
                  preview(
                    (currentIndex +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      suggestions.length) %
                      suggestions.length,
                  );
                }
              }}
              role={hasQuery ? "combobox" : undefined}
              aria-autocomplete={hasQuery ? "list" : undefined}
              aria-expanded={hasQuery ? suggestions.length > 0 : undefined}
              aria-controls={hasQuery ? suggestionsId : undefined}
              aria-activedescendant={
                hasQuery && suggestions.length
                  ? `${suggestionsId}-${currentIndex}`
                  : undefined
              }
              placeholder={
                de ? "Suchen oder Hallo sagen …" : "Search or say hello…"
              }
              autoComplete="off"
              spellCheck={false}
              maxLength={240}
              aria-describedby="landing-input-help landing-status"
            />
            <button
              type="submit"
              className="landing-submit"
              aria-label={progress || (de ? "Los" : "Go")}
              disabled={
                !hasQuery ||
                busy ||
                (!explicitCommand && (searchError || !suggestions.length))
              }
            >
              {busy ? (
                <LoaderCircle
                  size={18}
                  className="landing-loading-icon"
                  aria-hidden="true"
                />
              ) : (
                <ArrowUp size={18} aria-hidden="true" />
              )}
            </button>
          </form>
          <div className="landing-suggestions">
            <button
              type="button"
              className="landing-rail-arrow"
              aria-label={de ? "Vorheriger Vorschlag" : "Previous suggestion"}
              disabled={!scrollState.back}
              aria-hidden={!scrollState.back}
              onClick={() => move(-1)}
            >
              <ChevronLeft size={14} />
            </button>
            <div
              ref={railRef}
              id={suggestionsId}
              role={hasQuery ? "listbox" : undefined}
              className="landing-rail"
              data-scroll-back={scrollState.back}
              data-scroll-forward={scrollState.forward}
              aria-label={
                hasQuery
                  ? de
                    ? "Vorschläge für Projekte und Stichwörter"
                    : "Project keyword and name suggestions"
                  : de
                    ? "Vorgeschlagene Ziele und Plasma-Steuerung"
                    : "Suggested destinations and plasma controls"
              }
              onPointerDown={() => {
                manualScrollRef.current = true;
              }}
              onWheel={() => {
                manualScrollRef.current = true;
              }}
              onScroll={() => {
                updateScrollState();
                if (!manualScrollRef.current || !railRef.current) return;
                const rail = railRef.current;
                if (!rail.children.length) return;
                const center =
                  rail.getBoundingClientRect().left + rail.clientWidth / 2;
                const distances = Array.from(rail.children).map((chip) => {
                  const rect = chip.getBoundingClientRect();
                  return Math.abs(rect.left + rect.width / 2 - center);
                });
                preview(distances.indexOf(Math.min(...distances)), false);
              }}
            >
              {suggestions.map((suggestion, index) => {
                const props = {
                  className: "landing-chip",
                  id: `${suggestionsId}-${index}`,
                  role: hasQuery ? "option" : undefined,
                  "aria-selected": hasQuery
                    ? index === currentIndex
                    : undefined,
                  tabIndex: hasQuery ? -1 : undefined,
                  "data-active": showIcon && index === currentIndex,
                  onPointerMove: () => preview(index, false),
                  onFocus: () => preview(index),
                };
                const content = (
                  <>
                    <span aria-hidden="true">
                      {"kind" in suggestion && suggestion.kind === "keyword"
                        ? "#"
                        : "↗"}
                    </span>
                    {suggestion.label}
                    {"category" in suggestion && (
                      <span className="landing-chip-category">
                        {suggestion.category}
                        {suggestion.kind === "keyword"
                          ? ` · ${suggestion.count}`
                          : ""}
                      </span>
                    )}
                  </>
                );
                return suggestion.href ? (
                  <Link
                    key={suggestion.id}
                    href={suggestion.href}
                    prefetch={false}
                    onNavigate={(event) => {
                      event.preventDefault();
                      if (!navigating) navigate(suggestion.href!);
                    }}
                    {...props}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    key={suggestion.id}
                    type="button"
                    {...props}
                    onMouseDown={(event) => {
                      if (hasQuery) event.preventDefault();
                    }}
                    onClick={() => chooseSuggestion(suggestion)}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="landing-rail-arrow"
              aria-label={de ? "Nächster Vorschlag" : "Next suggestion"}
              disabled={!scrollState.forward}
              aria-hidden={!scrollState.forward}
              onClick={() => move(1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="landing-console-meta">
            <span id="landing-input-help">
              {hasQuery
                ? de
                  ? "↑ ↓ entdecken · Enter auswählen · Esc leeren"
                  : "↑ ↓ to explore · enter to select · esc to clear"
                : de
                  ? "Bedarf, Funktionen, Projekte, Tools oder ein Hallo"
                  : "needs, capabilities, projects, tools, or a hello"}
            </span>
            {!hasQuery && (
              <span aria-hidden="true">
                {de ? "tippen & Enter ↵" : "type & enter ↵"}
              </span>
            )}
          </div>
          {showResults && (
            <ProjectSearchResults
              projects={search.projects}
              query={input.trim()}
              loading={searchLoading}
              error={searchError}
              retry={retrySearch}
              onPreview={(project) => {
                setPreviewProject(project);
                if (project) heroPreviewRef.current?.touch();
              }}
            />
          )}
          <p id="landing-status" className="landing-status" role="status">
            {progress || status}
          </p>
        </div>
      </div>
      <div className="landing-footer">
        <nav aria-label="Social links">
          <a href="https://github.com/fuerst-one">GitHub ↗</a>
          <a href="https://www.linkedin.com/in/fuerst-one/">LinkedIn ↗</a>
          <Link href="/contact" prefetch={false}>
            {de ? "Hallo sagen ↗" : "Say hello ↗"}
          </Link>
        </nav>
        <LegalFooter />
      </div>
    </div>
  );
};
