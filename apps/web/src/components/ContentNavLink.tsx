"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { localizedLinkPath } from "@homepage/content/i18n";
import Link from "./i18n/LocalizedLink";
import { useLocale } from "./i18n/LocaleProvider";

export function ContentNavLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const locale = useLocale();
  const destination = localizedLinkPath(href, locale);
  const current =
    pathname === destination
      ? "page"
      : pathname.startsWith(`${destination}/`)
        ? "location"
        : undefined;

  return (
    <Link href={href} aria-current={current} className="hover:text-white">
      {children}
    </Link>
  );
}
