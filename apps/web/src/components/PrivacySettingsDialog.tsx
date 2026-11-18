"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRef } from "react";
import { useLocale } from "./i18n/LocaleProvider";
import Link from "./i18n/LocalizedLink";
import { useKnowledgeConsent } from "./PlasmaLanding/useKnowledgeConsent";
import { useVisitorProfileStore } from "./VisitorProfile/profileStore";

export default function PrivacySettingsDialog({
  onClose,
  restoreFocus,
}: {
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const de = useLocale() === "de";
  // Do not restore or reset consent on opening; memory-only choices may be active.
  const consent = useKnowledgeConsent(undefined);
  const profile = useVisitorProfileStore();
  const navigating = useRef(false);
  const closeForNavigation = () => {
    navigating.current = true;
    onClose();
  };
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[101] max-h-[90svh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-white/30 bg-[#10100f] p-6 text-sm leading-relaxed text-neutral-200 shadow-2xl sm:p-8"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (!navigating.current) restoreFocus();
          }}
        >
          <Dialog.Title className="mb-4 text-lg text-white">
            {de ? "Datenschutzeinstellungen" : "Privacy settings"}
          </Dialog.Title>
          <Dialog.Description className="text-neutral-400">
            {de
              ? "Verwalte deine freiwilligen Einstellungen in diesem Browser."
              : "Manage your optional choices in this browser."}
          </Dialog.Description>
          <section
            className="mt-6 border-t border-white/20 pt-5"
            aria-label={de ? "KI-Einwilligung" : "AI permission"}
          >
            <p className="text-white">
              {de
                ? "KI-Assistent und Bedeutungssuche"
                : "AI assistant and semantic search"}
            </p>
            <p className="mt-2" role="status">
              {consent.declined
                ? de
                  ? "KI-Einwilligung widerrufen. Lokale Chatdaten wurden gelöscht."
                  : "AI permission withdrawn. Local chat data cleared."
                : de
                  ? "Hier kannst du eine bestehende KI-Einwilligung widerrufen."
                  : "You can withdraw an existing AI permission here."}
            </p>
            <button
              type="button"
              data-privacy-withdraw
              disabled={consent.declined}
              onClick={consent.revoke}
              className="mt-4 min-h-11 border border-white/40 px-4 py-2 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#dfc993] disabled:cursor-default disabled:opacity-50"
            >
              {de ? "KI-Einwilligung widerrufen" : "Withdraw AI permission"}
            </button>
            <p className="mt-3 text-xs text-neutral-400">
              {de
                ? "Ein Widerruf stoppt weitere KI-Anfragen und löscht lokale Chatdaten. Bereits übermittelte Daten können nicht zurückgeholt werden. Wenn KI verfügbar ist, kannst du auf der Startseite vor einer KI-Frage einwilligen. Die Bedeutungssuche in der Projektliste ist nur mit gültiger Einwilligung sichtbar. Eine Erlaubnis nur für die Suche erlaubt keine KI-Antworten."
                : "Withdrawal stops further AI requests and clears local chat data. Data already sent cannot be recalled. When AI is available, you can grant permission before asking an AI question on the homepage. Semantic search in the project list is only visible with valid permission. Search-only permission does not allow AI answers."}
            </p>
          </section>
          <p className="mt-5 text-xs text-neutral-400">
            {de ? "Live-Interessenprofil: " : "Live interest profile: "}
            {profile.enabled
              ? de
                ? "aktiv"
                : "active"
              : de
                ? "aus"
                : "off"}.{" "}
            <Link
              href="/profile"
              onNavigate={closeForNavigation}
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              {de
                ? "Profil und Einstellungen öffnen"
                : "Open profile and settings"}
            </Link>
            {profile.enabled && (
              <button
                type="button"
                className="block min-h-11 underline underline-offset-4"
                onClick={() => void profile.stop()}
              >
                {de
                  ? "Profil stoppen und Daten löschen"
                  : "Stop profile and erase data"}
              </button>
            )}
            {profile.network === "delete-error" && (
              <span role="alert">
                {de
                  ? "Geteilte Daten konnten noch nicht gelöscht werden. "
                  : "Shared data could not yet be erased. "}
                <button
                  type="button"
                  className="min-h-11 underline"
                  onClick={() => void profile.deleteShared()}
                >
                  {de ? "Löschen erneut versuchen" : "Retry erasure"}
                </button>
              </span>
            )}
          </p>
          <p className="mt-5 text-xs text-neutral-400">
            {de
              ? "Das optionale Speichern der Darstellung verwaltest du im "
              : "Manage optional visual preference storage in the "}
            <Link
              href="/plasma"
              onNavigate={closeForNavigation}
              className="underline underline-offset-4"
            >
              {de ? "Plasma-Spielplatz" : "plasma playground"}
            </Link>
            .
          </p>
          <Dialog.Close className="mt-6 min-h-11 border border-white/40 px-4 py-2 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#dfc993]">
            {de ? "Schließen" : "Close"}
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
