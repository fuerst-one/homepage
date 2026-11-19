"use client";

import { useEffect, type RefObject } from "react";
import { useProjectFocusStore } from "./projectFocusStore";

/** Publishes which project cards overlap the middle of the viewport. */
export function useProjectsInView(
  list: RefObject<HTMLElement | null>,
  renderedIds: string,
) {
  const setInView = useProjectFocusStore((s) => s.setInViewProjectIds);
  useEffect(() => {
    if (!list.current || typeof IntersectionObserver === "undefined") return;
    const cards = list.current.querySelectorAll("[data-project-search-result]");
    // Without cards the observer never reports, which would leave old rings behind.
    if (!cards.length) {
      setInView([]);
      return;
    }
    const inView = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.projectSearchResult;
          if (!id) continue;
          if (entry.isIntersecting) inView.add(id);
          else inView.delete(id);
        }
        setInView([...inView]);
      },
      // A card peeking in at the very edge is not yet what the visitor is reading.
      { rootMargin: "-20% 0px -20% 0px" },
    );
    for (const card of cards) observer.observe(card);
    return () => observer.disconnect();
  }, [list, renderedIds, setInView]);
  useEffect(() => () => setInView([]), [setInView]);
}
