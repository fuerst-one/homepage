"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { AtlasProject } from "./model";
import type { ScaleField } from "./scaleSpace";
import { createScaleSpaceCache, scaleSpaceKey } from "./scaleSpaceCache";

const cache = createScaleSpaceCache(
  () =>
    new Worker(new URL("./scaleSpace.worker.ts", import.meta.url), {
      type: "module",
    }),
);
const serverSnapshot = () => undefined;

/** Warm the numeric lens regardless of the visible tab; revisits read the same fit. */
export function useScaleSpace(projects: AtlasProject[], fields: ScaleField[]) {
  const key = useMemo(
    () => scaleSpaceKey(projects, fields),
    [projects, fields],
  );
  const subscribe = useCallback(
    (notify: () => void) => cache.subscribe(key, notify),
    [key],
  );
  const snapshot = useCallback(() => cache.read(key), [key]);
  const current = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return {
    result: current?.result,
    error: current?.error,
    pending: !current,
  };
}
