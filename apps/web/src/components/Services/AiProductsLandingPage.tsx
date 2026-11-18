import Link from "next/link";
import { enquiryPath } from "@homepage/content/enquiry";
import { localizedPath } from "@homepage/content/i18n";
import { Layout } from "../Layout";
import { Button } from "../Button";
import { aiProductCases } from "../../data/aiProducts";
import {
  serviceCopy,
  serviceEmail,
  servicePath,
  type ServiceLocale,
} from "../../data/services";
import { serializeJsonLd } from "../../lib/seo";
import { serviceSchema } from "./serviceMetadata";
import type { getServiceEvidence } from "../../server/content/getServiceEvidence";
import { ServiceProjectVisuals } from "./ServiceProjectVisuals";
import shared from "./services.module.css";
import styles from "./ai-products.module.css";

const ui = {
  en: {
    jump: "Explore the possibilities",
    by: "With Alexander Fuerst · product thinking, UX & engineering",
    example: "An example trip brief",
    brief:
      "A week away. Mountain roads, good food and quieter places. Leave room to explore.",
    visualLink: "Explore RoadTrippin",
    customer: "For your customers",
    customerText:
      "New ways to create, discover, plan and act inside your product.",
    team: "For your team",
    teamText:
      "Internal tools that connect knowledge, understand requests and support specialist work.",
    work: "AI in working products",
    workHeading: "Different products. Useful possibilities.",
    read: "Explore the project",
    input: "The starting point",
    capability: "What AI does",
    result: "What people can do",
    offer: "From opportunity to integration",
    process: "Start with your product. Find the next step.",
    processLabel: "How we work",
    fit: "A good place to start",
    faq: "Before we talk",
    faqLabel: "Practical questions",
    next: "Your next step",
    email: "Or email me directly",
    other: "Also working on",
    unavailable:
      "Project details are temporarily unavailable. You can still explore the portfolio or tell me about your product.",
    portfolio: "Explore the portfolio",
  },
  de: {
    jump: "Möglichkeiten entdecken",
    by: "Mit Alexander Fuerst · Produktdenken, UX & Entwicklung",
    example: "Ein Beispiel für einen Reisewunsch",
    brief:
      "Eine Woche raus. Bergstraßen, gutes Essen und ruhige Orte. Mit Platz zum Entdecken.",
    visualLink: "RoadTrippin entdecken",
    customer: "Für deine Kunden",
    customerText:
      "Neue Wege zum Gestalten, Entdecken, Planen und Handeln in deinem Produkt.",
    team: "Für dein Team",
    teamText:
      "Interne Tools, die Wissen verbinden, Anfragen verstehen und Fachaufgaben unterstützen.",
    work: "KI in funktionierenden Produkten",
    workHeading: "Verschiedene Produkte. Sinnvolle Möglichkeiten.",
    read: "Zum Projekt",
    input: "Der Ausgangspunkt",
    capability: "Was KI übernimmt",
    result: "Was Menschen damit tun können",
    offer: "Von der Möglichkeit zur Integration",
    process: "Mit deinem Produkt anfangen. Den nächsten Schritt finden.",
    processLabel: "So arbeiten wir",
    fit: "Ein guter Ausgangspunkt",
    faq: "Bevor wir sprechen",
    faqLabel: "Praktische Fragen",
    next: "Dein nächster Schritt",
    email: "Oder schreib mir direkt",
    other: "Außerdem unterstütze ich bei",
    unavailable:
      "Projektdetails sind gerade nicht verfügbar. Du kannst trotzdem das Portfolio ansehen oder mir von deinem Produkt erzählen.",
    portfolio: "Portfolio ansehen",
  },
};

