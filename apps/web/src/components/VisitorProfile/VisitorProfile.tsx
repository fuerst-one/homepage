"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "../i18n/LocaleProvider";
import Link from "../i18n/LocalizedLink";
import { useProjectFocusStore } from "../Cv/Projects/projectFocusStore";
import {
  PROFILE_STORAGE_KEY,
  isActiveProfileReading,
  profilePageSignal,
  profileLinkSignals,
  isReturningProfileProject,
} from "@homepage/content/visitorProfile";
import {
  useVisitorProfileStore as useProfile,
  recordVisitorInteraction,
  PROFILE_ERASURE_KEY,
} from "./profileStore";
import { ProfilePixelGrid } from "./ProfilePixelGrid";
import { ForYouHint, useForYouHintVisible } from "./ForYouHint";
import "./visitor-profile.css";
import { profileOrientationAt } from "@homepage/content/profilePixels";
import { useRichProfileSignals } from "./useRichProfileSignals";

function useProfileRuntime() {
  const pathname = usePathname();
  const enabled = useProfile((s) => s.enabled);
  const catalog = useProfile((s) => s.catalog);
  useRichProfileSignals(pathname, enabled);
  const orientation = useProfile((s) => s.orientation);
  useEffect(() => {
    if (!enabled || orientation !== null) return;
    const seed = (event: MouseEvent) => {
      if (
        !event.isTrusted ||
        event.button !== 0 ||
        !(event.target instanceof Element) ||
        event.target.closest("[data-profile-ui]")
      )
        return;
      const control = event.target.closest("a[href],button,[role=button]");
      if (!control || control.matches(":disabled,[aria-disabled=true]")) return;
      const bounds = control.getBoundingClientRect();
      const x =
        event.detail === 0 ? bounds.left + bounds.width / 2 : event.clientX;
      const y =
        event.detail === 0 ? bounds.top + bounds.height / 2 : event.clientY;
      useProfile
        .getState()
        .setOrientation(profileOrientationAt(x, y, innerWidth, innerHeight));
    };
    document.addEventListener("click", seed, true);
    return () => document.removeEventListener("click", seed, true);
  }, [enabled, orientation]);
  const pending = useProfile((s) => s.pending);
  const network = useProfile((s) => s.network);
  const focusedId = useProjectFocusStore((s) => s.focusedProjectId);
  useEffect(() => {
    useProfile.getState().restoreErasure();
    try {
      if (localStorage.getItem(PROFILE_STORAGE_KEY))
        void useProfile.getState().loadCatalog();
    } catch {
      /* Memory-only mode remains available. */
    }
    const changed = (event: StorageEvent) => {
      if (
        event.key === PROFILE_STORAGE_KEY ||
        event.key === PROFILE_ERASURE_KEY ||
        event.key === null
      )
        useProfile.getState().syncFromStorage();
    };
    const leaving = () => {
      void useProfile.getState().flush();
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") leaving();
    };
    window.addEventListener("storage", changed);
    window.addEventListener("pagehide", leaving);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("storage", changed);
      window.removeEventListener("pagehide", leaving);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (pathname === "/en/profile" || pathname === "/de/profile")
      void useProfile.getState().loadCatalog();
  }, [pathname]);
  useEffect(() => {
    if (!enabled || !catalog) return;
    const categoryLink = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!link || event.defaultPrevented || event.button !== 0) return;
      const proof = link.dataset.profileProof;
      const related = link.dataset.profileRelated;
      if (proof) recordVisitorInteraction("proof_opened", proof);
      if (related) recordVisitorInteraction("related_project_opened", related);
      for (const signal of profileLinkSignals(
        link.href,
        location.origin,
        catalog,
      ))
        recordVisitorInteraction(signal.kind, signal.subject);
    };
    document.addEventListener("click", categoryLink, true);
    return () => document.removeEventListener("click", categoryLink, true);
  }, [enabled, catalog]);
  const pageSignal = catalog
    ? profilePageSignal(pathname, focusedId, catalog)
    : null;
  const activeProject =
    pageSignal &&
    ["project_opened", "project_details_viewed", "case_study_viewed"].includes(
      pageSignal.kind,
    )
      ? pageSignal.subject
      : undefined;
  const pageKind = pageSignal?.kind;
  const pageSubject = pageSignal?.subject;
  useEffect(() => {
    if (enabled && pageKind && pageSubject) {
      const state = useProfile.getState();
      if (
        [
          "project_opened",
          "project_details_viewed",
          "case_study_viewed",
        ].includes(pageKind) &&
        isReturningProfileProject(state.profile, pageSubject, Date.now())
      )
        recordVisitorInteraction("project_returned", pageSubject);
      recordVisitorInteraction(pageKind, pageSubject);
    }
  }, [enabled, pageKind, pageSubject]);
  useEffect(() => {
    if (!enabled || !activeProject) return;
    let lastInteraction = Date.now();
    let activeSeconds = 0;
    const interact = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-profile-ui]")
      )
        return;
      lastInteraction = Date.now();
    };
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((event) =>
      window.addEventListener(event, interact, { passive: true }),
    );
    const timer = setInterval(() => {
      const target = document.querySelector(
        `[data-profile-project="${activeProject}"]`,
      );
      const bounds = target?.getBoundingClientRect();
      const modal = document.querySelector(
        '[role="dialog"][data-state="open"]',
      );
      const inView =
        !!bounds &&
        !!target &&
        (!modal || modal.contains(target)) &&
        Math.min(bounds.bottom, innerHeight) - Math.max(bounds.top, 0) >= 80;
      if (
        isActiveProfileReading(
          {
            visible: document.visibilityState === "visible" && inView,
            focused:
              document.hasFocus() &&
              !document.activeElement?.closest("[data-profile-ui]"),
            lastInteraction,
          },
          Date.now(),
        )
      )
        activeSeconds++;
      if (activeSeconds >= 15) {
        recordVisitorInteraction("project_read", activeProject);
        clearInterval(timer);
      }
    }, 1000);
    return () => {
      clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, interact));
    };
  }, [enabled, activeProject]);
  useEffect(() => {
    if (!pending.length || network === "error" || network === "sending") return;
    const timer = setTimeout(() => void useProfile.getState().flush(), 1500);
    return () => clearTimeout(timer);
  }, [pending, network]);
}

