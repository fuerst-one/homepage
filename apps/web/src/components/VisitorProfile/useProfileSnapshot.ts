"use client";

import { useEffect, useMemo, useState } from "react";
import { profileInterests } from "@homepage/content/visitorProfile";
import { useVisitorProfileStore } from "./profileStore";

export function useProfileSnapshot() {
  const profile = useVisitorProfileStore((s) => s.profile);
  const catalog = useVisitorProfileStore((s) => s.catalog);
  const enabled = useVisitorProfileStore((s) => s.enabled);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [enabled]);
  const snapshotAt = Math.max(now, profile.updatedAt);
  const interests = useMemo(
    () =>
      enabled && catalog ? profileInterests(profile, catalog, snapshotAt) : [],
    [enabled, profile, catalog, snapshotAt],
  );
  return { profile, catalog, interests, snapshotAt };
}
