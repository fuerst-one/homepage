"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "../i18n/LocaleProvider";
import Link from "../i18n/LocalizedLink";
import { useProjectFocusStore } from "../Cv/Projects/projectFocusStore";
import {
  PROFILE_STORAGE_KEY,
  profilePageSignal,
  profileLinkSignals,
} from "@homepage/content/visitorProfile";
import {
  useVisitorProfileStore as useProfile,
  recordVisitorInteraction,
  PROFILE_ERASURE_KEY,
} from "./profileStore";
import { ProfilePixelGrid } from "./ProfilePixelGrid";
import { ForYouHint, useForYouHintVisible, useOpenDialog } from "./ForYouHint";
import { useForYouReady } from "./useForYouReady";
import "./visitor-profile.css";
import { profileOrientationAt } from "@homepage/content/profilePixels";
import { useRichProfileSignals } from "./useRichProfileSignals";
import { useProfileArrivals } from "./useProfileArrivals";

function hasSavedProfile() {
  try {
    return !!localStorage.getItem(PROFILE_STORAGE_KEY);
  } catch {
    return false;
  }
}

function useProfileRuntime() {
  const pathname = usePathname();
  const enabled = useProfile((s) => s.enabled);
  const catalog = useProfile((s) => s.catalog);
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
    if (hasSavedProfile()) void useProfile.getState().loadCatalog();
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
  useProfileArrivals(enabled, catalog, pageSignal);
  useRichProfileSignals(pathname, enabled, activeProject);
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
  // This component only renders in the browser, so storage is readable on its
  // first render. A saved profile needs the catalog before it can be restored;
  // until then neither the launcher nor the entry link would be the right one.
  const [savedOnLoad] = useState(hasSavedProfile);
  const profileSettled = useProfile(
    (s) => s.enabled || s.catalog !== null || s.catalogFailed,
  );
  useProfileRuntime();
  const bottom = useFooterClearance(pathname);
  const launcher = useRef<HTMLAnchorElement>(null);
  const hintVisible = useForYouHintVisible();
  const forYouReady = useForYouReady();
  // Unlike the launcher, the entry link has nothing to show beside a dialog.
  const dialogOpen = useOpenDialog(!enabled);
  if (pathname === "/en/profile" || pathname === "/de/profile") return null;
  const onForYou = pathname === "/en/for-you" || pathname === "/de/for-you";
  const markHintSeen = hintVisible
    ? () => useProfile.getState().markForYouHintSeen()
    : undefined;
  if (savedOnLoad && !profileSettled) return null;
  if (!enabled && dialogOpen) return null;
  return enabled ? (
    <>
      <ForYouHint visible={hintVisible} bottom={bottom} launcher={launcher} />
      <div className="profile-pixel-dock" data-profile-ui style={{ bottom }}>
        <Link
          ref={launcher}
          href="/profile"
          prefetch={false}
          data-profile-ui
          className="profile-pixel-launcher"
          aria-label={
            de
              ? "Dein aktuelles Interessenprofil öffnen"
              : "Open your current interest profile"
          }
          onClick={markHintSeen}
        >
          <ProfilePixelGrid />
        </Link>
        {forYouReady && !onForYou && (
          <Link
            href="/for-you"
            prefetch={false}
            className="profile-for-you-button"
            onClick={markHintSeen}
          >
            {de ? "Für dich" : "For you"}
          </Link>
        )}
      </div>
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
