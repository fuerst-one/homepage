"use client";

import Link from "next/link";
import { localizedLinkPath } from "@homepage/content/i18n";
import { useLocale } from "./LocaleProvider";

export default function LocalizedLink({
  href,
  ...props
}: React.ComponentProps<typeof Link>) {
  const locale = useLocale();
  // Explicit locale links include intentional fallbacks and language switches.
  const localized =
    typeof href === "string" ? localizedLinkPath(href, locale) : href;
  return <Link href={localized} {...props} />;
}
