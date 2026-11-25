"use client";

import { ProfileTopicChips } from "../../VisitorProfile/ProfileTopicChips";
import { useRef } from "react";
import { Search, X } from "lucide-react";
import { Button } from "../../Button";
import { useLocale } from "../../i18n/LocaleProvider";
import type { useProjectListSearch } from "./useProjectListSearch";

export function ProjectListSearch({
  search,
}: {
  search: ReturnType<typeof useProjectListSearch>;
}) {
  const de = useLocale() === "de";
  const semanticAllowed = search.semanticEnabled && !!search.consent.receipt;
  const status = semanticAllowed ? search.status : "idle";
  const input = useRef<HTMLInputElement>(null);
  const actAndFocus = (action: () => void) => {
    action();
    input.current?.focus();
  };
  return (
    <section
      aria-label={de ? "Projektsuche" : "Project search"}
      className="glass-panel mb-6 border border-white/20 p-5"
    >
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          search.search();
        }}
      >
        <label
          htmlFor="project-search"
          className="mb-3 block text-[0.65rem] uppercase tracking-[0.2em] text-neutral-400"
        >
          {de ? "Projekte durchsuchen" : "Search projects"}
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex h-14 min-w-0 flex-1 items-center border border-white/30 bg-black pl-4 transition focus-within:border-white focus-within:ring-1 focus-within:ring-white/20">
            <Search
              aria-hidden="true"
              size={18}
              strokeWidth={1.5}
              className="mr-3 shrink-0 text-neutral-400"
            />
            <input
              ref={input}
              id="project-search"
              type="search"
              value={search.query}
              maxLength={1000}
              autoComplete="off"
              aria-describedby="project-search-hint project-search-status"
              onChange={(event) => search.setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  search.setQuery("");
                }
              }}
              placeholder={
                de
                  ? "z. B. React, B2B SaaS, KI-Workflows"
                  : "e.g. React, B2B SaaS, AI workflows"
              }
              className="h-full w-full min-w-0 flex-1 bg-transparent py-3 pr-3 text-base text-white placeholder:text-neutral-500 focus:outline-none sm:text-sm [&::-webkit-search-cancel-button]:appearance-none"
            />
            {search.query && (
              <button
                data-project-search-clear
                type="button"
                onClick={() => actAndFocus(() => search.setQuery(""))}
                title={de ? "Suche löschen" : "Clear search"}
                className="m-1 flex h-11 w-11 shrink-0 items-center justify-center text-neutral-400 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <X aria-hidden="true" size={18} strokeWidth={1.5} />
                <span className="sr-only">
                  {de ? "Suche löschen" : "Clear search"}
                </span>
              </button>
            )}
          </div>
          {semanticAllowed && (
            <Button
              data-project-search-semantic
              type="submit"
              disabled={
                !search.query.trim() ||
                status === "busy" ||
                status === "complete"
              }
              className="min-h-14 w-full disabled:cursor-default disabled:opacity-40 sm:w-auto"
            >
              {status === "busy"
                ? de
                  ? "Suche läuft …"
                  : "Searching…"
                : de
                  ? "Nach Bedeutung suchen"
                  : "Search by meaning"}
            </Button>
          )}
        </div>
        <p
          id="project-search-hint"
          className="mt-3 text-xs leading-relaxed text-neutral-400"
        >
          {de
            ? "Suche im gesamten Portfolio nach einem Thema, einer Technologie oder deinem Vorhaben. Weitere gewählte Filter bleiben aktiv."
            : "Search the full portfolio by topic, technology or describe what you need. Other selected filters still apply."}
          {semanticAllowed && (
            <>
              {" "}
              {de
                ? "„Nach Bedeutung suchen“ erweitert die Ergebnisse mit KI im Rahmen deiner bestehenden Einwilligung."
                : "“Search by meaning” adds AI matches under your existing permission."}
            </>
          )}
        </p>
      </form>
      <ProfileTopicChips
        onSelect={(query) => actAndFocus(() => search.setQuery(query))}
      />
      <p
        id="project-search-status"
        role="status"
        aria-label={de ? "Suchergebnisse" : "Search results"}
        className={
          search.query.trim()
            ? "mt-3 text-xs leading-relaxed text-neutral-300"
            : "sr-only"
        }
      >
        {status === "busy"
          ? de
            ? "Suche nach verwandten Projekten … Lokale Treffer bleiben sichtbar."
            : "Looking for related projects… Local matches remain visible."
          : status === "error"
            ? de
              ? "Die KI-Suche ist gerade nicht verfügbar. Lokale Treffer werden weiterhin angezeigt."
              : "Semantic search is unavailable. Local matches are still shown."
            : search.query.trim()
              ? de
                ? `${search.results.length} passende Projekte${status === "complete" ? " · Bedeutungssuche einbezogen" : ""}`
                : `${search.results.length} matching projects${status === "complete" ? " · Semantic matches included" : ""}`
              : null}
      </p>
      {status === "busy" && (
        <button
          type="button"
          onClick={() => actAndFocus(search.stop)}
          className="min-h-11 text-sm underline underline-offset-4"
        >
          {de ? "Suche abbrechen" : "Cancel search"}
        </button>
      )}
      {semanticAllowed && (
        <button
          type="button"
          data-project-search-withdraw
          onClick={() => actAndFocus(search.revoke)}
          className="mt-1 min-h-11 text-xs text-neutral-400 underline underline-offset-4 hover:text-white"
        >
          {de ? "KI-Einwilligung widerrufen" : "Withdraw AI permission"}
        </button>
      )}
    </section>
  );
}
