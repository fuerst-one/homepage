"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CvProject } from "@homepage/content/models";
import { parseKnowledgeConsent } from "@homepage/content/knowledgeConsent";
import { useLocale } from "../../i18n/LocaleProvider";
import {
  buildProjectSearchIndex,
  searchProjectIndex,
} from "../../PlasmaLanding/projectSearch";
import { useKnowledgeConsent } from "../../PlasmaLanding/useKnowledgeConsent";
import { filterProjects, type FilterParams } from "./Filter/utils";

export function useProjectListSearch(
  projects: CvProject[],
  filters: FilterParams,
  semanticEnabled: boolean,
) {
  const locale = useLocale();
  const consent = useKnowledgeConsent(semanticEnabled, "search");
  const [query, setInput] = useState("");
  const [semantic, setSemantic] = useState<{
    query: string;
    ids: string[];
  } | null>(null);
  const [status, setStatus] = useState<"idle" | "busy" | "complete" | "error">(
    "idle",
  );
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
      setStatus("idle");
    }
  }, [allowed]);
  useEffect(
    () => () => {
      pending.current?.abort();
    },
    [],
  );

  const results = useMemo(() => {
    const filtered = filterProjects(projects, filters);
    if (!query.trim()) return filtered;
    const matching = searchProjectIndex(
      index,
      query,
      undefined,
      allowed && semantic?.query === query.trim() ? semantic.ids : [],
    );
    const visible = new Map(filtered.map((project) => [project.id, project]));
    return matching.projects.flatMap((match) => {
      const project = visible.get(match.id);
      return project ? [project] : [];
    });
  }, [projects, filters, query, index, allowed, semantic]);

  function stop() {
    pending.current?.abort();
    pending.current = null;
    setStatus("idle");
  }
  function setQuery(value: string) {
    stop();
    setSemantic(null);
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
        body: JSON.stringify({ message, locale, consent: receipt }),
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
      setStatus("complete");
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
