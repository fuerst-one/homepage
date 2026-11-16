"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { LanguageSwitcher } from "../i18n/LanguageSwitcher";
import { useLocale } from "../i18n/LocaleProvider";
import { localizedLinkPath } from "@homepage/content/i18n";
import Link from "../i18n/LocalizedLink";
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
import { ArrowUp, LoaderCircle, Pause, Play } from "lucide-react";
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
import {
  searchProjectIndex,
  SearchFilter,
  SearchProject,
  SearchSuggestion,
  resolveSearchDestination,
} from "./projectSearch";
import { useProjectSearch } from "./useProjectSearch";
import { ProjectSearchResults } from "./ProjectSearchResults";
import { knowledgeFallback } from "../../lib/knowledgeFallback";
import type { KnowledgeAction } from "@homepage/content/knowledge";
import { useKnowledgeAssistant } from "./useKnowledgeAssistant";
import "./landing.css";
import "./knowledge.css";

const LandingShape = dynamic(() => import("./LandingShape"), { ssr: false });
const KnowledgeAssistant = dynamic(() => import("./KnowledgeAssistant"), {
  ssr: false,
});
const BRAND_PLACEMENTS = [
  {
    row: 0,
    startCol: 0,
    label: {
      label: "FUERST.ONE",
      href: "/projects",
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
  const discoveryRef = useRef<HTMLDivElement>(null);
  const submittedTurn = useRef(0);
  const suppressChatResume = useRef(false);
  const [bounds, setBounds] = useState<FrameBounds | null>(null);
  const [brandOffset, setBrandOffset] = useState({ x: 0, y: 0 });
  const [interactionTarget, setInteractionTarget] =
    useState<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visible, setVisible] = useState(true);
  const [focused, setFocused] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const assistantEnabled =
    process.env.NEXT_PUBLIC_KNOWLEDGE_ASSISTANT_ENABLED === "true";
  const [chatMode, setChatMode] = useState(false);
  const assistant = useKnowledgeAssistant(assistantEnabled);
  const [assistantProject, setAssistantProject] = useState<string | null>(null);
  const [assistantShowProjects, setAssistantShowProjects] = useState(false);
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
  const showDiscovery =
    !chatMode &&
    (hasQuery || Boolean(assistantProject) || assistantShowProjects);
  const shownProjects =
    assistantProject && searchIndex
      ? searchIndex.projects.filter(
          (project) => project.id === assistantProject,
        )
      : assistantShowProjects
        ? (searchIndex?.projects ?? [])
        : explicitCommand
          ? []
          : search.projects;
  const discoveryChoices = suggestions.filter(
    (suggestion) =>
      hasQuery && (!("kind" in suggestion) || suggestion.kind === "keyword"),
  );
  useEffect(() => {
    if (!showDiscovery) return;
    const update = () => {
      const slot = discoveryRef.current;
      const header = containerRef.current?.querySelector(".landing-header");
      if (!slot || !header) return;
      const available =
        slot.getBoundingClientRect().bottom -
        Math.max(16, header.getBoundingClientRect().bottom) -
        20;
      slot.style.setProperty(
        "--discovery-height",
        `${Math.max(50, Math.min(260, available / 2))}px`,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [showDiscovery]);
  const loadingSuggestions = !chatMode && searchLoading && !explicitCommand;
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
    renderBackdrop();
  }, [bounds, renderBackdrop]);

  useInterval(() => {
    if (visible && isPlaying && !reducedMotion) renderBackdrop();
  }, 1000 / 24);

  const preview = (index: number, reveal = true) => {
    if (previewProject) heroPreviewRef.current?.release();
    if (reveal) heroPreviewRef.current?.touch();
    setPreviewProject(null);
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

  const restoreLanding = () => {
    submittedTurn.current++;
    assistant.stop();
    setChatMode(false);
    setInput("");
    setSearchFilter(undefined);
    setAssistantProject(null);
    setAssistantShowProjects(false);
    setPreviewProject(null);
    setActiveIndex(0);
    setStatus("");
    heroPreviewRef.current?.reset();
    suppressChatResume.current = true;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      suppressChatResume.current = false;
    });
  };

  const assistantAction = (action: KnowledgeAction) => {
    if (action.type === "navigate") {
      navigate(action.target);
      return;
    }
    setChatMode(false);
    if (action.type === "filter") {
      setAssistantProject(action.target);
      setInput("");
      setSearchFilter(undefined);
      setFocused(true);
      setStatus(
        de
          ? "Ausgewähltes Projekt wird angezeigt."
          : "Showing the selected project.",
      );
    }
    const target = action.type === "filter" ? "projects" : action.target;
    if (target === "projects" && action.type === "highlight") {
      setAssistantProject(null);
      setAssistantShowProjects(true);
      setInput("");
      setFocused(true);
    }
    requestAnimationFrame(() => {
      const element = document.getElementById(`landing-${target}`);
      if (!element) return;
      element.scrollIntoView({
        block: "center",
        behavior: reducedMotion ? "instant" : "smooth",
      });
      element.focus({ preventScroll: true });
      element.classList.add("knowledge-highlight");
      setTimeout(() => element.classList.remove("knowledge-highlight"), 3000);
    });
  };

  const chooseSuggestion = (suggestion: DisplaySuggestion) => {
    if ("kind" in suggestion && suggestion.kind === "keyword") {
      setSearchFilter(suggestion.filter);
      setInput(suggestion.label);
      setStatus("");
      preview(0);
      suppressChatResume.current = true;
      inputRef.current?.focus();
      suppressChatResume.current = false;
      return;
    }
    if (suggestion.href) navigate(suggestion.href);
    else if (!("kind" in suggestion)) execute(suggestion);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (navigating) return;
    if (hasQuery && !explicitCommand && searchLoading) return;
    if (explicitCommand) {
      execute(explicitCommand);
      return;
    }
    const destination =
      searchIndex && resolveSearchDestination(searchIndex, input, searchFilter);
    if (destination) {
      navigate(destination);
      return;
    }
    if (assistantEnabled) {
      if (!hasQuery || assistant.busy) return;
      setChatMode(true);
      setAssistantProject(null);
      setAssistantShowProjects(false);
      const question = input;
      const request = ++submittedTurn.current;
      void assistant
        .ask(question, knowledgeFallback(locale, search.projects))
        .then((succeeded) => {
          if (!succeeded && request === submittedTurn.current)
            setInput(question);
        });
      setInput("");
      setStatus("");
      return;
    }
    if (hasQuery && suggestions[currentIndex]) {
      chooseSuggestion(suggestions[currentIndex]);
      return;
    }
  };

  return (
    <div
      ref={containerRef}
      className="landing"
      data-paused={paused || reducedMotion}
      data-discovery={showDiscovery}
      data-chat={chatMode}
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
        <div className="landing-intro" aria-hidden={showDiscovery || chatMode}>
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
          onKeyDown={(event) => {
            if (event.key === "Escape" && !event.defaultPrevented) {
              event.preventDefault();
              restoreLanding();
            }
          }}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setFocused(false);
          }}
        >
          <div
            ref={discoveryRef}
            className="landing-discovery-slot"
            hidden={chatMode}
          >
            <nav
              className="landing-quick-access"
              aria-hidden={chatMode || showDiscovery}
              inert={chatMode || showDiscovery}
              aria-label={de ? "Schnellzugriff" : "Quick access"}
            >
              {SUGGESTIONS.map((suggestion, index) => (
                <Link
                  key={suggestion.id}
                  className="landing-chip"
                  href={suggestion.href!}
                  prefetch={false}
                  onPointerMove={() => preview(index)}
                  onFocus={() => preview(index)}
                >
                  <span aria-hidden="true">↗</span>
                  {suggestion.label}
                </Link>
              ))}
            </nav>
            {showDiscovery && (
              <div
                className="landing-discovery"
                id={suggestionsId}
                aria-label={de ? "Projekte und Filter" : "Projects and filters"}
                tabIndex={-1}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    restoreLanding();
                    return;
                  }
                  if (
                    !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
                  )
                    return;
                  const choices = Array.from(
                    event.currentTarget.querySelectorAll<HTMLElement>(
                      "[data-discovery-choice]",
                    ),
                  );
                  if (!choices.length) return;
                  const index = choices.indexOf(
                    document.activeElement as HTMLElement,
                  );
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? choices.length - 1
                        : (index +
                            (event.key === "ArrowDown" ? 1 : -1) +
                            choices.length) %
                          choices.length;
                  event.preventDefault();
                  choices[next].focus();
                }}
              >
                {(shownProjects.length > 0 ||
                  (searchLoading && !explicitCommand) ||
                  searchError ||
                  !discoveryChoices.length) && (
                  <div
                    id="landing-projects"
                    className="landing-discovery-panel"
                    tabIndex={-1}
                  >
                    <ProjectSearchResults
                      projects={shownProjects}
                      query={input.trim()}
                      loading={searchLoading && !explicitCommand}
                      error={searchError && !explicitCommand}
                      retry={retrySearch}
                      onPreview={(project) => {
                        if (project) heroPreviewRef.current?.hold();
                        else if (previewProject)
                          heroPreviewRef.current?.release();
                        setPreviewProject(project);
                      }}
                    />
                  </div>
                )}
                {!!discoveryChoices.length && (
                  <nav
                    className="landing-discovery-choices"
                    aria-label={de ? "Suchvorschläge" : "Search suggestions"}
                  >
                    {discoveryChoices.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        className="landing-chip"
                        data-discovery-choice
                        onClick={() => chooseSuggestion(suggestion)}
                        onPointerMove={() =>
                          preview(suggestions.indexOf(suggestion))
                        }
                        onFocus={() => preview(suggestions.indexOf(suggestion))}
                      >
                        <span aria-hidden="true">
                          {"kind" in suggestion ? "+" : "↗"}
                        </span>
                        {suggestion.label}
                      </button>
                    ))}
                  </nav>
                )}
              </div>
            )}
          </div>
          {chatMode && (
            <KnowledgeAssistant
              turns={assistant.turns}
              busy={assistant.busy}
              error={assistant.error}
              pendingQuestion={assistant.pendingQuestion}
              onAction={assistantAction}
              onBack={restoreLanding}
              onClear={() => {
                assistant.clear();
                restoreLanding();
              }}
            />
          )}
          <div className="landing-composer">
            <form
              id="landing-search"
              tabIndex={-1}
              className="landing-input-box"
              onSubmit={submit}
              aria-busy={assistantEnabled ? assistant.busy : busy}
            >
              <span className="landing-prompt" aria-hidden="true">
                ↳
              </span>
              <label className="sr-only" htmlFor="landing-command">
                {chatMode
                  ? de
                    ? "Frage zu Alex’ Arbeit"
                    : "Question about Alex's work"
                  : de
                    ? "Was möchtest du entdecken?"
                    : "Where would you like to go?"}
              </label>
              <input
                ref={inputRef}
                id="landing-command"
                value={input}
                onFocus={() => {
                  if (
                    assistantEnabled &&
                    assistant.turns.length &&
                    !suppressChatResume.current
                  )
                    setChatMode(true);
                }}
                onClick={() => {
                  if (assistantEnabled && assistant.turns.length)
                    setChatMode(true);
                }}
                onChange={(event) => {
                  setAssistantProject(null);
                  setAssistantShowProjects(false);
                  setInput(event.target.value);
                  setSearchFilter(undefined);
                  setStatus("");
                  preview(0, showIcon);
                }}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing) return;
                  if (event.key === "Escape") {
                    event.preventDefault();
                    restoreLanding();
                  } else if (
                    showDiscovery &&
                    (event.key === "ArrowDown" || event.key === "ArrowUp")
                  ) {
                    const choices =
                      discoveryRef.current?.querySelectorAll<HTMLElement>(
                        "[data-discovery-choice]",
                      );
                    if (!choices?.length) return;
                    event.preventDefault();
                    choices[
                      event.key === "ArrowDown" ? 0 : choices.length - 1
                    ].focus();
                  }
                }}
                type="search"
                aria-controls={showDiscovery ? suggestionsId : undefined}
                placeholder={
                  assistantEnabled
                    ? chatMode
                      ? de
                        ? "Stelle eine weitere Frage …"
                        : "Ask another question…"
                      : de
                        ? "Projekte suchen oder eine Frage stellen …"
                        : "Search projects or ask a question…"
                    : de
                      ? "Suchen oder Hallo sagen …"
                      : "Search or say hello…"
                }
                autoComplete="off"
                spellCheck={false}
                maxLength={assistantEnabled ? 1000 : 240}
                readOnly={assistant.busy}
                aria-describedby="landing-input-help landing-status"
              />
              <button
                type={assistant.busy ? "button" : "submit"}
                onClick={
                  assistant.busy
                    ? (event) => {
                        event.preventDefault();
                        assistant.stop();
                      }
                    : undefined
                }
                className="landing-submit"
                aria-label={
                  assistantEnabled
                    ? assistant.busy
                      ? de
                        ? "Antwort stoppen"
                        : "Stop answer"
                      : de
                        ? "Suchen oder fragen"
                        : "Search or ask"
                    : progress || (de ? "Los" : "Go")
                }
                disabled={
                  assistantEnabled
                    ? (!hasQuery && !assistant.busy) ||
                      navigating ||
                      (!assistant.busy && !explicitCommand && searchLoading)
                    : !hasQuery ||
                      busy ||
                      (!explicitCommand && (searchError || !suggestions.length))
                }
              >
                {assistant.busy ? (
                  <span aria-hidden="true">■</span>
                ) : !assistantEnabled && busy ? (
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
            <div className="landing-console-meta">
              <span id="landing-input-help">
                {assistantEnabled
                  ? chatMode
                    ? de
                      ? "Enter fragen · Esc Chat schließen"
                      : "enter to ask · esc to close chat"
                    : de
                      ? "Enter öffnen oder fragen · ↑ ↓ Vorschläge · Esc leeren"
                      : "enter to open or ask · ↑ ↓ suggestions · esc to clear"
                  : hasQuery
                    ? de
                      ? "↑ ↓ entdecken · Enter auswählen · Esc leeren"
                      : "↑ ↓ to explore · enter to select · esc to clear"
                    : de
                      ? "Bedarf, Funktionen, Projekte, Tools oder ein Hallo"
                      : "needs, capabilities, projects, tools, or a hello"}
              </span>
              {!hasQuery && !assistantEnabled && (
                <span aria-hidden="true">
                  {de ? "tippen & Enter ↵" : "type & enter ↵"}
                </span>
              )}
            </div>
            {assistantEnabled && (
              <p className="knowledge-privacy">
                {de
                  ? "Fragen gehen über OpenRouter an KI-Anbieter. Verlauf: bis zu 2 Stunden in diesem Tab. Keine vertraulichen Angaben. KI kann sich irren. "
                  : "Questions go through OpenRouter to AI providers. History: up to 2 hours in this tab. Leave out confidential details. AI can make mistakes. "}
                <Link
                  href={
                    de ? "/datenschutz#ai-assistant" : "/privacy#ai-assistant"
                  }
                  prefetch={false}
                  className="underline"
                >
                  {de ? "Datenschutz" : "Privacy"}
                </Link>
              </p>
            )}
          </div>
          <p id="landing-status" className="landing-status" role="status">
            {progress || status}
          </p>
        </div>
      </div>
      <div className="landing-footer">
        <nav id="landing-contact" tabIndex={-1} aria-label="Social links">
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
