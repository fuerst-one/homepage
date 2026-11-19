"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useProjectListStore } from "./projectListStore";
import { reconcileProjectUrl } from "./parseSearchParams";
import { useProjectFocusStore } from "./projectFocusStore";

export const FiltersUrlSync = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useProjectListStore((state) => state.filters);
  const setFilters = useProjectListStore((state) => state.setFilters);
  const focusedProjectId = useProjectFocusStore(
    (state) => state.focusedProjectId,
  );
  const setFocusedProjectId = useProjectFocusStore(
    (state) => state.setFocusedProjectId,
  );
  const sync = useRef<{ lastUrl: string | null; pendingUrl: string | null }>({
    lastUrl: null,
    pendingUrl: null,
  });
  useEffect(() => {
    const urlSearch = searchParams.toString();
    // A single writer keeps filter and dialog changes from cancelling each other.
    const action = reconcileProjectUrl({
      urlSearch,
      filters,
      focusedProjectId,
      ...sync.current,
    });
    if (action.type === "read") {
      sync.current = { lastUrl: urlSearch, pendingUrl: null };
      setFilters(action.filters);
      setFocusedProjectId(action.focusedProjectId);
    } else if (action.type === "write") {
      sync.current = { lastUrl: urlSearch, pendingUrl: action.search };
      router.replace(`${pathname}${action.search ? `?${action.search}` : ""}`, {
        scroll: false,
      });
    } else if (action.type === "accept") {
      sync.current = { lastUrl: urlSearch, pendingUrl: null };
    }
  }, [
    searchParams,
    filters,
    focusedProjectId,
    setFilters,
    setFocusedProjectId,
    pathname,
    router,
  ]);
  return null;
};
