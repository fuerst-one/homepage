"use client";

import Link from "next/link";
import { useLocale } from "../i18n/LocaleProvider";
import type { KnowledgeAction } from "@homepage/content/knowledge";
import type { KnowledgeTurn } from "./useKnowledgeAssistant";

export default function KnowledgeAssistant({
  turns,
  busy,
  error,
  pendingQuestion,
  onAction,
  onBack,
  onClear,
}: {
  turns: KnowledgeTurn[];
  busy: boolean;
  error: string;
  pendingQuestion: string;
  onAction: (action: KnowledgeAction) => void;
  onBack: () => void;
  onClear: () => void;
}) {
  const de = useLocale() === "de";
  return (
    <section
      className="knowledge-inline"
      aria-label={de ? "Projektgespräch" : "Project conversation"}
    >
      <header className="knowledge-heading">
        <span>{de ? "Aus meinen Projekten" : "From my work"}</span>
        <div className="knowledge-controls">
          <button type="button" className="knowledge-clear" onClick={onClear}>
            {de ? "Chat löschen" : "Clear chat"}
          </button>
          <button type="button" className="knowledge-back" onClick={onBack}>
            {de ? "Chat schließen ×" : "Close chat ×"}
          </button>
        </div>
      </header>
      <div
        className="knowledge-transcript"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {turns.map((turn, i) => (
          <article key={i} className="knowledge-turn">
            <p className="knowledge-question">{turn.question}</p>
            <p className="knowledge-answer">{turn.result.answer}</p>
            {!!turn.result.sources.length && (
              <nav
                className="knowledge-sources"
                aria-label={de ? "Quellen" : "Sources"}
              >
                {[
                  ...new Map(
                    turn.result.sources.map((s) => [s.href, s]),
                  ).values(),
                ].map((s) => (
                  <Link key={s.href} href={s.href} prefetch={false}>
                    {s.title} ↗
                  </Link>
                ))}
              </nav>
            )}
            {!!turn.result.actions.length && (
              <div className="knowledge-actions">
                {turn.result.actions.map((action, j) => (
                  <button
                    type="button"
                    key={j}
                    onClick={() => onAction(action)}
                  >
                    {action.type === "filter"
                      ? de
                        ? "Zeigen: "
                        : "Show: "
                      : ""}
                    {action.label} ↗
                  </button>
                ))}
              </div>
            )}
          </article>
        ))}
        {busy && (
          <article className="knowledge-turn">
            <p className="knowledge-question">{pendingQuestion}</p>
            <p role="status">
              {de ? "Suche passende Belege …" : "Finding relevant evidence…"}
            </p>
          </article>
        )}
        {error && (
          <p role="alert" className="knowledge-error">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