function useFooterClearance(pathname: string) {
  const [bottom, setBottom] = useState<number>();
  useEffect(() => {
    const footer = document.querySelector("[data-site-footer]");
    if (!footer) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const inset = window.matchMedia("(max-width: 600px)").matches ? 12 : 18;
      // Dock above the footer while it is visible, without changing page height.
      setBottom(
        Math.max(inset, innerHeight - footer.getBoundingClientRect().top + 12),
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    resize.observe(footer);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);
  return bottom;
}

export default function VisitorProfile() {
  const de = useLocale() === "de";
  const pathname = usePathname();
  const enabled = useProfile((s) => s.enabled);
  useProfileRuntime();
  const bottom = useFooterClearance(pathname);
  const launcher = useRef<HTMLAnchorElement>(null);
  const hintVisible = useForYouHintVisible();
  if (pathname === "/en/profile" || pathname === "/de/profile") return null;
  return enabled ? (
    <>
      <ForYouHint visible={hintVisible} bottom={bottom} launcher={launcher} />
      <Link
        ref={launcher}
        href="/profile"
        prefetch={false}
        data-profile-ui
        style={{ bottom }}
        className="profile-pixel-launcher"
        aria-label={
          de
            ? "Dein aktuelles Interessenprofil öffnen"
            : "Open your current interest profile"
        }
        onClick={
          hintVisible
            ? () => useProfile.getState().markForYouHintSeen()
            : undefined
        }
      >
        <ProfilePixelGrid />
      </Link>
    </>
  ) : (
    <Link
      href="/profile"
      prefetch={false}
      data-profile-ui
      style={{ bottom }}
      className="profile-entry-link"
    >
      {de ? "Dein Live-Profil" : "Your live profile"}{" "}
      <span aria-hidden="true">↗</span>
    </Link>
  );
}
