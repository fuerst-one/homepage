import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Legal Notice | FUERST.ONE",
  description:
    "Legal notice for FUERST.ONE — Webdesign & E-Commerce, Alexander Fuerst.",
  alternates: {
    canonical: "https://fuerst.one/en/legal-notice",
    languages: {
      en: "https://fuerst.one/en/legal-notice",
      de: "https://fuerst.one/de/impressum",
      "x-default": "https://fuerst.one/en/legal-notice",
    },
  },
};

export default function LegalNoticePage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        Legal Notice
      </h1>

      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Provider information{" "}
        <span className="text-xs normal-case tracking-normal text-neutral-400">
          (per § 5 DDG)
        </span>
      </h2>
      <p>
        Alexander Fuerst
        <br />
        FUERST.ONE — Webdesign &amp; E-Commerce, Alexander Fuerst
        <br />
        Grombühlstraße 37
        <br />
        97080 Würzburg
        <br />
        Germany
      </p>

      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        VAT ID
      </h2>
      <p>
        VAT identification number under § 27a of the German VAT Act (UStG):
        DE349759427
      </p>

      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Contact
      </h2>
      <p>
        Phone: +49 152 55244840
        <br />
        Email:{" "}
        <a
          className="text-white underline underline-offset-4 hover:text-neutral-300"
          href="mailto:alexander@fuerst.one"
        >
          alexander@fuerst.one
        </a>
      </p>

      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Responsible for content under § 18(2) MStV
      </h2>
      <p>
        Alexander Fuerst
        <br />
        Grombühlstraße 37
        <br />
        97080 Würzburg
        <br />
        Germany
      </p>

      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Consumer dispute resolution
      </h2>
      <p>
        We are neither willing nor obliged to take part in dispute resolution
        proceedings before a consumer arbitration board.
      </p>

      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Content and links
      </h2>
      <p>
        We take care that the content of this website is accurate and up to
        date. We check links to other websites when we add them; their providers
        are responsible for their content. If you notice a mistake, illegal
        content or a problematic link, please write to us and we will deal with
        it promptly.
      </p>

      <h2 className="mt-10 text-base font-semibold uppercase tracking-[0.2em] text-white">
        Copyright
      </h2>
      <p>
        The texts, images, graphics and logo on this website are protected by
        copyright. Client projects, brands and logos shown here belong to their
        respective owners. For any use beyond what the law permits, please ask
        us first.
      </p>

      <p className="mt-10 border-t border-white/20 pt-6 text-xs text-neutral-500">
        This English page is a courtesy translation. The German{" "}
        <Link
          className="underline underline-offset-4 hover:text-neutral-300"
          href="/de/impressum"
        >
          Impressum
        </Link>{" "}
        is the legally binding version.
      </p>
    </>
  );
}