export function AiProductsLandingPage({
  locale,
  evidence,
}: {
  locale: ServiceLocale;
  evidence: Awaited<ReturnType<typeof getServiceEvidence>>;
}) {
  const copy = serviceCopy["ai-products"][locale];
  const t = ui[locale];
  const enquiry = enquiryPath(
    { source: "service", service: "ai-products", intent: "explore" },
    locale,
  );
  const roadtrippin = evidence.find(
    (project) => project.id === aiProductCases[0].id,
  );

  return (
    <Layout locale={locale}>
      <article lang={locale} className={`${shared.page} ${styles.page}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(serviceSchema("ai-products", locale)),
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

        {!!roadtrippin?.heroVisuals.length && (
          <figure className={styles.preview}>
            <div className={styles.brief}>
              <p className={shared.eyebrow}>{t.example}</p>
              <blockquote>{t.brief}</blockquote>
              <span aria-hidden="true">↓</span>
            </div>
            <ServiceProjectVisuals
              visuals={roadtrippin.heroVisuals}
              projectName={roadtrippin.name}
              projectId={roadtrippin.id}
              initialDescriptions={roadtrippin.imageDescriptions}
              locale={locale}
              priority
            />
            <figcaption>
              <Link href={roadtrippin.href}>{t.visualLink} ↗</Link>
            </figcaption>
          </figure>
        )}

        <div className={styles.audiences}>
          <div>
            <h2>{t.customer}</h2>
            <p>{t.customerText}</p>
          </div>
          <div>
            <h2>{t.team}</h2>
            <p>{t.teamText}</p>
          </div>
        </div>

        <section
          id="work"
          className={shared.section}
          aria-labelledby="work-heading"
        >
          <p className={shared.eyebrow}>02 / {t.work}</p>
          <h2 id="work-heading">{t.workHeading}</h2>
          <p className={shared.sectionIntro}>{copy.evidenceIntro}</p>
          {evidence.map((project, index) => {
            const story = aiProductCases.find(
              (item) => item.id === project.id,
            )?.[locale];
            if (!story) return null;
            return (
              <article
                key={project.id}
                id={`case-${project.id}`}
                className={styles.case}
                aria-labelledby={`case-title-${project.id}`}
              >
                <p className={shared.eyebrow}>
                  0{index + 1} / {story.label}
                </p>
                <h3 id={`case-title-${project.id}`}>
                  <Link href={project.href}>
                    {story.headline} <span aria-hidden="true">↗</span>
                  </Link>
                </h3>
                <p className={styles.context}>{story.context}</p>
                <p className={styles.summary}>{story.summary}</p>
                <dl className={styles.flow}>
                  <div>
                    <dt>{t.input}</dt>
                    <dd>{story.input}</dd>
                  </div>
                  <div>
                    <dt>{t.capability}</dt>
                    <dd>{story.capability}</dd>
                  </div>
                  <div>
                    <dt>{t.result}</dt>
                    <dd>{story.result}</dd>
                  </div>
                </dl>
                {(project.id !== roadtrippin?.id ||
                  project.visuals.some(
                    (visual) => visual.kind === "illustration",
                  )) && (
                  <ServiceProjectVisuals
                    visuals={project.visuals}
                    projectName={project.name}
                    projectId={project.id}
                    initialDescriptions={project.imageDescriptions}
                    locale={locale}
                  />
                )}
                <Link href={project.href} className={shared.textLink}>
                  {t.read} <span aria-hidden="true">↗</span>
                </Link>
              </article>
            );
          })}
          {!evidence.length && (
            <p className={styles.empty}>
              {t.unavailable}{" "}
              <Link
                href={localizedPath("/projects", locale)}
                className={shared.textLink}
              >
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
              <div key={item.title} className={shared.deliverable}>
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
          <aside className={shared.fit}>
            <h3>{t.fit}</h3>
            <p>{copy.fit}</p>
          </aside>
        </section>

        <section className={shared.section} aria-labelledby="faq-heading">
          <p className={shared.eyebrow}>05 / {t.faqLabel}</p>
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

        <section className={shared.closing} aria-labelledby="enquiry-heading">
          <p className={shared.eyebrow}>06 / {t.next}</p>
          <h2 id="enquiry-heading">{copy.closing}</h2>
          <p>{copy.closingText}</p>
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
            <a href={serviceEmail("ai-products", locale)}>
              alexander@fuerst.one
            </a>
          </div>
        </section>

        <nav className={shared.other} aria-label={t.other}>
          <span>{t.other}</span>
          {(["product-interfaces", "ai-automation"] as const).map((slug) => (
            <Link key={slug} href={servicePath(slug, locale)}>
              {serviceCopy[slug][locale].label} ↗
            </Link>
          ))}
        </nav>
      </article>
    </Layout>
  );
}
