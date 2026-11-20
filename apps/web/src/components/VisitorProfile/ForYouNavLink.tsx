"use client";

import { usePathname } from "next/navigation";
import { localizedLinkPath } from "@homepage/content/i18n";
import Link from "../i18n/LocalizedLink";
import { useLocale } from "../i18n/LocaleProvider";
import { useForYouReady } from "./useForYouReady";

export function ForYouNavLink() {
  const locale = useLocale();
  const de = locale === "de";
  const ready = useForYouReady();
  const pathname = usePathname();
  if (!ready) return null;
  return (
    <Link
      href="/for-you"
      prefetch={false}
      data-profile-ui
      aria-current={
        pathname === localizedLinkPath("/for-you", locale) ? "page" : undefined
      }
      className="content-header-for-you"
    >
      {de ? "Für dich" : "For you"}
    </Link>
  );
}
