import { useMemo } from "react";
import { useLocale } from "../i18n/LocaleProvider";
import { atlasText, atlasTerm } from "./atlasCopy";

export function useAtlasCopy() {
  const locale = useLocale();
  return useMemo(
    () => ({
      locale,
      t: (text: string) => atlasText(locale, text),
      term: (text: string) => atlasTerm(locale, text),
    }),
    [locale],
  );
}
