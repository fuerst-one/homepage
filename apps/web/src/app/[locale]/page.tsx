import { getLocale } from "../../server/i18n/getLocale";
import { getSiteCopy } from "../../server/content/getSiteCopy";
import { localizedPath, type LocaleParams } from "@homepage/content/i18n";
import Link from "../../components/i18n/LocalizedLink";
import Image from "next/image";
import { getCachedCvOwnerPublic } from "../../server/content/getCachedCvOwner";
import { PlasmaLanding } from "../../components/PlasmaLanding/PlasmaLanding";
import { Button } from "../../components/Button";
import { StructuredData } from "../../components/StructuredData";
import { pageMetadata, personSchema, SITE_URL, PERSON_ID } from "../../lib/seo";
import "../home.css";
import { MaltTerms } from "../../components/MaltTerms";
import { EnquiryStart } from "../../components/Enquiry/EnquiryStart";
import { getSiteFeatures } from "@/server/siteFeatures";

export const revalidate = 60;
export async function generateMetadata({ params }: LocaleParams) {
  const locale = await getLocale(params);
  const copy = await getSiteCopy(locale);
  return pageMetadata(
    "/",
    locale === "de"
      ? "Alexander Fuerst — UX- & KI-Engineer | Fuerst.one"
      : "Alexander Fuerst — UX+AI Engineer | Fuerst.one",
    copy["home.description"],
    { locale },
  );
}

export default async function Home({ params }: LocaleParams) {
  const locale = await getLocale(params);
  const { assistantEnabled } = getSiteFeatures();
  const [owner, copy] = await Promise.all([
    getCachedCvOwnerPublic(locale),
    getSiteCopy(locale),
  ]);
  return (
    <main>
      <PlasmaLanding
        headline={copy["home.eyebrow"]}
        assistantEnabled={assistantEnabled}
      />
      <EnquiryStart locale={locale} />
      <div className="mx-auto w-full max-w-4xl px-6 pb-16">
        <MaltTerms locale={locale} mirror={owner.malt} />
      </div>
      <section className="home-about" aria-labelledby="home-about-title">
        <div className="home-about-heading">
          <p className="home-about-eyebrow">{copy["home.eyebrow"]}</p>
          {owner.avatarUrl && (
            <div className="home-about-portrait">
              <Image
                src={owner.avatarUrl}
                alt={
                  locale === "de"
                    ? "Porträt von Alexander Fuerst"
                    : "Portrait of Alexander Fuerst"
                }
                width={240}
                height={240}
                sizes="(max-width: 767px) 180px, 220px"
                loading="lazy"
              />
            </div>
          )}
          <h1 id="home-about-title">Alexander Fuerst</h1>
          <p className="home-about-role">{copy["home.role"]}</p>
          <p className="home-about-location">{copy["home.location"]}</p>
        </div>
        <div className="home-about-copy">
          <p className="home-about-lead">{copy["home.lead"]}</p>
          <p>{copy["home.p1"]}</p>
          <p>{copy["home.p2"]}</p>
          <p>{copy["home.p3"]}</p>
        </div>
        <div className="home-about-links">
          <nav aria-label="Explore my work" className="flex flex-wrap gap-4">
            <Button
              prefetch={false}
              href="/projects"
              className="max-w-full"
              arrow
            >
              {locale === "de" ? "Projekte entdecken" : "Explore projects"}
            </Button>
            <Button
              prefetch={false}
              href="/contact"
              className="max-w-full"
              arrow
            >
              {locale === "de" ? "Kontakt aufnehmen" : "Get in touch"}
            </Button>
          </nav>
          <p className="home-about-elsewhere">
            {locale === "de" ? "Entdecke den " : "Explore the "}
            <Link prefetch={false} href="/projects" className="underline">
              {locale === "de" ? "interaktiven Lebenslauf" : "interactive CV"}
            </Link>{" "}
            {locale === "de" ? "oder den " : "or the "}
            <Link prefetch={false} href="/plasma" className="underline">
              {locale === "de"
                ? "interaktiven Plasma-Spielplatz"
                : "interactive plasma playground"}
            </Link>
            .
          </p>
        </div>
      </section>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@graph": [
            personSchema(owner, locale),
            {
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              url: `${SITE_URL}${localizedPath("/", locale)}`,
              name: "Fuerst.one",
              description: copy["home.description"],
              publisher: { "@id": PERSON_ID },
              inLanguage: locale,
            },
          ],
        }}
      />
    </main>
  );
}
