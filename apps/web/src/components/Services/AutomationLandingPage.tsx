import Link from "next/link";
import { enquiryPath } from "@homepage/content/enquiry";
import { localizedPath } from "@homepage/content/i18n";
import { Layout } from "../Layout";
import { Button } from "../Button";
import {
  serviceCopy,
  serviceEmail,
  servicePath,
  type ServiceLocale,
} from "../../data/services";
import { serializeJsonLd } from "../../lib/seo";
import { serviceSchema } from "./serviceMetadata";
import type { selectServiceEvidence } from "./serviceEvidence";
import { ServiceStartingOffer } from "./ServiceStartingOffer";
import shared from "./services.module.css";
import styles from "./automation.module.css";

const ui = {
  en: {
    by: "With Alexander Fuerst · UX + engineering",
    jump: "Explore the work",
    proof: "Different tasks. Working software.",
    proofIntro:
      "Browser-agent testing, data pipelines and connected business tools.",
    selected: "Selected work",
    input: "Starting point",
    output: "What was built",
    read: "Read the project",
    details: "How it works",
    supporting: "More ways I’ve applied this",
    offer: "What I can help you build",
    process: "One workflow first. A useful next step.",
    processLabel: "How we work",
    faq: "Before we talk",
    unavailable:
      "Project details are temporarily unavailable. You can still explore the portfolio or describe your workflow.",
    portfolio: "Explore the portfolio",
    prompt:
      "A useful starting point: where the information comes from, how often the task repeats and where the result should go.",
    email: "Or email me directly",
    other: "Also working on",
    screenshot: "Product screenshot",
  },
  de: {
    by: "Mit Alexander Fuerst · UX + Engineering",
    jump: "Arbeiten ansehen",
    proof: "Verschiedene Aufgaben. Funktionierende Software.",
    proofIntro:
      "Tests mit Browser-Agenten, Datenpipelines und verbundene Business-Tools.",
    selected: "Ausgewählte Arbeiten",
    input: "Ausgangspunkt",
    output: "Was umgesetzt wurde",
    read: "Zum Projekt",
    details: "So funktioniert es",
    supporting: "Weitere Anwendungen aus meiner Arbeit",
    offer: "Was ich für dich entwickeln kann",
    process: "Ein Ablauf zuerst. Ein sinnvoller nächster Schritt.",
    processLabel: "So arbeiten wir",
    faq: "Bevor wir sprechen",
    unavailable:
      "Projektdetails sind gerade nicht verfügbar. Du kannst trotzdem das Portfolio ansehen oder deinen Ablauf beschreiben.",
    portfolio: "Portfolio ansehen",
    prompt:
      "Ein guter Einstieg: Woher kommen die Informationen, wie oft wiederholt sich die Aufgabe und wohin soll das Ergebnis gehen?",
    email: "Oder schreib mir direkt",
    other: "Außerdem unterstütze ich bei",
    screenshot: "Produkt-Screenshot",
  },
};

