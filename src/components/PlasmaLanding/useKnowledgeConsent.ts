"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KNOWLEDGE_AVAILABILITY_KEY,
  KNOWLEDGE_CONSENT_KEY,
  KNOWLEDGE_CONSENT_VERSION,
  parseKnowledgeConsent,
  parseKnowledgeDecision,
  type KnowledgeDecision,
} from "../../lib/knowledgeConsent";
import { KNOWLEDGE_HISTORY_KEY } from "../../lib/knowledgeHistory";

export function useKnowledgeConsent(enabled: boolean) {
  const [receipt, setReceipt] = useState<KnowledgeDecision | null>(null);
  const clearChat = useCallback(() => {
    for (const key of [KNOWLEDGE_HISTORY_KEY, KNOWLEDGE_AVAILABILITY_KEY]) {
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* Memory-only mode still works. */
      }
    }
  }, []);
  const forget = useCallback(() => {
    setReceipt(null);
    clearChat();
    try {
      localStorage.removeItem(KNOWLEDGE_CONSENT_KEY);
    } catch {
      /* Optional persistence. */
    }
  }, [clearChat]);
  useEffect(() => {
    if (!enabled) {
      forget();
      return;
    }
    try {
      const saved = parseKnowledgeDecision(
        JSON.parse(localStorage.getItem(KNOWLEDGE_CONSENT_KEY) || "null"),
      );
      if (saved) {
        if (!saved.allowed) clearChat();
        setReceipt(saved);
      } else forget();
    } catch {
      forget();
    }
    const changed = (event: StorageEvent) => {
      if (event.key !== KNOWLEDGE_CONSENT_KEY && event.key !== null) return;
      let saved: KnowledgeDecision | null = null;
      try {
        saved = parseKnowledgeDecision(
          JSON.parse(localStorage.getItem(KNOWLEDGE_CONSENT_KEY) || "null"),
        );
      } catch {
        /* No valid saved choice. */
      }
      if (!saved?.allowed) clearChat();
      setReceipt(saved);
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [enabled, forget, clearChat]);
  useEffect(() => {
    if (!receipt) return;
    const expire = () => {
      if (!parseKnowledgeDecision(receipt)) forget();
    };
    // Avoid overflowing browser timers with a six-month delay.
    const timer = setInterval(expire, 60_000);
    window.addEventListener("focus", expire);
    document.addEventListener("visibilitychange", expire);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", expire);
      document.removeEventListener("visibilitychange", expire);
    };
  }, [receipt, forget]);
  const choose = (allowed: boolean, remember = false) => {
    if (!enabled) return;
    if (!allowed) clearChat();
    const next = {
      version: KNOWLEDGE_CONSENT_VERSION,
      decidedAt: Date.now(),
      allowed,
      remember,
    };
    setReceipt(next);
    try {
      localStorage.setItem(KNOWLEDGE_CONSENT_KEY, JSON.stringify(next));
    } catch {
      /* Choice lasts only on this page when storage is blocked. */
    }
  };
  return {
    receipt: parseKnowledgeConsent(receipt),
    declined: receipt?.allowed === false,
    forget,
    revoke: () => choose(false),
    allow: (remember: boolean) => choose(true, remember),
  };
}
