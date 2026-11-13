"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { useEffect, useState } from "react";
import { buildProjectSearchIndex, ProjectSearchIndex } from "./projectSearch";

export const useProjectSearch = (enabled: boolean) => {
  const locale = useLocale();
  const [index, setIndex] = useState<ProjectSearchIndex | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || index) return;
    const controller = new AbortController();
    setError(false);
    void fetch(`/api/projects?locale=${locale}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Project search unavailable");
        const data = await response.json();
        const next = buildProjectSearchIndex(data.results, locale);
        if (!controller.signal.aborted) {
          setIndex(next);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(true);
        }
      });
    return () => controller.abort();
  }, [enabled, index, attempt, locale]);

  return {
    index,
    loading: enabled && !index && !error,
    error,
    retry: () => {
      setError(false);
      setAttempt((value) => value + 1);
    },
  };
};
