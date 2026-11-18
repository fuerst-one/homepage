"use client";

import { useEffect } from "react";
import { advanceProfileReading } from "@homepage/content/visitorProfile";
import {
  recordVisitorInteraction,
  useVisitorProfileStore,
} from "./profileStore";

/** One reader for all annotated public sections, including nested scrolling dialogs. */
export function useRichProfileSignals(pathname: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const seconds = new Map<string, number>();
    let lastInteraction = Date.now();
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
    const tick = setInterval(() => {
      if (!useVisitorProfileStore.getState().enabled) return;
      const modal = document.querySelector(
        '[role="dialog"][data-state="open"]',
      );
      const now = Date.now();
      const state = {
        visible: document.visibilityState === "visible",
        focused:
          document.hasFocus() &&
          !document.activeElement?.closest("[data-profile-ui]"),
        lastInteraction,
      };
      const counted = new Set<string>();
      document
        .querySelectorAll<HTMLElement>(
          "[data-profile-section], [data-profile-service-section]",
        )
        .forEach((el) => {
          const subject =
            el.dataset.profileSection ?? el.dataset.profileServiceSection;
          if (!subject) return;
          const kind = el.dataset.profileSection
            ? "project_section_read"
            : "service_section_read";
          const key = `${kind}:${subject}`;
          if ((seconds.get(key) ?? 0) >= 15 || counted.has(key)) return;
          const box = el.getBoundingClientRect();
          const height =
            Math.min(box.bottom, innerHeight) - Math.max(box.top, 0);
          const width = Math.min(box.right, innerWidth) - Math.max(box.left, 0);
          const x = Math.max(0, box.left) + Math.max(0, width) / 2;
          const y = Math.max(0, box.top) + Math.max(0, height) / 2;
          const top =
            height > 0 && width > 0 ? document.elementFromPoint(x, y) : null;
          const covered =
            !!(modal && !modal.contains(el)) ||
            !top ||
            !(el.contains(top) || top.contains(el));
          const inView =
            height >= Math.min(80, box.height * 0.5) &&
            width > 0 &&
            box.height > 0;
          if (inView && !covered) counted.add(key);
          const count = advanceProfileReading(
            seconds.get(key) ?? 0,
            {
              ...state,
              inView:
                height >= Math.min(80, box.height * 0.5) &&
                width > 0 &&
                box.height > 0,
              covered,
            },
            now,
          );
          seconds.set(key, count);
          if (count === 15) recordVisitorInteraction(kind, subject);
        });
    }, 1000);
    return () => {
      clearInterval(tick);
      events.forEach((name) => window.removeEventListener(name, interact));
    };
  }, [pathname, enabled]);
}
