"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { useLocale } from "./i18n/LocaleProvider";

const PrivacySettingsDialog = dynamic(() => import("./PrivacySettingsDialog"), {
  ssr: false,
});

export function PrivacySettings() {
  const de = useLocale() === "de";
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        data-privacy-settings
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {de ? "Datenschutzeinstellungen" : "Privacy settings"}
      </button>
      {open && (
        <PrivacySettingsDialog
          onClose={() => setOpen(false)}
          restoreFocus={() => trigger.current?.focus()}
        />
      )}
    </>
  );
}
