import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum | FUERST.ONE",
  description:
    "Impressum von FUERST.ONE — Webdesign & E-Commerce, Alexander Fürst.",
  alternates: {
    canonical: "https://fuerst.one/de/impressum",
    languages: {
      en: "https://fuerst.one/en/legal-notice",
      de: "https://fuerst.one/de/impressum",
      "x-default": "https://fuerst.one/en/legal-notice",
    },
  },
};

export default function ImpressumPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        Impressum
      </h1>

      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Angaben{" "}
        <span className="text-xs normal-case tracking-normal text-neutral-400">
          (gemäß § 5 DDG)
        </span>
      </h2>
      <p>
        Alexander Fürst
        <br />
        FUERST.ONE — Webdesign &amp; E-Commerce, Alexander Fürst
        <br />
        Grombühlstraße 37
        <br />
        97080 Würzburg
      </p>

      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Umsatzsteuer-ID
      </h2>
      <p>Umsatzsteuer-Identifikationsnummer nach § 27a UStG: DE349759427</p>

      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Kontakt
      </h2>
      <p>
        Telefon: 0152 55244840
        <br />
        E-Mail:{" "}
        <a
          className="text-white underline underline-offset-4 hover:text-neutral-300"
          href="mailto:alexander@fuerst.one"
        >
          alexander@fuerst.one
        </a>
      </p>

      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
      </h2>
      <p>
        Alexander Fürst
        <br />
        Grombühlstraße 37
        <br />
        97080 Würzburg
      </p>

      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Verbraucherstreitbeilegung
      </h2>
      <p>
        Wir sind nicht bereit und nicht verpflichtet, an
        Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
        teilzunehmen.
      </p>

      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Inhalte und Links
      </h2>
      <p>
        Wir achten darauf, dass die Inhalte dieser Website richtig und aktuell
        sind. Links zu anderen Websites prüfen wir, wenn wir sie setzen; für
        deren Inhalte sind die jeweiligen Anbieter verantwortlich. Fällt Ihnen
        ein Fehler, ein rechtswidriger Inhalt oder ein problematischer Link auf,
        schreiben Sie uns bitte – wir kümmern uns umgehend darum.
      </p>

      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Urheberrecht
      </h2>
      <p>
        Texte, Bilder, Grafiken und das Logo auf dieser Website sind
        urheberrechtlich geschützt. Gezeigte Kundenprojekte, Marken und Logos
        gehören den jeweiligen Rechteinhabern. Eine Verwendung außerhalb der
        gesetzlichen Schranken bitte nur nach Rücksprache.
      </p>
    </>
  );
}
