import { MaltTerms } from "../../../../components/MaltTerms";
import { getMaltMirror } from "../../../../server/malt/getMaltMirror";
import { getLocale } from "../../../../server/i18n/getLocale";
import { getSiteCopy } from "../../../../server/content/getSiteCopy";
import { type LocaleParams } from "@homepage/content/i18n";
import { Layout } from "../../../../components/Layout";
import { PageEyebrow } from "../../../../components/PageEyebrow";
import { IconLink } from "../../../../components/IconLink";
import { Button } from "../../../../components/Button";
import { FaEnvelope } from "@react-icons/all-files/fa/FaEnvelope";
import { hiringPlatforms } from "@homepage/content/data/hiringPlatforms";
import { enquiryPath } from "@homepage/content/enquiry";
import { pageMetadata } from "../../../../lib/seo";

export const revalidate = 60;
export async function generateMetadata({ params }: LocaleParams) {
  const locale = await getLocale(params);
  const copy = await getSiteCopy(locale);
  return pageMetadata("/hire", copy["hire.title"], copy["hire.description"], {
    locale,
  });
}

export default async function HirePage({ params }: LocaleParams) {
  const locale = await getLocale(params);
  const [copy, mirror] = await Promise.all([
    getSiteCopy(locale),
    getMaltMirror(),
  ]);
  return (
    <Layout locale={locale} wide>
      <article className="content-page">
        <header className="content-page-heading">
          <PageEyebrow>
            {locale === "de"
              ? "Gute Arbeit beginnt mit einem Gespräch"
              : "Good work starts with a conversation"}
          </PageEyebrow>
          <h1 className="content-page-title">
            {locale === "de" ? "Zusammenarbeiten" : "Work with me"}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-neutral-300">
            {copy["hire.intro"]}
          </p>
        </header>
        <div className="content-page-grid">
          <div className="space-y-10">
            <section
              className="grid gap-5 border-y border-white/20 py-8 sm:grid-cols-2"
              aria-label={
                locale === "de"
                  ? "Zusammenarbeit starten"
                  : "Start a collaboration"
              }
            >
              <div className="space-y-4">
                <h2 className="text-xl text-white">
                  {locale === "de"
                    ? "Ein Projekt besprechen"
                    : "Discuss a project"}
                </h2>
                <Button
                  href={enquiryPath(
                    { source: "hire", intent: "explore" },
                    locale,
                  )}
                  className="w-full"
                  variant="cta"
                  arrow
                >
                  {locale === "de" ? "Projektanfrage" : "Project enquiry"}
                </Button>
              </div>
              <div className="space-y-4">
                <h2 className="text-xl text-white">
                  {locale === "de"
                    ? "Länger zusammenarbeiten"
                    : "Work together longer"}
                </h2>
                <Button
                  href={enquiryPath({ source: "hire", intent: "team" }, locale)}
                  className="w-full"
                  arrow
                >
                  {locale === "de"
                    ? "Zusammenarbeit besprechen"
                    : "Discuss collaboration"}
                </Button>
              </div>
            </section>
            <section
              aria-label="Hiring platform profiles"
              className="divide-y divide-white/20 border-y border-white/20"
            >
              {hiringPlatforms.map((platform, index) => (
                <a
                  key={platform.href}
                  href={platform.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group grid gap-4 py-7 transition hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-1 focus-visible:outline-white sm:grid-cols-[2rem_1fr_auto] sm:items-start"
                >
                  <span
                    aria-hidden="true"
                    className="pt-1 text-[0.65rem] text-neutral-500"
                  >
                    0{index + 1}
                  </span>
                  <div className="space-y-2">
                    <h2 className="text-xl font-medium text-white">
                      {platform.name}
                    </h2>
                    <p className="max-w-md text-xs leading-relaxed text-neutral-400">
                      {locale === "de"
                        ? platform.descriptionDe
                        : platform.description}
                    </p>
                    <span className="inline-block pt-2 text-[0.65rem] text-neutral-300">
                      {locale === "de" ? platform.labelDe : platform.label}{" "}
                      <span className="sr-only">
                        {locale === "de"
                          ? "(öffnet in einem neuen Tab)"
                          : "(opens in a new tab)"}
                      </span>
                    </span>
                  </div>
                  <span
                    aria-hidden="true"
                    className="hidden text-xl text-neutral-500 group-hover:text-white motion-safe:transition motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:translate-x-1 sm:block"
                  >
                    ↗
                  </span>
                </a>
              ))}
            </section>
          </div>
          <MaltTerms locale={locale} mirror={mirror} />
        </div>
        <section className="hire-page-direct space-y-5">
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-white">
              {locale === "de"
                ? "Lieber direkt sprechen?"
                : "Prefer a direct conversation?"}
            </h2>
            <p className="text-xs leading-relaxed text-neutral-400">
              {locale === "de"
                ? "Schreib mir ein paar Zeilen über dein Projekt oder entdecke zunächst meine Erfahrung."
                : "Send me a few lines about your project, or explore my experience first."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <IconLink
              href="mailto:alexander@fuerst.one"
              icon={FaEnvelope}
              className="min-h-11 break-all"
            >
              alexander@fuerst.one
            </IconLink>
            <Button href="/contact" variant="cta" arrow>
              {locale === "de" ? "Kontakt aufnehmen" : "Get in touch"}
            </Button>
          </div>
        </section>
      </article>
    </Layout>
  );
}
