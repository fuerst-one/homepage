"use client";

import { isForYouReady } from "@homepage/content/forYouReadiness";
import { useVisitorProfileStore } from "./profileStore";

/** Every "For you" surface asks here, so the condition can change in one place. */
export function useForYouReady() {
  return useVisitorProfileStore(
    (s) =>
      s.enabled &&
      !!s.catalog &&
      isForYouReady(
        s.profile,
        s.catalog,
        Math.max(Date.now(), s.profile.updatedAt),
      ),
  );
}
