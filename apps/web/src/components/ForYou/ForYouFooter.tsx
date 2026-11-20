import Link from "next/link";
import { localizedPath, type Locale } from "@homepage/content/i18n";

/** Written by the site, never by the plan, so it stays the same on every page. */
export function ForYouFooter({ locale }: { locale: Locale }) {
  const de = locale === "de";
  return (
    <footer className="for-you-footer">
      <p>
        <strong>{de ? "Warum diese Seite?" : "Why this page?"}</strong>{" "}
        {de
          ? "Sie ist um die Interessen herum aufgebaut, die dein Besucherprofil in diesem Browser zeigt."
          : "It is arranged around the interests your visitor profile shows in this browser."}
      </p>
      <Link href={localizedPath("/profile", locale)} prefetch={false}>
        {de ? "Dein Profil ansehen" : "See your profile"}{" "}
        <span aria-hidden="true">↗</span>
      </Link>
    </footer>
  );
}
