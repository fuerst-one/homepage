import { enquiryPath } from "@homepage/content/enquiry";
import Link from "next/link";
import { Layout } from "../Layout";
import { Button } from "../Button";
import { getServiceEvidence } from "../../server/content/getServiceEvidence";
import { flattenRichText } from "../../app/cv.pdf/flattenRichText";
import { serializeJsonLd } from "../../lib/seo";
import { localizedPath } from "@homepage/content/i18n";
import {
  serviceCopy,
  serviceEmail,
  servicePath,
  type ServiceLocale,
  type ServiceSlug,
} from "../../data/services";
import { serviceSchema } from "./serviceMetadata";
import { AutomationLandingPage } from "./AutomationLandingPage";
import { AiProductsLandingPage } from "./AiProductsLandingPage";
import { ServiceStartingOffer } from "./ServiceStartingOffer";
import { ServiceHeroActions } from "./ServiceHeroActions";
import { ServiceHeroSculpture } from "./ServiceHeroSculpture";
import { ServiceProjectVisuals } from "./ServiceProjectVisuals";
import styles from "./services.module.css";

const ui = {
  en: {
    work: "Selected work",
    evidence: "Built, not just proposed.",
    cases: "Explore the case study",
    caseNote:
      "Results reported in this project’s portfolio record. Case-specific outcomes, not a forecast for your project.",
    source: "Reported project outcomes",
    client: "Client / project context",
    personal: "Personal project",
    startup: "Startup project",
    commission: "Client project",
    process: "From problem to working product",
    processLabel: "How we work",
    fit: "A good place to start",
    questions: "Before we talk",
    faqLabel: "Practical questions",
    email: "Or email directly",
    noMail: "No email app? Copy the address into your preferred email service.",
    other: "Also working on",
    unavailable:
      "Project details are temporarily unavailable. You can still explore my portfolio or get in touch.",
    portfolio: "View portfolio",
    includes: "What you get",
    jump: "See the work",
    by: "With Alexander Fuerst · Würzburg, Germany",
  },
  de: {
    work: "Ausgewählte Arbeiten",
    evidence: "Gebaut. Nicht nur vorgeschlagen.",
    cases: "Zum Projekt",
    caseNote:
      "Ergebnisse laut Portfolioeintrag dieses Projekts. Projektspezifische Angaben, keine Prognose für dein Vorhaben.",
    source: "Berichtete Projektergebnisse",
    client: "Kunde / Projektkontext",
    personal: "Eigenes Projekt",
    startup: "Startup-Projekt",
    commission: "Kundenprojekt",
    process: "Vom Problem zur funktionierenden Lösung",
    processLabel: "So arbeiten wir",
    fit: "Ein guter Ausgangspunkt",
    questions: "Bevor wir sprechen",
    faqLabel: "Praktische Fragen",
    email: "Oder schreib direkt an",
    noMail:
      "Keine E-Mail-App? Kopiere die Adresse in deinen bevorzugten E-Mail-Dienst.",
    other: "Außerdem unterstütze ich bei",
    unavailable:
      "Projektdetails sind gerade nicht verfügbar. Du kannst mein Portfolio ansehen oder mir direkt schreiben.",
    portfolio: "Portfolio ansehen",
    includes: "Das bekommst du",
    jump: "Arbeiten ansehen",
    by: "Mit Alexander Fürst · Würzburg, Deutschland",
  },
};

const caseStories: Record<string, { en: string; de: string }> = {
  "15b86514-f736-803e-b9b7-e47ebc2406d1": {
    en: "A specialized visual design tool for motorcycle decals. Customers can create designs from scratch or adapt existing kits through color variables.",
    de: "Ein spezialisierter visueller Editor für Motorraddekore. Kunden gestalten eigene Designs oder passen vorhandene Kits über Farbvariablen an.",
  },
  "153f6668-f4d6-490a-8345-0b999b35305a": {
    en: "Voyage calculation, competitor analysis, route monitoring and negotiation in one maritime application. A complex professional domain translated into usable workflows.",
    de: "Reisekalkulation, Wettbewerbsanalyse, Routenüberwachung und Verhandlung in einer maritimen Anwendung. Eine komplexe Fachdomäne, übersetzt in bedienbare Abläufe.",
  },
};

