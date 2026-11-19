"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KNOWLEDGE_AVAILABILITY_KEY,
  KNOWLEDGE_CONSENT_ASKED_KEY,
  KNOWLEDGE_CONSENT_KEY,
  KNOWLEDGE_CONSENT_VERSION,
  KNOWLEDGE_CONSENT_CHANGE_EVENT,
  parseKnowledgeConsent,
  parseKnowledgeDecision,
  type KnowledgeDecision,
  type KnowledgePurpose,
} from "../../lib/knowledgeConsent";
import { KNOWLEDGE_HISTORY_KEY } from "../../lib/knowledgeHistory";

function askedThisSession() {
  try {
    return sessionStorage.getItem(KNOWLEDGE_CONSENT_ASKED_KEY) !== null;
  } catch {
    return false;
  }
}
function rememberAsked(asked: boolean) {
  try {
    if (asked) sessionStorage.setItem(KNOWLEDGE_CONSENT_ASKED_KEY, "1");
    else sessionStorage.removeItem(KNOWLEDGE_CONSENT_ASKED_KEY);
  } catch {
    /* The marker then lasts only on this page. */
  }
}

export function useKnowledgeConsent(
  enabled: boolean | undefined,
  purpose: KnowledgePurpose = "assistant",
) {
  const [receipt, setReceipt] = useState<KnowledgeDecision | null>(null);
  // A refusal is questioned at most once per browser session, never on every submit.
  const [asked, setAsked] = useState(false);
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
    setAsked(false);
    clearChat();
    rememberAsked(false);
    try {
      localStorage.removeItem(KNOWLEDGE_CONSENT_KEY);
    } catch {
      /* Optional persistence. */
    }
  }, [clearChat]);
  useEffect(() => {
    // Do not touch a saved decision until the server has resolved eligibility.
    if (enabled === undefined) return;
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
        if (askedThisSession()) setAsked(true);
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
    const changedHere = (event: Event) => {
      const saved = parseKnowledgeDecision((event as CustomEvent).detail);
      if (!saved?.allowed) clearChat();
      setReceipt(saved);
      if (askedThisSession()) setAsked(true);
    };
    window.addEventListener("storage", changed);
    window.addEventListener(KNOWLEDGE_CONSENT_CHANGE_EVENT, changedHere);
    return () => {
      window.removeEventListener("storage", changed);
      window.removeEventListener(KNOWLEDGE_CONSENT_CHANGE_EVENT, changedHere);
    };
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
    // Withdrawal must also work in the global settings panel without AI admission.
    if (allowed && !enabled) return;
    if (!allowed) clearChat();
    // A refusal or withdrawal made now is this session's answer.
    rememberAsked(!allowed);
    setAsked(!allowed);
    const next = {
      version: KNOWLEDGE_CONSENT_VERSION,
      decidedAt: Date.now(),
      allowed,
      remember,
      ...(allowed && purpose === "search" ? { scope: "search" as const } : {}),
    };
    setReceipt(next);
    try {
      localStorage.setItem(KNOWLEDGE_CONSENT_KEY, JSON.stringify(next));
    } catch {
      /* Choice lasts only on this page when storage is blocked. */
    }
    window.dispatchEvent(
      new CustomEvent(KNOWLEDGE_CONSENT_CHANGE_EVENT, { detail: next }),
    );
    return next;
  };
  return {
    receipt: parseKnowledgeConsent(receipt, Date.now(), purpose),
    declined: receipt?.allowed === false,
    reaskable: receipt?.allowed === false && !asked,
    markAsked: () => {
      rememberAsked(true);
      setAsked(true);
    },
    forget,
    revoke: () => choose(false),
    allow: (remember: boolean) => choose(true, remember),
  };
}
