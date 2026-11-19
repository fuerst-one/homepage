"use client";

import { useEffect } from "react";
import {
  recordVisitorInteraction,
  useVisitorProfileStore,
} from "./profileStore";
import {
  createProfileViewTracker,
  type ProfileViewTracker,
} from "./profileViewTracker";

const READ_SECONDS = 15;
const SECTION_READINGS = {
  "section:": "project_section_read",
  "service-section:": "service_section_read",
} as const;
type SectionFamily = keyof typeof SECTION_READINGS;
/** The one runtime of the mounted profile; React state would re-render every second. */
let runtime: {
  view: ProfileViewTracker;
  readSections: Set<string>;
  project: { id: string; read: boolean } | null;
} | null = null;

/** One view tracker for all tagged public content, including nested scrolling dialogs. */
export function useRichProfileSignals(
  pathname: string,
  enabled: boolean,
  activeProject?: string,
) {
  useEffect(() => {
    if (!enabled) return;
    const current: NonNullable<typeof runtime> = {
      view: createProfileViewTracker(Date.now()),
      readSections: new Set<string>(),
      project: null,
    };
    runtime = current;
    const { view, readSections } = current;
    let lastInteraction = Date.now();
    const activity = () => ({
      visible: document.visibilityState === "visible",
      focused:
        document.hasFocus() &&
        !document.activeElement?.closest("[data-profile-ui]"),
      lastInteraction,
    });
    const interact = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-profile-ui]")
      )
        return;
      lastInteraction = Date.now();
    };
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((name) =>
      window.addEventListener(name, interact, { passive: true }),
    );
    let frame = 0;
    const look = () => {
      frame = 0;
      view.measure(Date.now(), activity(), false);
    };
    // Scrolling moves regions in and out of view between the one-second ticks.
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(look);
    };
    window.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", schedule, { passive: true });
    const tick = setInterval(() => {
      if (!useVisitorProfileStore.getState().enabled) return;
      view.measure(Date.now(), activity(), true);
      for (const key of view.keys()) {
        const family = key.slice(0, key.indexOf(":") + 1);
        if (
          !(family in SECTION_READINGS) ||
          readSections.has(key) ||
          view.activeSeconds(key) < READ_SECONDS
        )
          continue;
        readSections.add(key);
        recordVisitorInteraction(
          SECTION_READINGS[family as SectionFamily],
          key.slice(family.length),
        );
      }
      const project = current.project;
      if (
        project &&
        !project.read &&
        view.activeSeconds(`project:${project.id}`) >= READ_SECONDS
      ) {
        project.read = true;
        recordVisitorInteraction("project_read", project.id);
      }
    }, 1000);
    return () => {
      clearInterval(tick);
      cancelAnimationFrame(frame);
      events.forEach((name) => window.removeEventListener(name, interact));
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      if (runtime === current) runtime = null;
    };
  }, [enabled]);
  // Section reading starts over on every page.
  useEffect(() => {
    if (!enabled || !runtime) return;
    for (const family of Object.keys(SECTION_READINGS)) {
      runtime.view.restart(family, Date.now());
      for (const key of runtime.readSections)
        if (key.startsWith(family)) runtime.readSections.delete(key);
    }
  }, [pathname, enabled]);
  // "Project read" starts over whenever another project, or none, is active.
  useEffect(() => {
    if (!enabled || !runtime) return;
    runtime.project = activeProject ? { id: activeProject, read: false } : null;
    if (activeProject)
      runtime.view.restart(`project:${activeProject}`, Date.now());
  }, [activeProject, enabled]);
}
