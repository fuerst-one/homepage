"use client";

import { FOR_YOU_ENABLED } from "../../lib/forYouEnabled";
import { useVisitorProfileStore } from "./profileStore";

/** Every "For you" surface asks here, so the condition can change in one place. */
export function useForYouReady() {
  return useVisitorProfileStore(
    (s) => FOR_YOU_ENABLED && s.enabled && s.forYouUnlocked,
  );
}
