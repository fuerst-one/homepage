"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "../i18n/LocalizedLink";
import { useLocale } from "../i18n/LocaleProvider";

export default function KnowledgeConsentDialog({
  onCancel,
  onDecline,
  onAllow,
}: {
  onCancel: () => void;
  onDecline: () => void;
  onAllow: (remember: boolean) => void;
}) {
  const de = useLocale() === "de";
  const [remember, setRemember] = useState(false);
  const cancel = useRef<HTMLButtonElement>(null);
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm" />
        <Dialog.Content
          data-ai-consent
          className="fixed left-1/2 top-1/2 z-[101] flex max-h-[90svh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden border border-white/30 bg-[#10100f] p-6 text-sm leading-relaxed text-neutral-200 shadow-2xl sm:p-8"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancel.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            document.getElementById("landing-command")?.focus();
          }}
        >
          <Dialog.Title className="mb-4 shrink-0 text-lg text-white">
            {de ? "Eine Frage an die KI?" : "Ask the AI assistant?"}
          </Dialog.Title>
          <div className="min-h-0 overflow-y-auto pr-1">
            <Dialog.Description className="text-neutral-300">
              {de
                ? "Deine Frage wurde noch nicht gesendet. Wenn du einwilligst, senden wir sie und die Seitensprache über OpenRouter an OpenAI für die Suche und Antwort (beide USA). Relevante öffentliche Projektauszüge werden mitgesendet; frühere Nachrichten nicht. Dabei kann eine Verarbeitung außerhalb der EU stattfinden."
                : "Your question has not been sent. If you agree, we send it and the site language through OpenRouter to OpenAI for retrieval and an answer (both USA). Relevant public project excerpts are included; earlier messages are not. Processing may take place outside the EU."}
            </Dialog.Description>
            <p className="mt-4 text-neutral-400">
              {de
                ? "Freiwillig. Wir merken Erlaubnis oder Ablehnung für sechs Monate in diesem Browser, bis du die Wahl änderst oder sich der Hinweis ändert. Widerrufe jederzeit über „KI-Einwilligung widerrufen“ unter dem Eingabefeld. Das stoppt weitere KI-Anfragen und löscht lokale Chatdaten; bereits übermittelte Daten können nicht zurückgeholt werden. Bitte keine vertraulichen oder sensiblen Angaben senden. KI kann sich irren. Die Projektsuche funktioniert auch ohne KI."
                : "Optional. We remember allow or decline for six months in this browser, until you change your choice or this notice changes. Withdraw at any time using “Withdraw AI permission” below the input. This stops further AI requests and clears local chat data; data already sent cannot be recalled. Leave out confidential or sensitive information. AI can make mistakes. Project search works without AI."}
            </p>
            <label className="mt-5 flex min-h-11 cursor-pointer items-start gap-3 border border-white/20 p-3">
              <input
                id="remember-ai-chat"
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-[#dfc993]"
              />
              <span>
                {de
                  ? "Zusätzlich den Chat in diesem Tab merken: bis zu fünf Antworten und meine Fragen, bis zwei Stunden nach der letzten Antwort. Ohne Auswahl bleibt er nur auf dieser Seite."
                  : "Also remember chat in this tab: up to five answers and my questions, until two hours after the last answer. Otherwise it stays only on this page."}
              </span>
            </label>
            <Link
              href={de ? "/datenschutz#ai-assistant" : "/privacy#ai-assistant"}
              prefetch={false}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center underline underline-offset-4"
            >
              {de
                ? "Datenverarbeitung und deine Rechte ↗"
                : "Data processing and your rights ↗"}
            </Link>
          </div>
          <div className="mt-4 flex shrink-0 flex-wrap gap-3">
            <button
              ref={cancel}
              data-ai-decline
              type="button"
              onClick={onDecline}
              className="min-h-11 flex-1 border border-white/40 px-4 py-3 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#dfc993]"
            >
              {de ? "Ohne KI weitermachen" : "Continue without AI"}
            </button>
            <button
              data-ai-allow
              type="button"
              onClick={() => onAllow(remember)}
              className="min-h-11 flex-1 border border-white/40 px-4 py-3 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#dfc993]"
            >
              {de ? "KI erlauben und senden" : "Allow AI and send"}
            </button>
          </div>
          <button
            data-ai-cancel
            type="button"
            onClick={onCancel}
            className="mt-3 min-h-11 shrink-0 underline underline-offset-4"
          >
            {de
              ? "Schließen, noch nicht entscheiden"
              : "Close without deciding"}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
