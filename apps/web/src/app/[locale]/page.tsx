import { personName } from "@homepage/content/i18n";
import { getLocale } from "../../server/i18n/getLocale";
import { getSiteCopy } from "../../server/content/getSiteCopy";
import { localizedPath, type LocaleParams } from "@homepage/content/i18n";
import Link from "../../components/i18n/LocalizedLink";
import Image from "next/image";
import { getCachedCvOwnerPublic } from "../../server/content/getCachedCvOwner";
import { OwnerFacts } from "../../components/Cv/OwnerFacts";
import { PlasmaLanding } from "../../components/PlasmaLanding/PlasmaLanding";
import { HomeActions } from "../../components/HomeWork/HomeActions";
import { HomeWork } from "../../components/HomeWork/HomeWork";
import { getCachedCvProjects } from "../../server/content/getCachedCvProjects";
import { readPublicGitHubActivity } from "@homepage/database/githubActivity";
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
      ? "Alexander Fürst — UX- & KI-Engineer | FUERST.ONE"
      : "Alexander Fuerst — UX+AI Engineer | FUERST.ONE",
    copy["home.description"],
    { locale },
  );
}

export default async function Home({ params }: LocaleParams) {
  const locale = await getLocale(params);
  const { assistantEnabled } = getSiteFeatures();
  const [owner, copy, projects, github] = await Promise.all([
    getCachedCvOwnerPublic(locale),
    getSiteCopy(locale),
    getCachedCvProjects(locale),
    readPublicGitHubActivity(),
  ]);
  return (
    <main>
      <PlasmaLanding
        headline={copy["home.eyebrow"]}
        assistantEnabled={assistantEnabled}
      />
      <div className="site-container">
        <section className="home-about" aria-labelledby="home-about-title">
          <div className="home-about-heading">
            <p className="home-about-eyebrow">{copy["home.eyebrow"]}</p>
            {owner.avatarUrl && (
              <div className="home-about-portrait">
                <Image
                  src={owner.avatarUrl}
                  alt={
                    locale === "de"
                      ? "Porträt von Alexander Fürst"
                      : "Portrait of Alexander Fuerst"
                  }
                  width={240}
                  height={240}
                  sizes="(max-width: 767px) 180px, 220px"
                  loading="lazy"
                />
              </div>
            )}
            <h1 id="home-about-title">{personName(locale)}</h1>
            <div className="home-about-facts">
              <OwnerFacts owner={owner} locale={locale} />
            </div>
          </div>
          <div className="home-about-copy">
            <p className="home-about-lead">{copy["home.lead"]}</p>
            <p>{copy["home.p1"]}</p>
            <p>{copy["home.p2"]}</p>
            <p>{copy["home.p3"]}</p>
            <div className="home-about-links">
              <HomeActions locale={locale} />
              <p className="home-about-elsewhere">
                {locale === "de" ? "Entdecke den " : "Explore the "}
                <Link prefetch={false} href="/projects" className="underline">
                  {locale === "de"
                    ? "interaktiven Lebenslauf"
                    : "interactive CV"}
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
          </div>
        </section>
        <HomeWork projects={projects} github={github} locale={locale} />
        <div className="home-closing">
          <EnquiryStart locale={locale} />
          <div className="w-full pb-12">
            <MaltTerms locale={locale} mirror={owner.malt} place="home" />
          </div>
          <div className="home-closing-actions">
            <HomeActions locale={locale} closing />
          </div>
        </div>
      </div>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@graph": [
            personSchema(owner, locale),
            {
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              url: `${SITE_URL}${localizedPath("/", locale)}`,
              name: "FUERST.ONE",
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