export async function ServicePage({
  slug,
  locale,
}: {
  slug: ServiceSlug;
  locale: ServiceLocale;
}) {
  const copy = serviceCopy[slug][locale];
  const t = ui[locale];
  const email = serviceEmail(slug, locale);
  const enquiry = enquiryPath(
    {
      source: "service",
      service: slug,
      intent: slug === "ai-automation" ? "explore" : "improve",
    },
    locale,
  );
  const other =
    slug === "product-interfaces" ? "ai-automation" : "product-interfaces";
  // The offer and contact path remain useful during a temporary upstream outage.
  const evidence = await getServiceEvidence(slug, locale).catch(
    (error: unknown) => {
      console.error("Service portfolio evidence unavailable", error);
      return [];
    },
  );
  if (slug === "ai-products") {
    return <AiProductsLandingPage locale={locale} evidence={evidence} />;
  }
  if (slug === "ai-automation") {
    return <AutomationLandingPage locale={locale} evidence={evidence} />;
  }
  const hero = evidence.find((project) => project.heroVisuals.length);

  return (
    <Layout locale={locale} wide>
      <article lang={locale} className={`${styles.page} ${styles.landing}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(serviceSchema(slug, locale)),
          }}
        />
        <header
          className={`${styles.hero} ${styles.serviceHero} ${styles.landingHero}`}
        >
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>01 / {copy.label}</p>
            <h1>{copy.headline}</h1>
            <p className={styles.intro}>{copy.intro}</p>
            <ServiceHeroActions
              slug={slug}
              locale={locale}
              workLabel={t.jump}
            />
            <p className={styles.micro}>{copy.reassurance}</p>
            <p className={styles.signature}>{t.by}</p>
          </div>
          <ServiceHeroSculpture slug={slug} locale={locale} />
        </header>
        {hero && (
          <figure className={styles.heroVisual}>
            <div className={styles.windowBar} aria-hidden="true">
              <span>● ● ●</span>
              <span>{hero.name}</span>
              <span>↗</span>
            </div>
            <Link href={hero.href} aria-label={`${t.cases}: ${hero.name}`}>
              {/* The existing Notion image proxy serves authenticated, cached portfolio assets. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero.heroVisuals[0].src}
                alt={hero.heroVisuals[0].alt}
                width={1440}
                height={900}
                fetchPriority="high"
                className={styles.heroImage}
              />
            </Link>
            <figcaption>
              <span>{t.work}</span>
              <span lang="en">{hero.name}</span>
            </figcaption>
          </figure>
        )}
        <section className={styles.section} aria-labelledby="offer-heading">
          <p className={styles.eyebrow}>02 / {t.includes}</p>
          <h2 id="offer-heading">{copy.workHeading}</h2>
          <p className={styles.sectionIntro}>{copy.workIntro}</p>
          <div className={styles.deliverables}>
            {copy.deliverables.map((item, index) => (
              <div key={item.title} className={styles.deliverable}>
                <span className={styles.number} aria-hidden="true">
                  0{index + 1}
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <p className={styles.output}>{item.output}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <ServiceStartingOffer slug={slug} locale={locale} />
        <section
          id="work"
          className={styles.section}
          aria-labelledby="work-heading"
        >
          <p className={styles.eyebrow}>03 / {t.work}</p>
          <h2 id="work-heading">{t.evidence}</h2>
          <p className={styles.sectionIntro}>{copy.evidenceIntro}</p>
          {evidence.length ? (
            evidence.map((project, index) => {
              const kpis = flattenRichText(project.kpis);
              const personal =
                project.projectType === "Hobby" ||
                project.clients.every((client) =>
                  client.toLowerCase().startsWith("fuerst.one"),
                );
              return (
                <article className={styles.case} key={project.id}>
                  <div className={styles.caseHeader}>
                    <span>0{index + 1}</span>
                    <span>
                      {personal
                        ? t.personal
                        : project.projectType === "Startup"
                          ? t.startup
                          : t.commission}
                    </span>
                  </div>
                  <div className={styles.caseBody}>
                    <div className={styles.caseCopy}>
                      <h3 lang="en">
                        <Link href={project.href}>
                          {project.name} <span aria-hidden="true">↗</span>
                        </Link>
                      </h3>
                      <p>{caseStories[project.id]?.[locale]}</p>
                      <dl className={styles.caseContext}>
                        <dt>{t.client}</dt>
                        <dd lang="en">{project.clients.join(" · ")}</dd>
                      </dl>
                      {kpis && (
                        <div className={styles.results}>
                          <p className={styles.eyebrow}>
                            {t.source}
                            {locale === "de" && project.contentLocale === "en"
                              ? " · Originaltext (Englisch)"
                              : ""}
                          </p>
                          <p
                            lang={project.contentLocale}
                            className={styles.metric}
                          >
                            {kpis}
                          </p>
                          <p className={styles.micro}>{t.caseNote}</p>
                        </div>
                      )}
                      <ul
                        className={styles.tools}
                        aria-label={
                          locale === "de" ? "Verwendete Tools" : "Tools used"
                        }
                      >
                        {project.tools.map((tool) => (
                          <li lang="en" key={tool}>
                            {tool}
                          </li>
                        ))}
                      </ul>
                      <Link href={project.href} className={styles.textLink}>
                        {t.cases} <span aria-hidden="true">↗</span>
                      </Link>
                    </div>
                    <div className={styles.caseVisuals}>
                      <ServiceProjectVisuals
                        visuals={project.visuals}
                        projectName={project.name}
                        projectId={project.id}
                        initialDescriptions={project.imageDescriptions}
                        locale={locale}
                      />
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <p className={styles.case}>
              {t.unavailable}{" "}
              <Link
                href={localizedPath("/projects", locale)}
                className={styles.textLink}
              >
                {t.portfolio} ↗
              </Link>
            </p>
          )}
        </section>
        <section className={styles.section} aria-labelledby="process-heading">
          <p className={styles.eyebrow}>04 / {t.processLabel}</p>
          <h2 id="process-heading">{t.process}</h2>
          <ol className={styles.process}>
            {copy.process.map((step, index) => (
              <li key={step.title}>
                <span aria-hidden="true">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
          <aside className={styles.fit}>
            <h3>{t.fit}</h3>
            <p>{copy.fit}</p>
          </aside>
        </section>
        <section className={styles.section} aria-labelledby="faq-heading">
          <p className={styles.eyebrow}>05 / {t.faqLabel}</p>
          <h2 id="faq-heading">{t.questions}</h2>
          <div className={styles.faq}>
            {copy.questions.slice(0, 2).map((item) => (
              <details key={item.question}>
                <summary>
                  {item.question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section
          id="enquiry"
          className={styles.closing}
          aria-labelledby="enquiry-heading"
        >
          <p className={styles.eyebrow}>
            06 / {locale === "de" ? "Dein nächster Schritt" : "Your next step"}
          </p>
          <h2 id="enquiry-heading">{copy.closing}</h2>
          <p>{copy.closingText}</p>
          <Button
            href={enquiry}
            variant="cta"
            arrow
            className={styles.closingButton}
          >
            {copy.cta}
          </Button>
          <div className={styles.directEmail}>
            <span>{t.email}</span>
            <a href={email}>alexander@fuerst.one</a>
            <p>{t.noMail}</p>
          </div>
        </section>
        <nav className={styles.other} aria-label={t.other}>
          <span>{t.other}</span>
          <Link href={servicePath(other, locale)}>
            {serviceCopy[other][locale].label} ↗
          </Link>
          <Link href={servicePath("ai-products", locale)}>
            {serviceCopy["ai-products"][locale].label} ↗
          </Link>
        </nav>
      </article>
    </Layout>
  );
}
