"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ServiceAvailability } from "../../server/knowledge/serviceCircuit";
import {
  KNOWLEDGE_AVAILABILITY_KEY as KEY,
  parseKnowledgeConsent,
  type KnowledgeConsent,
} from "../../lib/knowledgeConsent";

const INITIAL: ServiceAvailability = {
  available: false,
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
export function useKnowledgeAvailability(
  enabled: boolean,
  consent: KnowledgeConsent | null,
  onEligibility: (eligible: boolean | undefined) => void,
) {
  const current = useRef(INITIAL);
  const [status, setStatus] = useState(INITIAL);
  const [eligibleUntil, setEligibleUntil] = useState(0);
  const version = useRef(0);
  const checking = useRef<AbortController | null>(null);
  const persist = useRef(false);
  persist.current = enabled && !!parseKnowledgeConsent(consent);
  const accept = useCallback((next: ServiceAvailability) => {
    if (next.available && !next.verified && !current.current.available) return;
    version.current++;
    current.current = next;
    setStatus(next);
    if (persist.current)
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
      if (
        value &&
        typeof value === "object" &&
        "eligible" in value &&
        value.eligible === false
      )
        onEligibility(false);
      accept({
        available: false,
        verified: false,
        retryAt: Math.min(
          Date.now() + 300_000,
          Math.max(Date.now() + 5000, reported?.retryAt || Date.now() + 30_000),
        ),
      });
    },
    [accept, onEligibility],
  );
  const refresh = useCallback(async () => {
    if (!enabled || checking.current) return;
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
      const payload = await response.json();
      const next = parseStatus(payload);
      if (
        !next ||
        typeof payload.eligible !== "boolean" ||
        (payload.eligible &&
          (!Number.isFinite(payload.eligibleUntil) ||
            payload.eligibleUntil <= Date.now()))
      )
        throw new Error("Invalid status");
      if (checking.current !== controller || revision !== version.current)
        return;
      onEligibility(payload.eligible);
      setEligibleUntil(payload.eligible ? payload.eligibleUntil : 0);
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
  }, [enabled, accept, fail, onEligibility]);
  useEffect(() => {
    if (!enabled) {
      onEligibility(undefined);
      setEligibleUntil(0);
      version.current++;
      current.current = INITIAL;
      setStatus(INITIAL);
      return;
    }
    if (persist.current)
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
  }, [enabled, consent, fail, refresh, onEligibility]);
  useEffect(() => {
    if (!enabled || status.available) return;
    const timer = setTimeout(
      () => {
        void refresh();
      },
      Math.max(5000, status.retryAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [enabled, consent, status, refresh]);
  useEffect(() => {
    if (!enabled || !eligibleUntil) return;
    const timer = setTimeout(
      () => {
        // A previous win is not authority for a new lottery window.
        onEligibility(undefined);
        setEligibleUntil(0);
        void refresh();
      },
      Math.max(0, eligibleUntil - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [enabled, eligibleUntil, onEligibility, refresh]);
  return {
    current,
    fail,
    recover: () => accept({ available: true, verified: true, retryAt: 0 }),
  };
}
