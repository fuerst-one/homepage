"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CvProject } from "@homepage/content/models";
import { parseKnowledgeConsent } from "@homepage/content/knowledgeConsent";
import { useLocale } from "../../i18n/LocaleProvider";
import { buildProjectSearchIndex } from "../../PlasmaLanding/projectSearch";
import { useKnowledgeConsent } from "../../PlasmaLanding/useKnowledgeConsent";
import { selectProjectResults, useProjectListStore } from "./projectListStore";

export function useProjectListSearch(
  projects: CvProject[],
  semanticEnabled: boolean,
) {
  const locale = useLocale();
  const consent = useKnowledgeConsent(semanticEnabled, "search");
  const filters = useProjectListStore((s) => s.filters);
  const cluster = useProjectListStore((s) => s.cluster);
  const query = useProjectListStore((s) => s.query);
  const semantic = useProjectListStore((s) => s.semantic);
  const status = useProjectListStore((s) => s.searchStatus);
  const setInput = useProjectListStore((s) => s.setQuery);
  const setSemantic = useProjectListStore((s) => s.setSemantic);
  const setStatus = useProjectListStore((s) => s.setSearchStatus);
  const setResultIds = useProjectListStore((s) => s.setResultIds);
  const resetListView = useProjectListStore((s) => s.resetListView);
  const pending = useRef<AbortController | null>(null);
  const index = useMemo(
    () =>
      buildProjectSearchIndex(
        projects.map((project) => ({
          ...project,
          oneLineSummary: project.description.rich_text
            .map((text) => text.plain_text)
            .join(" "),
          clientNames: project.clients.map((client) => client.name),
          webUrl: `/${locale}/projects/${project.id}`,
        })),
        locale,
      ),
    [projects, locale],
  );
  const allowed = semanticEnabled && !!consent.receipt;
  useEffect(() => {
    if (!allowed) {
      pending.current?.abort();
      pending.current = null;
      setSemantic(null);
    }
  }, [allowed, setSemantic]);
  useEffect(
    () => () => {
      pending.current?.abort();
      // The aborted request must not report an error into the store after the reset.
      pending.current = null;
      // Search text and cluster selection stay in page memory only.
      resetListView();
    },
    [resetListView],
  );

  const results = useMemo(
    () =>
      selectProjectResults({
        projects,
        index,
        filters,
        clusterIds: cluster?.ids,
        query,
        semanticIds:
          allowed && semantic?.query === query.trim() ? semantic.ids : [],
      }),
    [projects, filters, cluster, query, index, allowed, semantic],
  );
  const searchScope = useMemo(
    () =>
      selectProjectResults({
        projects,
        index,
        filters: {},
        clusterIds: cluster?.ids,
        query,
        semanticIds:
          allowed && semantic?.query === query.trim() ? semantic.ids : [],
      }),
    [projects, index, cluster, query, allowed, semantic],
  );
  useEffect(() => {
    setResultIds(results.map((project) => project.id));
  }, [results, setResultIds]);

  function stop() {
    pending.current?.abort();
    pending.current = null;
    setStatus("idle");
  }
  function setQuery(value: string) {
    pending.current?.abort();
    pending.current = null;
    setInput(value);
  }
  async function search() {
    const message = query.trim();
    const receipt = parseKnowledgeConsent(
      consent.receipt,
      Date.now(),
      "search",
    );
    if (
      !semanticEnabled ||
      !receipt ||
      !message ||
      pending.current ||
      (status === "complete" && semantic?.query === message)
    )
      return;
    const controller = new AbortController();
    pending.current = controller;
    setStatus("busy");
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch("/api/projects/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query, locale, consent: receipt }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Semantic project search unavailable");
      const data = await response.json();
      if (
        !Array.isArray(data.projectIds) ||
        data.projectIds.length > 100 ||
        !data.projectIds.every((id: unknown) => typeof id === "string")
      )
        throw new Error("Invalid project search results");
      if (pending.current !== controller || controller.signal.aborted) return;
      setSemantic({ query: message, ids: data.projectIds });
    } catch {
      if (pending.current === controller) setStatus("error");
    } finally {
      clearTimeout(timer);
      if (pending.current === controller) pending.current = null;
    }
  }
  return {
    query,
    setQuery,
    results,
    searchScope,
    status,
    semanticEnabled,
    consent,
    stop,
    search: () => {
      void search();
    },
    revoke: () => {
      stop();
      setSemantic(null);
      consent.revoke();
    },
  };
}
