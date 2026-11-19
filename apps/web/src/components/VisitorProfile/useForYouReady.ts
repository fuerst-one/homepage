"use client";

import { useVisitorProfileStore } from "./profileStore";

/** Every "For you" surface asks here, so the condition can change in one place. */
export function useForYouReady() {
  return useVisitorProfileStore((s) => s.enabled && s.forYouUnlocked);
}
