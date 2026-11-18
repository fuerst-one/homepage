import { personName } from "@homepage/content/i18n";
import Link from "next/link";
import { Layout } from "../Layout";
import { Button } from "../Button";
import { StructuredData } from "../StructuredData";
import {
  serviceCopy,
  servicePath,
  serviceEmail,
  type ServiceSlug,
  type ServiceLocale,
} from "../../data/services";
import {
  collaborationEnquiry,
  serviceCollaborations,
  serviceCollaborationPath,
} from "../../data/serviceCollaborations";
import {
  isServiceProductSlug,
  serviceProductPath,
  serviceProducts,
} from "../../data/serviceProducts";
import { getServiceEvidence } from "../../server/content/getServiceEvidence";
import { PERSON_ID, SITE_URL } from "../../lib/seo";
import { ServiceProjectVisuals } from "./ServiceProjectVisuals";
import styles from "./services.module.css";

export async function ServiceCollaborationPage({
  slug,
  locale,
}: {
  slug: ServiceSlug;
  locale: ServiceLocale;
}) {
  const de = locale === "de";
  const copy = serviceCollaborations[slug][locale];
  const url = `${SITE_URL}${serviceCollaborationPath(slug, locale)}`;
  const evidence = await getServiceEvidence(slug, locale, "offer").catch(
    (error: unknown) => {
      console.error("Collaboration evidence unavailable", error);
      return [];
    },
  );
  const modes = [
    {
      key: "project" as const,
      title: de ? "Ein Projekt umsetzen" : "Deliver a project",
      cta: de ? "Projekt besprechen" : "Discuss a project",
      ...copy.project,
    },
    {
      key: "team" as const,
      title: de ? "Euer Team verstärken" : "Join your team",
      cta: de ? "Zusammenarbeit besprechen" : "Discuss team involvement",
      ...copy.team,
    },
  ];
  const questions = [
    {
      question: de
        ? "Müssen wir mit einem Review oder Assessment starten?"
        : "Do we need to start with a review or assessment?",
      answer: de
        ? "Nein. Wenn Ziel und Ausgangslage klar sind, können wir direkt einen Umsetzungsschritt oder eine Mitarbeit vereinbaren. Ein Review oder Assessment hilft, wenn ihr zunächst eine unabhängige Entscheidungsgrundlage braucht."
        : "No. If the goal and starting point are clear, we can agree a delivery milestone or team involvement directly. A review or assessment helps when you first need an independent basis for the decision.",
    },
    {
      question: de
        ? "Wie viel Mitwirkung braucht ihr von uns?"
        : "How much involvement do you need from us?",
      answer: de
        ? "Wir brauchen eine Ansprechperson, die fachliche Entscheidungen trifft, sowie Zugang zum relevanten technischen Wissen. Walkthrough, Zugänge, Feedback und Abnahmen planen wir gemeinsam. Den passenden Rhythmus vereinbaren wir für euren Umfang."
        : "We need a contact who can make product decisions and access to the relevant technical knowledge. We plan the walkthrough, access, feedback and acceptance together, agreeing a review rhythm that fits your scope.",
    },
    {
      question: de
        ? "Was bestimmt Aufwand, Honorar und Start?"
        : "What determines effort, fee and start date?",
      answer: copy.effort,
    },
    {
      question: de
        ? "Wie sieht die Übergabe aus?"
        : "What does the handover include?",
      answer: de
        ? "Wir vereinbaren die Übergabe vor der Umsetzung: relevante Designs und Code, Einrichtungs- und Betriebshinweise, offene Punkte und eine gemeinsame Durchsicht mit den Menschen, die weiterarbeiten. Eure vorhandenen Werkzeuge und Abläufe geben dabei den Rahmen vor."
        : "We agree the handover before implementation: relevant designs and code, setup and operating notes, open issues and a walkthrough with the people continuing the work. Your existing tools and process shape the format.",
    },
    {
      question: de
        ? "Wer übernimmt Betrieb und Wartung danach?"
        : "Who handles operation and maintenance afterward?",
      answer: de
        ? "Zuständigkeiten für Betrieb, Monitoring, Änderungen und Fehlerbehebung klären wir vor der Übergabe. Euer Team kann übernehmen oder wir vereinbaren weitere Mitarbeit. Umfang und Verfügbarkeit für eine laufende Betreuung werden ausdrücklich abgestimmt."
        : "We establish responsibility for operation, monitoring, changes and fixes before handover. Your team can take over, or we can agree further involvement. Ongoing maintenance scope and availability are explicitly agreed.",
    },
  ];
  return (
    <Layout locale={locale}>
      <article className={styles.page} lang={locale}>
        <StructuredData
          data={{
            "@context": "https://schema.org",
            "@type": "Service",
            "@id": `${url}#service`,
            name: copy.label,
            description: copy.description,
            url,
            inLanguage: locale,
            provider: {
              "@type": "Person",
              "@id": PERSON_ID,
              name: personName(locale),
            },
            isRelatedTo: {
              "@type": "Service",
              url: `${SITE_URL}${servicePath(slug, locale)}`,
            },
          }}
        />
        <nav
          className={styles.language}
          aria-label={de ? "Seitenpfad" : "Breadcrumb"}
        >
          <Link href={servicePath(slug, locale)}>
            ← {serviceCopy[slug][locale].label}
          </Link>
          <span>
            {de ? "Projekt & Zusammenarbeit" : "Projects & collaboration"}
          </span>
        </nav>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>{copy.label}</p>
          <h1>{copy.headline}</h1>
          <p className={styles.intro}>{copy.intro}</p>
          <div className={styles.actions}>
            <a href="#engagements" className={styles.textLink}>
              {de ? "Zusammenarbeit wählen" : "Choose how we work together"} ↓
            </a>
          </div>
        </header>
        <section
          id="engagements"
          className={styles.section}
          aria-labelledby="engagements-heading"
        >
          <p className={styles.eyebrow}>
            01 / {de ? "Zusammenarbeit" : "Ways to work together"}
          </p>
          <h2 id="engagements-heading">
            {de
              ? "Ein Ziel. Der passende Rahmen."
              : "A clear goal. The right involvement."}
          </h2>
          <div className={styles.engagementGrid}>
            {modes.map((mode) => (
              <section
                key={mode.key}
                className={styles.engagementOption}
                aria-labelledby={`${mode.key}-heading`}
              >
                <h3 id={`${mode.key}-heading`}>{mode.title}</h3>
                <p>{mode.text}</p>
                <ul className={styles.productInputs}>
                  {mode.outputs.map((output) => (
                    <li key={output}>{output}</li>
                  ))}
                </ul>
                <Button
                  href={collaborationEnquiry(slug, locale, mode.key)}
                  arrow
                  className={styles.primary}
                >
                  {mode.cta}
                </Button>
              </section>
            ))}
          </div>
        </section>
        <section className={styles.section} aria-labelledby="milestone-heading">
          <p className={styles.eyebrow}>
            02 / {de ? "Der erste Meilenstein" : "The first milestone"}
          </p>
          <h2 id="milestone-heading">
            {de
              ? "Etwas Konkretes gemeinsam prüfen."
              : "Something concrete to review together."}
          </h2>
          <p className={styles.sectionIntro}>{copy.milestone}</p>
          <h3>{de ? "Was wir von euch brauchen" : "What we need from you"}</h3>
          <ul className={styles.productInputs}>
            {copy.inputs.map((input) => (
              <li key={input}>{input}</li>
            ))}
          </ul>
        </section>
        <section className={styles.section} aria-labelledby="work-heading">
          <p className={styles.eyebrow}>
            03 / {de ? "Passende Projekterfahrung" : "Relevant experience"}
          </p>
          <h2 id="work-heading">
            {de
              ? "Arbeit im jeweiligen Kontext."
              : "Work in its actual context."}
          </h2>
          {evidence.slice(0, 2).map((project) => (
            <article key={project.id} className={styles.case}>
              <h3>
                <Link href={project.href}>{project.name} ↗</Link>
              </h3>
              <p>
                {project.story?.[locale].context ?? project.clients.join(" · ")}
              </p>
              <ServiceProjectVisuals
                visuals={project.visuals}
                projectName={project.name}
                projectId={project.id}
                initialDescriptions={project.imageDescriptions}
                locale={locale}
              />
              <Link href={project.href} className={styles.textLink}>
                {de
                  ? "Beitrag und Ergebnisse ansehen"
                  : "Read the contribution and results"}{" "}
                ↗
              </Link>
            </article>
          ))}
          {!evidence.length && (
            <p className={styles.sectionIntro}>
              {de
                ? "Projektdetails sind gerade nicht verfügbar. Du kannst dein Vorhaben trotzdem direkt besprechen."
                : "Project details are temporarily unavailable. You can still discuss your project directly."}
            </p>
          )}
        </section>
        <section className={styles.section} aria-labelledby="questions-heading">
          <p className={styles.eyebrow}>
            04 / {de ? "Praktische Fragen" : "Practical questions"}
          </p>
          <h2 id="questions-heading">
            {de ? "Bevor wir zusammenarbeiten." : "Before we work together."}
          </h2>
          <div className={styles.faq}>
            {questions.map((item) => (
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
        <section className={styles.closing} aria-labelledby="enquiry-heading">
          <h2 id="enquiry-heading">
            {de
              ? "Was soll als Nächstes funktionieren?"
              : "What needs to work next?"}
          </h2>
          <p>
            {de
              ? "Ein kurzer Einblick in Produkt, Aufgabe und Team reicht für den Anfang. Wir klären Zuständigkeiten, Umfang und Honorar gemeinsam."
              : "A short introduction to your product, task and team is enough to start. We establish responsibilities, scope and fee together."}
          </p>
          <div className={styles.actions}>
            {modes.map((mode) => (
              <Button
                key={mode.key}
                href={collaborationEnquiry(slug, locale, mode.key)}
                arrow
                className={styles.closingButton}
              >
                {mode.cta}
              </Button>
            ))}
          </div>
          <div className={styles.directEmail}>
            <span>{de ? "Oder direkt per E-Mail" : "Or email directly"}</span>
            <a href={serviceEmail(slug, locale)}>alexander@fuerst.one</a>
          </div>
        </section>
        {isServiceProductSlug(slug) && (
          <nav
            className={styles.other}
            aria-label={
              de ? "Klar begrenzter Einstieg" : "Focused starting engagement"
            }
          >
            <span>
              {de
                ? "Ihr braucht zuerst eine Entscheidungsgrundlage?"
                : "Need a decision brief first?"}
            </span>
            <Link href={serviceProductPath(slug, locale)}>
              {serviceProducts[slug].copy[locale].label} ↗
            </Link>
          </nav>
        )}
      </article>
    </Layout>
  );
}
