"use client";

import { useEffect } from "react";
import {
  isReturningProfileProject,
  profileArrivalStrength,
  profileClickLevel,
  profileLinkSignals,
  profilePageSignal,
  type ProfileCatalog,
  type ProfileClickLevel,
  type ProfileSignalKind,
} from "@homepage/content/visitorProfile";
import {
  PROFILE_PROJECT_REGIONS,
  PROFILE_REGION_VIEW_SECONDS,
  PROFILE_STAY_MS,
} from "@homepage/content/visitorProfileSignals";
import { useProjectFocusStore } from "../Cv/Projects/projectFocusStore";
import {
  recordVisitorInteraction,
  useVisitorProfileStore,
} from "./profileStore";
import { currentProfileView } from "./useRichProfileSignals";

type PageSignal = { kind: ProfileSignalKind; subject: string };
/** The last click, held in memory until the next page signal; a reload loses it. */
let carried: (PageSignal & { level: ProfileClickLevel | "link" }) | null = null;

const PROJECT_PAGE_KINDS: ProfileSignalKind[] = [
  "project_opened",
  "project_details_viewed",
  "case_study_viewed",
];
const INTERACTIVE =
  "a[href], button, summary, input, select, textarea, label, [role=button]";

function searchedList(card: Element) {
  const query = document.querySelector<HTMLInputElement>("#project-search");
  return (
    !!card.closest("[data-project-search-result]") && !!query?.value.trim()
  );
}

/** Credit a click at once and a page only after a stay or an interaction. */
export function useProfileArrivals(
  enabled: boolean,
  catalog: ProfileCatalog | null,
  page: PageSignal | null,
) {
  useEffect(() => {
    if (!enabled || !catalog) return;
    const click = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || event.button !== 0 || target.closest("[data-profile-ui]"))
        return;
      const control = target.closest<HTMLElement>("a[href], button");
      const link = control instanceof HTMLAnchorElement ? control : null;
      if (!control) return;
      if (link) {
        const url = new URL(link.href);
        // Proof links leave the site; filter links are filter choices.
        if (
          url.origin !== location.origin ||
          link.dataset.profileProof ||
          profileLinkSignals(link.href, location.origin, catalog).length
        )
          return;
      }
      const card = control.closest<HTMLElement>(
        '[data-profile-region^="card:"]',
      );
      const id = card?.dataset.profileRegion?.slice("card:".length);
      const destination = link
        ? profilePageSignal(
            new URL(link.href).pathname,
            new URL(link.href).searchParams.get("focus"),
            catalog,
          )
        : id
          ? { kind: "project_opened" as const, subject: id }
          : null;
      if (card && id) {
        const level = profileClickLevel(
          currentProfileView()?.continuousMs(
            `region:${card.dataset.profileRegion}`,
            Date.now(),
          ) ?? 0,
          searchedList(card),
        );
        if (level !== "none")
          recordVisitorInteraction(
            "project_card_clicked",
            id,
            level === "full" ? 1 : 0.5,
          );
        carried = destination && { ...destination, level };
        return;
      }
      if (!link) return;
      // Landing-page search results are exempt like typed list searches.
      const exempt = !!link.closest("#landing-projects");
      carried = destination && {
        ...destination,
        level: exempt ? "full" : "link",
      };
    };
    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, [enabled, catalog]);

  const kind = page?.kind;
  const subject = page?.subject;
  useEffect(() => {
    if (!enabled || !catalog || !kind || !subject) return;
    const arrival = carried;
    carried = null;
    const strength = profileArrivalStrength(
      arrival?.kind === kind && arrival.subject === subject
        ? arrival.level
        : null,
    );
    const regions =
      kind === "project_details_viewed"
        ? PROFILE_PROJECT_REGIONS
        : kind === "project_opened"
          ? (["needs"] as const)
          : [];
    // Region time counts from this arrival, not from an earlier visit.
    for (const region of regions)
      currentProfileView()?.restart(
        `region:project:${subject}|${region}`,
        Date.now(),
      );
    let stayed = false;
    let regionTimer: ReturnType<typeof setInterval> | undefined;
    const viewedRegions = new Set<string>();
    const creditRegions = () => {
      for (const region of regions) {
        if (viewedRegions.has(region)) continue;
        const seconds =
          currentProfileView()?.seconds(
            `region:project:${subject}|${region}`,
          ) ?? 0;
        if (seconds < PROFILE_REGION_VIEW_SECONDS) continue;
        viewedRegions.add(region);
        recordVisitorInteraction(
          "project_region_viewed",
          `${subject}|${region}`,
          strength,
        );
      }
    };
    const stopStay = () => {
      clearTimeout(stayTimer);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("click", interact, true);
      document.removeEventListener("input", interact, true);
    };
    const credit = () => {
      if (stayed) return;
      stayed = true;
      stopStay();
      if (
        PROJECT_PAGE_KINDS.includes(kind) &&
        isReturningProfileProject(
          useVisitorProfileStore.getState().profile,
          subject,
          Date.now(),
        )
      )
        recordVisitorInteraction("project_returned", subject);
      recordVisitorInteraction(kind, subject, strength);
      if (regions.length) {
        creditRegions();
        regionTimer = setInterval(creditRegions, 1000);
      }
    };

    let visibleMs = 0;
    let visibleSince: number | null = null;
    let stayTimer: ReturnType<typeof setTimeout> | undefined;
    const startClock = () => {
      visibleSince = Date.now();
      stayTimer = setTimeout(credit, Math.max(0, PROFILE_STAY_MS - visibleMs));
    };
    const visibility = () => {
      if (document.visibilityState === "visible") {
        if (visibleSince === null) startClock();
        return;
      }
      if (visibleSince !== null) visibleMs += Date.now() - visibleSince;
      visibleSince = null;
      clearTimeout(stayTimer);
    };
    const stillHere = () => {
      const now = profilePageSignal(
        location.pathname,
        useProjectFocusStore.getState().focusedProjectId,
        catalog,
      );
      return now?.kind === kind && now.subject === subject;
    };
    // Scrolling, the site header and footer, the profile's own controls and
    // closing the dialog are how a visitor moves on, not interactions.
    const interact = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      const control = target?.closest(INTERACTIVE);
      if (!control || control.closest("[data-profile-ui]")) return;
      const content =
        kind === "project_opened"
          ? document.querySelector('[role="dialog"][data-state="open"]')
          : document.querySelector("main");
      if (!content?.contains(control)) return;
      if (control instanceof HTMLAnchorElement) credit();
      // A button's own handler may close the dialog; judge it afterwards.
      else
        setTimeout(() => {
          if (stillHere()) credit();
        }, 0);
    };
    if (document.visibilityState === "visible") startClock();
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("click", interact, true);
    document.addEventListener("input", interact, true);
    return () => {
      stopStay();
      clearInterval(regionTimer);
    };
  }, [enabled, catalog, kind, subject]);
}
