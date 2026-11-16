"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ServiceAvailability } from "../../server/knowledge/serviceCircuit";

const KEY = "fuerst-one:knowledge-availability:v1";
const INITIAL: ServiceAvailability = {
  available: true,
  verified: false,
  retryAt: 0,
};
function parseStatus(value: unknown): ServiceAvailability | null {
  if (!value || typeof value !== "object") return null;
  const status = value as ServiceAvailability;
  return typeof status.available === "boolean" &&
    typeof status.verified === "boolean" &&
    Number.isFinite(status.retryAt)
    ? status
    : null;
}

/** Remember an outage across navigation; only verified recovery removes the latch. */
export function useKnowledgeAvailability(enabled = true) {
  const current = useRef(INITIAL);
  const [status, setStatus] = useState(INITIAL);
  const version = useRef(0);
  const checking = useRef<AbortController | null>(null);
  const accept = useCallback((next: ServiceAvailability) => {
    if (next.available && !next.verified && !current.current.available) return;
    version.current++;
    current.current = next;
    setStatus(next);
    try {
      if (next.available) sessionStorage.removeItem(KEY);
      else sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* Availability still works in memory without storage. */
    }
  }, []);
  const fail = useCallback(
    (value?: unknown) => {
      const reported = parseStatus(value);
      accept({
        available: false,
        verified: false,
        retryAt: Math.min(
          Date.now() + 300_000,
          Math.max(Date.now() + 5000, reported?.retryAt || Date.now() + 30_000),
        ),
      });
    },
    [accept],
  );
  const refresh = useCallback(async () => {
    if (checking.current) return;
    const controller = new AbortController();
    checking.current = controller;
    const revision = version.current;
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(
        `/api/assistant/status${current.current.available ? "" : "?recover=1"}`,
        {
          cache: "no-store",
          signal: controller.signal,
        },
      );
      if (!response.ok) throw new Error("Status request failed");
      const next = parseStatus(await response.json());
      if (!next) throw new Error("Invalid status");
      if (checking.current !== controller || revision !== version.current)
        return;
      // A new server instance may not have tested its dependencies yet.
      if (next.available && !next.verified && !current.current.available)
        fail({ retryAt: Date.now() + 5000, available: false, verified: false });
      else if (!next.available) fail(next);
      else accept(next);
    } catch {
      if (checking.current === controller && revision === version.current)
        fail();
    } finally {
      clearTimeout(timeout);
      if (checking.current === controller) checking.current = null;
    }
  }, [accept, fail]);
  useEffect(() => {
    if (!enabled) return;
    try {
      const saved = parseStatus(
        JSON.parse(sessionStorage.getItem(KEY) || "null"),
      );
      if (saved && !saved.available) fail(saved);
    } catch {
      /* Ignore invalid or inaccessible storage. */
    }
    void refresh();
    const online = () => {
      void refresh();
    };
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("online", online);
      checking.current?.abort();
      checking.current = null;
    };
  }, [enabled, fail, refresh]);
  useEffect(() => {
    if (!enabled || status.available) return;
    const timer = setTimeout(
      () => {
        void refresh();
      },
      Math.max(5000, status.retryAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [enabled, status, refresh]);
  return {
    current,
    fail,
    recover: () => accept({ available: true, verified: true, retryAt: 0 }),
  };
}
