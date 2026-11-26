"use client";

import { useEffect } from "react";
import type { ClickInteraction } from "../../server/analytics/interactionEvents";

const ENDPOINT = "/api/analytics/events";
const DEMO_ATTRIBUTE = "data-analytics-demo";
const FILE_EXTENSION = /\.([a-z0-9]{1,8})$/i;

type AnchorLike = { href: string; download: string };

export function clickInteraction(
  anchor: AnchorLike,
  pageHost: string,
): ClickInteraction | null {
  let url: URL;
  try {
    url = new URL(anchor.href);
  } catch {
    return null;
  }
  if (anchor.download) {
    const file = FILE_EXTENSION.exec(anchor.download)?.[1]?.toLowerCase();
    return file ? { name: "download", data: { file } } : null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.host === pageHost) return null;
  return { name: "outbound", data: { url: url.origin + url.pathname } };
}

function send(interaction: ClickInteraction) {
  // keepalive lets the request finish when an outbound click leaves the page.
  fetch(ENDPOINT, {
    method: "POST",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(interaction),
  }).catch(() => {});
}

/** Counts outbound links, downloads and explorer use; renders nothing. */
export function InteractionTracker() {
  useEffect(() => {
    const privacy = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (privacy.globalPrivacyControl) return;

    let page = location.pathname;
    const usedDemos = new Set<string>();

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const interaction = clickInteraction(anchor, location.host);
      if (interaction) send(interaction);
    };
    const onDemoUse = (event: Event) => {
      const demo = (event.target as Element | null)
        ?.closest?.(`[${DEMO_ATTRIBUTE}]`)
        ?.getAttribute(DEMO_ATTRIBUTE);
      if (demo !== "explorer") return;
      if (location.pathname !== page) {
        page = location.pathname;
        usedDemos.clear();
      }
      if (usedDemos.has(demo)) return;
      usedDemos.add(demo);
      send({ name: "explorer-used", data: { demo } });
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerdown", onDemoUse, true);
    document.addEventListener("keydown", onDemoUse, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerdown", onDemoUse, true);
      document.removeEventListener("keydown", onDemoUse, true);
    };
  }, []);
  return null;
}
