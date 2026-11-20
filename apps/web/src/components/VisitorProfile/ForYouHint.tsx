"use client";

import { useRef, useSyncExternalStore, type RefObject } from "react";
import { usePathname } from "next/navigation";
import Link from "../i18n/LocalizedLink";
import { useLocale } from "../i18n/LocaleProvider";
import { useVisitorProfileStore } from "./profileStore";
import { useForYouReady } from "./useForYouReady";

// Dialogs are portalled into the body, so its child list is enough to watch.
const subscribeToBodyChildren = (notify: () => void) => {
  const observer = new MutationObserver(notify);
  observer.observe(document.body, { childList: true });
  return () => observer.disconnect();
};
const unsubscribed = () => () => {};
const isDialogOpen = () =>
  !!document.querySelector('[role="dialog"][data-state="open"]');
const noDialog = () => false;

export function useOpenDialog(watching: boolean) {
  return useSyncExternalStore(
    watching ? subscribeToBodyChildren : unsubscribed,
    watching ? isDialogOpen : noDialog,
    noDialog,
  );
}

/**
 * The hint is due until it is dismissed, stays away while a dialog covers the
 * launcher, and is not shown on the page it points to.
 */
export function useForYouHintVisible() {
  const ready = useForYouReady();
  const seen = useVisitorProfileStore((s) => s.forYouHintSeen);
  const onForYou = /^\/(en|de)\/for-you$/.test(usePathname());
  const due = ready && !seen && !onForYou;
  const covered = useOpenDialog(due);
  return due && !covered;
}

export function ForYouHint({
  visible,
  bottom,
  launcher,
}: {
  visible: boolean;
  bottom?: number;
  launcher: RefObject<HTMLElement | null>;
}) {
  const de = useLocale() === "de";
  const markSeen = useVisitorProfileStore((s) => s.markForYouHintSeen);
  const hint = useRef<HTMLDivElement>(null);
  const dismiss = () => {
    // The focused control is about to disappear; continue from the launcher.
    // Focus that is elsewhere, as after a click in Safari, stays where it is.
    if (hint.current?.contains(document.activeElement))
      launcher.current?.focus();
    markSeen();
  };
  return (
    // The region exists before its content, so the hint is announced when it appears.
    <div aria-live="polite" data-profile-ui>
      {visible && (
        <div
          ref={hint}
          role="group"
          aria-label={
            de ? "Hinweis zu deinem Profil" : "Hint about your profile"
          }
          className="profile-for-you-hint"
          style={{
            bottom:
              bottom === undefined
                ? undefined
                : `calc(${bottom}px + var(--profile-launcher-clearance))`,
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") dismiss();
          }}
        >
          <p>{de ? "Dein Profil ist bereit." : "Your profile is ready."}</p>
          <Link href="/for-you" prefetch={false} onClick={markSeen}>
            {de ? "Vorschläge ansehen" : "See your matches"}{" "}
            <span aria-hidden="true">→</span>
          </Link>
          <button
            type="button"
            aria-label={de ? "Hinweis schließen" : "Dismiss hint"}
            onClick={dismiss}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
    </div>
  );
}
