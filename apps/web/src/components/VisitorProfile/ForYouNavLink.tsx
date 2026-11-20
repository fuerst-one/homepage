"use client";

import Link from "../i18n/LocalizedLink";
import { useLocale } from "../i18n/LocaleProvider";
import { useForYouReady } from "./useForYouReady";

export function ForYouNavLink() {
  const de = useLocale() === "de";
  const ready = useForYouReady();
  if (!ready) return null;
  return (
    <Link
      href="/for-you"
      prefetch={false}
      data-profile-ui
      className="content-header-for-you"
    >
      {de ? "Für dich" : "For you"}
    </Link>
  );
}
