import { enquiryPath } from "@homepage/content/enquiry";
import Link from "next/link";
import { Layout } from "../Layout";
import { Button } from "../Button";
import { StructuredData } from "../StructuredData";
import {
  serviceCopy,
  servicePath,
  type ServiceSlug,
} from "../../data/services";
import {
  serviceProducts,
  serviceProductEmail,
  serviceProductPath,
} from "../../data/serviceProducts";
import { localizedPath, type Locale } from "@homepage/content/i18n";
import { PERSON_ID, SITE_URL, projectPath } from "../../lib/seo";
import { getCachedCvProjects } from "../../server/content/getCachedCvProjects";
import { selectServiceEvidence } from "./serviceEvidence";
import styles from "./services.module.css";

export async function ServiceProductPage({
  slug,
  locale,
}: {
  slug: ServiceSlug;
  locale: Locale;
}) {
  const copy = serviceProducts[slug].copy[locale];
  const de = locale === "de";
  const email = serviceProductEmail(slug, locale);
  const enquiry = enquiryPath(
    {
      source: "service",
      service: slug,
      offer: serviceProducts[slug].segment as "review" | "assessment",
      intent: "improve",
    },
    locale,
  );
  const projects = await getCachedCvProjects(locale).catch((error: unknown) => {
    console.error("Starting-offer evidence unavailable", error);
    return [];
  });
  const evidence = selectServiceEvidence(projects, slug, (project) =>
    projectPath(project, locale),
  );
  const url = `${SITE_URL}${serviceProductPath(slug, locale)}`;
  const commercial = de
    ? "Das ist ein bezahlter, klar begrenzter Auftrag. Nach einem ersten Austausch vereinbaren wir Umfang, Format der Übergabe, Zeitplan und Honorar, bevor die Arbeit beginnt."
    : "This is a focused, paid engagement. After an initial conversation, we agree the scope, handover format, schedule and fee before work begins.";
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
              name: "Alexander Fuerst",
            },
            isRelatedTo: {
              "@type": "Service",
              "@id": `${SITE_URL}${servicePath(slug, locale)}#service`,
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
          <span>{copy.label}</span>
        </nav>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>{copy.label} · Alexander Fuerst</p>
          <h1>{copy.headline}</h1>
          <p className={styles.intro}>{copy.intro}</p>
          <div className={styles.actions}>
            <Button
              href={enquiry}
              variant="cta"
              arrow
              className={styles.primary}
            >
              {copy.cta}
            </Button>
            <a href="#deliverables" className={styles.textLink}>
              {de ? "Das bekommst du" : "What you take away"} ↓
            </a>
          </div>
          <p className={styles.micro}>
            {de
              ? "Ein bezahlter, klar begrenzter Auftrag. Honorar und Zeitplan vereinbaren wir vor dem Start."
              : "A focused, paid engagement. Fee and schedule agreed before work begins."}
          </p>
        </header>
        <aside
          className={styles.productSummary}
          aria-label={
            de ? "Deine Entscheidungsgrundlage" : "Your decision brief"
          }
        >
          <p className={styles.eyebrow}>
            {de ? "Die Entscheidung danach" : "The decision afterwards"}
          </p>
          <p className={styles.productDecision}>{copy.decision}</p>
          <ol>
            {copy.deliverables.map((item) => (
              <li key={item.title}>{item.title}</li>
            ))}
          </ol>
        </aside>
        <section className={styles.section} aria-labelledby="fit-heading">
          <p className={styles.eyebrow}>
            01 /{" "}
            {de
              ? "Passt das zu deinem Vorhaben?"
              : "Is this the right starting point?"}
          </p>
          <h2 id="fit-heading">
            {de
              ? "Für ein konkretes Problem. Mit einem klaren Ziel."
              : "A specific problem. A clear purpose."}
          </h2>
          <p className={styles.sectionIntro}>{copy.fit}</p>
        </section>
        <section
          id="deliverables"
          className={styles.section}
          aria-labelledby="deliverables-heading"
        >
          <p className={styles.eyebrow}>
            02 / {de ? "Die Übergabe" : "The handover"}
          </p>
          <h2 id="deliverables-heading">
            {de
              ? "Womit dein Team weiterarbeiten kann."
              : "What your team can work with."}
          </h2>
          <div className={styles.deliverables}>
            {copy.deliverables.map((item, index) => (
              <div key={item.title} className={styles.deliverable}>
                <span className={styles.number} aria-hidden="true">
                  0{index + 1}
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className={styles.section} aria-labelledby="inputs-heading">
          <p className={styles.eyebrow}>
            03 / {de ? "So starten wir" : "Getting started"}
          </p>
          <h2 id="inputs-heading">
            {de
              ? "Du kennst die Aufgabe. Wir klären den Umfang."
              : "You know the task. We define the scope."}
          </h2>
          <p className={styles.sectionIntro}>
            {de
              ? "Für ein erstes Gespräch reicht eine kurze Beschreibung. Für die eigentliche Arbeit brauchen wir:"
              : "A short description is enough for the first conversation. For the engagement itself, we will need:"}
          </p>
          <ul className={styles.productInputs}>
            {copy.inputs.map((input) => (
              <li key={input}>{input}</li>
            ))}
          </ul>
          <aside className={styles.fit}>
            <h3>{de ? "Der vereinbarte Rahmen" : "The agreed boundary"}</h3>
            <p>{copy.boundary}</p>
          </aside>
        </section>
        <section className={styles.section} aria-labelledby="evidence-heading">
          <p className={styles.eyebrow}>
            04 /{" "}
            {de
              ? "Erfahrung aus echten Projekten"
              : "Experience from real projects"}
          </p>
          <h2 id="evidence-heading">
            {de
              ? "Der Blick hinter die Empfehlung."
              : "The work behind the recommendations."}
          </h2>
          <p className={styles.sectionIntro}>
            {serviceCopy[slug][locale].evidenceIntro}
          </p>
          {evidence.map((project) => (
            <article key={project.id} className={styles.case}>
              <h3>
                <Link href={project.href}>{project.name} ↗</Link>
              </h3>
              <p>{project.clients.join(" · ")}</p>
              {project.screenshot && (
                <Link
                  href={project.href}
                  aria-label={`${de ? "Projekt ansehen" : "View project"}: ${project.name}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={styles.caseImage}
                    src={project.screenshot}
                    alt={`${de ? "Produkt-Screenshot" : "Product screenshot"}: ${project.name}`}
                    width={1440}
                    height={900}
                    loading="lazy"
                  />
                </Link>
              )}
              <Link href={project.href} className={styles.textLink}>
                {de
                  ? "Projekt und Ergebnisse ansehen"
                  : "Read the project and results"}{" "}
                ↗
              </Link>
            </article>
          ))}
          {!evidence.length && (
            <Link
              href={localizedPath("/projects", locale)}
              className={styles.textLink}
            >
              {de ? "Portfolio ansehen" : "Explore the portfolio"} ↗
            </Link>
          )}
        </section>
        <section className={styles.section} aria-labelledby="questions-heading">
          <p className={styles.eyebrow}>
            05 / {de ? "Vor der Beauftragung" : "Before you commit"}
          </p>
          <h2 id="questions-heading">
            {de ? "Ein überschaubarer Anfang." : "A manageable first step."}
          </h2>
          <div className={styles.faq}>
            <details>
              <summary>
                {de
                  ? "Was kostet es und wann kann es starten?"
                  : "What does it cost, and when can we start?"}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{commercial}</p>
            </details>
            <details>
              <summary>
                {de
                  ? "Müssen wir die Umsetzung auch beauftragen?"
                  : "Do we need to commission the implementation too?"}
                <span aria-hidden="true">+</span>
              </summary>
              <p>
                {de
                  ? "Nein. Die Übergabe soll deinem Team bei der nächsten Entscheidung helfen. Ihr könnt damit selbst weiterarbeiten, einen anderen Partner einbinden oder mit mir einen separaten Umsetzungsschritt vereinbaren."
                  : "No. The handover is intended to help your team make its next decision. You can continue internally, involve another partner or agree a separate implementation step with me."}
              </p>
            </details>
            <details>
              <summary>
                {de
                  ? "Was, wenn der Umfang noch unklar ist?"
                  : "What if we are not sure about the scope?"}
                <span aria-hidden="true">+</span>
              </summary>
              <p>
                {de
                  ? "Schick mir den Ablauf oder das Problem in ein paar Sätzen. Wir klären zuerst, ob dieser Einstieg passt. Größere Vorhaben können wir im Rahmen der umfassenderen Leistung besprechen."
                  : "Send a few lines about the flow or problem. We first establish whether this engagement is a useful fit. Larger projects can be discussed through the broader service."}
              </p>
            </details>
          </div>
        </section>
        <section className={styles.closing} aria-labelledby="enquiry-heading">
          <p className={styles.eyebrow}>
            {de ? "Der nächste Schritt" : "The next step"}
          </p>
          <h2 id="enquiry-heading">
            {de
              ? "Welchen Ablauf sollen wir uns ansehen?"
              : "Which flow should we look at?"}
          </h2>
          <p>
            {de
              ? "Ein Link oder ein paar Sätze reichen. Du sprichst direkt mit mir; wir klären Ziel und Umfang, bevor du die Arbeit beauftragst."
              : "A link or a few sentences is enough. You will speak directly with me; we establish the goal and scope before you commission the work."}
          </p>
          <Button
            href={enquiry}
            variant="cta"
            arrow
            className={styles.closingButton}
          >
            {copy.cta}
          </Button>
          <div className={styles.directEmail}>
            <a href={email}>alexander@fuerst.one</a>
            <p>
              {de
                ? "Keine E-Mail-App? Kopiere die Adresse in deinen E-Mail-Dienst."
                : "No email app? Copy the address into your preferred email service."}
            </p>
          </div>
        </section>
        <nav
          className={styles.other}
          aria-label={de ? "Umfassendere Leistung" : "Broader service"}
        >
          <span>
            {de ? "Du möchtest weitergehen?" : "Looking beyond the first step?"}
          </span>
          <Link href={servicePath(slug, locale)}>
            {serviceCopy[slug][locale].label} ↗
          </Link>
        </nav>
      </article>
    </Layout>
  );
}
