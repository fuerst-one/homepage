import { enquiryPath } from "@homepage/content/enquiry";
import Link from "next/link";
import { Layout } from "../Layout";
import { Button } from "../Button";
import { getCachedCvProjects } from "../../server/content/getCachedCvProjects";
import { flattenRichText } from "../../app/cv.pdf/flattenRichText";
import { projectPath, serializeJsonLd } from "../../lib/seo";
import { localizedPath } from "@homepage/content/i18n";
import {
  serviceCopy,
  serviceEmail,
  servicePath,
  type ServiceLocale,
  type ServiceSlug,
} from "../../data/services";
import { selectServiceEvidence } from "./serviceEvidence";
import { serviceSchema } from "./serviceMetadata";
import { ServiceStartingOffer } from "./ServiceStartingOffer";
import styles from "./services.module.css";

const ui = {
  en: {
    language: "Page language",
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
    screenshot: "Product screenshot",
    includes: "What you get",
    jump: "See the work",
    role: "UX + engineering, together",
    by: "With Alexander Fuerst · Würzburg, Germany",
  },
  de: {
    language: "Seitensprache",
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
    screenshot: "Produkt-Screenshot",
    includes: "Das bekommst du",
    jump: "Arbeiten ansehen",
    role: "UX + Entwicklung, gemeinsam gedacht",
    by: "Mit Alexander Fuerst · Würzburg, Deutschland",
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
  "11d86514-f736-80ed-935c-e6fe30b59d42": {
    en: "A B2B survey product that combines survey creation, website integration and automatic analysis, helping businesses turn responses into actionable information.",
    de: "Ein B2B-Umfrageprodukt, das Erstellung, Website-Integration und automatische Auswertung verbindet, um aus Antworten nutzbare Informationen zu machen.",
  },
  "35486514-f736-8020-bde8-e0f741a1a77a": {
    en: "A personal development tool coordinating AI agents through a staged build process, with a web interface for live status, steering and review. A self-directed project, not a client commission.",
    de: "Ein eigenes Entwicklungstool, das KI-Agenten durch einen mehrstufigen Build-Prozess koordiniert. Mit Weboberfläche für Status, Steuerung und Review. Ein eigenes Projekt, kein Kundenauftrag.",
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
  const projects = await getCachedCvProjects(locale).catch((error: unknown) => {
    console.error("Service portfolio evidence unavailable", error);
    return [];
  });
  const evidence = selectServiceEvidence(projects, slug, (project) =>
    projectPath(project, locale),
  );
  const hero = evidence.find((project) => project.screenshot);

  return (
    <Layout locale={locale}>
      <article lang={locale} className={styles.page}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(serviceSchema(slug, locale)),
          }}
        />
        <nav aria-label={t.language} className={styles.language}>
          <span>01 / {copy.label}</span>
          <div>
            {(["en", "de"] as const).map((language) => (
              <Link
                key={language}
                href={servicePath(slug, language)}
                hrefLang={language}
                lang={language}
                aria-current={language === locale ? "page" : undefined}
              >
                {language === "en" ? "English" : "Deutsch"}
              </Link>
            ))}
          </div>
        </nav>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>{t.role}</p>
          <h1>{copy.headline}</h1>
          <p className={styles.intro}>{copy.intro}</p>
          <div className={styles.actions}>
            <Button href={enquiry} arrow className={styles.primary}>
              {copy.cta}
            </Button>
            <a href="#work" className={styles.textLink}>
              {t.jump} <span aria-hidden="true">↓</span>
            </a>
          </div>
          <p className={styles.micro}>{copy.reassurance}</p>
          <p className={styles.signature}>{t.by}</p>
        </header>
        {hero?.screenshot && (
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
                src={hero.screenshot}
                alt={`${t.screenshot}: ${hero.name}`}
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
                  client.startsWith("Fuerst.one"),
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
                  {project.screenshot && (
                    <Link
                      href={project.href}
                      aria-label={`${t.cases}: ${project.name}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={project.screenshot}
                        alt={`${t.screenshot}: ${project.name}`}
                        loading="lazy"
                        width={1440}
                        height={900}
                        className={styles.caseImage}
                      />
                    </Link>
                  )}
                  {kpis && (
                    <div className={styles.results}>
                      <p className={styles.eyebrow}>
                        {t.source}
                        {locale === "de" && project.contentLocale === "en"
                          ? " · Originaltext (Englisch)"
                          : ""}
                      </p>
                      <p lang={project.contentLocale} className={styles.metric}>
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
            {copy.questions.map((item) => (
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
          <Button href={enquiry} arrow className={styles.closingButton}>
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
        </nav>
      </article>
    </Layout>
  );
}