export function AutomationLandingPage({
  locale,
  evidence,
}: {
  locale: ServiceLocale;
  evidence: ReturnType<typeof selectServiceEvidence>;
}) {
  const copy = serviceCopy["ai-automation"][locale];
  const t = ui[locale];
  const featured = evidence.filter((project) => project.story?.featured);
  const supporting = evidence.filter(
    (project) => project.story && !project.story.featured,
  );
  const enquiry = enquiryPath(
    { source: "service", service: "ai-automation", intent: "explore" },
    locale,
  );

  return (
    <Layout locale={locale}>
      <article lang={locale} className={`${shared.page} ${styles.page}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(serviceSchema("ai-automation", locale)),
          }}
        />
        <header
          className={`${shared.hero} ${shared.serviceHero} ${styles.hero}`}
        >
          <p className={shared.eyebrow}>01 / {copy.label}</p>
          <h1>{copy.headline}</h1>
          <p className={shared.intro}>{copy.intro}</p>
          <div className={shared.actions}>
            <Button
              href={enquiry}
              variant="cta"
              arrow
              className={shared.primary}
            >
              {copy.cta}
            </Button>
            <a href="#work" className={shared.textLink}>
              {t.jump} <span aria-hidden="true">↓</span>
            </a>
          </div>
          <p className={shared.micro}>{copy.reassurance}</p>
          <p className={shared.signature}>{t.by}</p>
        </header>

        {featured.length > 0 && (
          <nav className={styles.proofIndex} aria-label={t.selected}>
            {featured.map((project) => (
              <a href={`#case-${project.id}`} key={project.id}>
                <span>{project.story?.[locale].label}</span>
                <strong lang="en">{project.name.split(" – ")[0]}</strong>
                <span aria-hidden="true">↓</span>
              </a>
            ))}
          </nav>
        )}

        <section
          id="work"
          className={shared.section}
          aria-labelledby="work-heading"
        >
          <p className={shared.eyebrow}>02 / {t.selected}</p>
          <h2 id="work-heading">{t.proof}</h2>
          <p className={shared.sectionIntro}>{t.proofIntro}</p>
          <div className={styles.cases}>
            {featured.map((project) => {
              const story = project.story![locale];
              return (
                <article
                  id={`case-${project.id}`}
                  className={styles.case}
                  key={project.id}
                  aria-labelledby={`title-${project.id}`}
                >
                  <p className={shared.eyebrow}>{story.label}</p>
                  <h3 id={`title-${project.id}`}>
                    <Link href={project.href}>
                      {story.headline ?? project.name}{" "}
                      <span aria-hidden="true">↗</span>
                    </Link>
                  </h3>
                  <p className={styles.projectName} lang="en">
                    {project.name.split(" – ")[0]}
                  </p>
                  <p className={styles.context}>{story.context}</p>
                  {project.screenshot && (
                    <Link
                      href={project.href}
                      aria-label={`${t.read}: ${project.name}`}
                      className={styles.visual}
                    >
                      {/* Publication-backed assets use the existing authenticated image proxy. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={project.screenshot}
                        alt={`${t.screenshot}: ${project.name}`}
                        width={1440}
                        height={900}
                        loading="lazy"
                      />
                    </Link>
                  )}
                  <details className={styles.caseDetails}>
                    <summary>
                      {t.details}
                      <span aria-hidden="true">+</span>
                    </summary>
                    <p className={styles.summary}>{story.summary}</p>
                    <dl className={styles.flow}>
                      <div>
                        <dt>{t.input}</dt>
                        <dd>{story.input}</dd>
                      </div>
                      <div>
                        <dt>{t.output}</dt>
                        <dd>{story.output}</dd>
                      </div>
                    </dl>
                  </details>
                  <Link href={project.href} className={shared.textLink}>
                    {t.read} <span aria-hidden="true">↗</span>
                  </Link>
                </article>
              );
            })}
          </div>
          {supporting.length > 0 && (
            <aside
              className={styles.supporting}
              aria-labelledby="supporting-heading"
            >
              <h3 id="supporting-heading">{t.supporting}</h3>
              {supporting.map((project) => (
                <div key={project.id}>
                  <h4>
                    <Link href={project.href} lang="en">
                      {project.name} <span aria-hidden="true">↗</span>
                    </Link>
                  </h4>
                  <p className={styles.context}>
                    {project.story![locale].context}
                  </p>
                  <p>{project.story![locale].summary}</p>
                </div>
              ))}
            </aside>
          )}
          {!evidence.length && (
            <p className={styles.empty}>
              {t.unavailable}{" "}
              <Link href={localizedPath("/projects", locale)}>
                {t.portfolio} ↗
              </Link>
            </p>
          )}
        </section>

        <section className={shared.section} aria-labelledby="offer-heading">
          <p className={shared.eyebrow}>03 / {t.offer}</p>
          <h2 id="offer-heading">{copy.workHeading}</h2>
          <p className={shared.sectionIntro}>{copy.workIntro}</p>
          <div className={shared.deliverables}>
            {copy.deliverables.map((item, index) => (
              <div className={shared.deliverable} key={item.title}>
                <span className={shared.number} aria-hidden="true">
                  0{index + 1}
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <p className={shared.output}>{item.output}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <ServiceStartingOffer slug="ai-automation" locale={locale} />

        <section className={shared.section} aria-labelledby="process-heading">
          <p className={shared.eyebrow}>04 / {t.processLabel}</p>
          <h2 id="process-heading">{t.process}</h2>
          <ol className={shared.process}>
            {copy.process.map((step, index) => (
              <li key={step.title}>
                <span aria-hidden="true">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
          <p className={shared.sectionIntro}>{copy.fit}</p>
        </section>

        <section className={shared.section} aria-labelledby="faq-heading">
          <p className={shared.eyebrow}>05 / {t.faq}</p>
          <h2 id="faq-heading">{t.faq}</h2>
          <div className={shared.faq}>
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
          className={shared.closing}
          aria-labelledby="enquiry-heading"
        >
          <h2 id="enquiry-heading">{copy.closing}</h2>
          <p>{copy.closingText}</p>
          <p className={styles.prompt}>{t.prompt}</p>
          <Button
            href={enquiry}
            variant="cta"
            arrow
            className={shared.closingButton}
          >
            {copy.cta}
          </Button>
          <div className={shared.directEmail}>
            <span>{t.email}</span>
            <a href={serviceEmail("ai-automation", locale)}>
              alexander@fuerst.one
            </a>
          </div>
        </section>
        <nav className={shared.other} aria-label={t.other}>
          <span>{t.other}</span>
          <Link href={servicePath("product-interfaces", locale)}>
            {serviceCopy["product-interfaces"][locale].label} ↗
          </Link>
        </nav>
      </article>
    </Layout>
  );
}
