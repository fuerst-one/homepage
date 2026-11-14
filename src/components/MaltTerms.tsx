import type { Locale } from "@/lib/i18n";
import type { MaltMirrorView } from "@/lib/maltMirror";
import Link from "@/components/i18n/LocalizedLink";

export function MaltTerms({
  locale,
  mirror,
}: {
  locale: Locale;
  mirror: MaltMirrorView;
}) {
  const de = locale === "de";
  const rate = mirror.rate
    ? new Intl.NumberFormat(de ? "de-DE" : "en-GB", {
        style: "currency",
        currency: mirror.rate.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(mirror.rate.amount)
    : null;
  const checked = mirror.observedAt
    ? new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", {
        dateStyle: "medium",
        timeZone: "Europe/Berlin",
      }).format(new Date(mirror.observedAt))
    : null;
  return (
    <section
      className="space-y-3 border border-white/25 bg-black/80 p-5 text-sm text-neutral-300"
      aria-label={de ? "Honorar und Verfügbarkeit" : "Rate and availability"}
    >
      <h2 className="text-base text-white">
        {de ? "Honorar & Verfügbarkeit" : "Rate & availability"}
      </h2>
      <p>
        {rate ? (
          <>
            {de ? "Malt-Profilsatz" : "Malt profile rate"}:{" "}
            <span className="text-white">
              {rate}
              {de ? "/Tag" : "/day"}
            </span>
          </>
        ) : de ? (
          "Honorar für dein Vorhaben auf Anfrage."
        ) : (
          "Ask about the rate for your project."
        )}
      </p>
      <p>
        {mirror.available === true ? (
          de ? (
            "Auf Malt als verfügbar bestätigt."
          ) : (
            "Confirmed available on Malt."
          )
        ) : mirror.available === false ? (
          de ? (
            "Auf Malt derzeit als nicht verfügbar bestätigt. Lass uns über einen späteren Start sprechen."
          ) : (
            "Currently confirmed unavailable on Malt. We can discuss a later start."
          )
        ) : (
          <Link href="/contact" className="underline underline-offset-4">
            {de
              ? "Verfügbarkeit für dein Vorhaben anfragen ↗"
              : "Ask about availability for your project ↗"}
          </Link>
        )}
      </p>
      <p className="text-xs leading-relaxed text-neutral-400">
        <a
          href={mirror.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          {de ? "Quelle: Malt-Profil ↗" : "Source: Malt profile ↗"}
        </a>
        {checked && (
          <>
            {" "}
            · {de ? "Zuletzt geprüft" : "Last checked"}:{" "}
            <time dateTime={mirror.observedAt!}>{checked}</time>
          </>
        )}
      </p>
      <p className="text-xs leading-relaxed text-neutral-400">
        {de
          ? "Umfang und Konditionen vereinbaren wir für dein Projekt."
          : "Scope and terms are agreed for your project."}
      </p>
    </section>
  );
}
