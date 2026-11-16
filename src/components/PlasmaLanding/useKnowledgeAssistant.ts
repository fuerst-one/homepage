"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "../i18n/LocaleProvider";
import type { KnowledgeAnswer } from "../../lib/knowledge";
import { knowledgeFallback } from "../../lib/knowledgeFallback";
import { useKnowledgeAvailability } from "./useKnowledgeAvailability";
import {
  parseKnowledgeConsent,
  type KnowledgeConsent,
} from "../../lib/knowledgeConsent";

import {
  KNOWLEDGE_HISTORY_KEY,
  KNOWLEDGE_HISTORY_TTL,
  restoreKnowledgeHistory,
  type KnowledgeTurn,
} from "../../lib/knowledgeHistory";
export type { KnowledgeTurn } from "../../lib/knowledgeHistory";
export function useKnowledgeAssistant(
  enabled = true,
  consent: KnowledgeConsent | null = null,
) {
  const de = useLocale() === "de";
  const locale = de ? "de" : "en";
  const [turns, setTurns] = useState<KnowledgeTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const allowed = enabled && !!consent;
  const remember = consent?.remember ?? false;
  const availability = useKnowledgeAvailability(enabled, consent);
  const [pendingQuestion, setPendingQuestion] = useState("");
  const pending = useRef<AbortController | null>(null);
  const currentTurns = useRef<KnowledgeTurn[]>([]);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const discardHistory = () => {
    currentTurns.current = [];
    setTurns([]);
    setSavedAt(null);
    try {
      sessionStorage.removeItem(KNOWLEDGE_HISTORY_KEY);
    } catch {
      /* Storage may be disabled. */
    }
  };
  useEffect(() => {
    if (!allowed) {
      currentTurns.current = [];
      setTurns([]);
      setSavedAt(null);
      setBusy(false);
      setPendingQuestion("");
      return;
    }
    if (remember)
      try {
        const saved = restoreKnowledgeHistory(
          sessionStorage.getItem(KNOWLEDGE_HISTORY_KEY),
        );
        if (saved) {
          currentTurns.current = saved.turns;
          setTurns(saved.turns);
          setSavedAt(saved.savedAt);
        } else {
          currentTurns.current = [];
          setTurns([]);
          setSavedAt(null);
          sessionStorage.removeItem(KNOWLEDGE_HISTORY_KEY);
        }
      } catch {
        /* Continue with in-memory history if storage is unavailable. */
      }
    return () => {
      pending.current?.abort();
      pending.current = null;
    };
  }, [allowed, remember]);
  useEffect(() => {
    if (savedAt === null) return;
    const timer = setTimeout(
      discardHistory,
      Math.max(0, savedAt + KNOWLEDGE_HISTORY_TTL - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [savedAt]);
  function append(question: string, result: KnowledgeAnswer) {
    const next = [...currentTurns.current.slice(-4), { question, result }];
    const timestamp = Date.now();
    currentTurns.current = next;
    setTurns(next);
    setSavedAt(timestamp);
    if (remember)
      try {
        sessionStorage.setItem(
          KNOWLEDGE_HISTORY_KEY,
          JSON.stringify({ version: 1, savedAt: timestamp, turns: next }),
        );
      } catch {
        /* The current conversation still works without storage. */
      }
  }
  async function ask(input: string, fallback = knowledgeFallback(locale)) {
    const question = input.trim();
    if (
      !allowed ||
      !parseKnowledgeConsent(consent) ||
      !question ||
      pending.current
    )
      return false;
    if (!availability.current.current.available) {
      append(question, fallback);
      return true;
    }
    const controller = new AbortController();
    pending.current = controller;
    const timeout = setTimeout(() => controller.abort("timeout"), 9000);
    setPendingQuestion(question);
    setBusy(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, locale, consent }),
        signal: controller.signal,
      });
      if (pending.current !== controller || controller.signal.reason === "user")
        return false;
      if (!response.ok) {
        if (response.status !== 429) availability.fail();
        append(question, fallback);
        return true;
      }
      const result = await response.json();
      if (pending.current !== controller || controller.signal.reason === "user")
        return false;
      if (result.mode === "fallback") {
        if (result.availability?.available === false)
          availability.fail(result.availability);
        append(question, fallback);
      } else {
        if (
          typeof result.answer !== "string" ||
          !result.answer.trim() ||
          !Array.isArray(result.sources) ||
          !Array.isArray(result.actions)
        )
          throw new Error("Invalid answer");
        if (result.availability?.available === false)
          availability.fail(result.availability);
        else availability.recover();
        append(question, {
          answer: result.answer,
          sources: result.sources,
          actions: result.actions,
        });
      }
      return true;
    } catch {
      if (pending.current !== controller || controller.signal.reason === "user")
        return false;
      availability.fail();
      append(question, fallback);
      return true;
    } finally {
      clearTimeout(timeout);
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
        setPendingQuestion("");
      }
    }
  }

  return {
    available:
      availability.current.current.available &&
      availability.current.current.verified,
    suggest: (question: string, fallback: KnowledgeAnswer) =>
      append(question, fallback),
    turns,
    busy,
    error: "",
    pendingQuestion,
    ask,
    stop: () => pending.current?.abort("user"),
    clear: () => {
      pending.current?.abort();
      pending.current = null;
      setBusy(false);
      setPendingQuestion("");
      discardHistory();
    },
  };
}
