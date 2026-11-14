import { getLocale } from "@/server/i18n/getLocale";
import { type LocaleParams } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import Link from "@/components/i18n/LocalizedLink";
import { Layout } from "@/components/Layout";
import { EnquiryFlow } from "@/components/Enquiry/EnquiryFlow";
import {
  ENQUIRY_INTENTS,
  enquiryContext,
  type EnquiryIntent,
} from "@/lib/enquiry";
import { projectPath } from "@/lib/seo";
import { flattenRichText } from "@/app/cv.pdf/flattenRichText";
import { IconLink } from "@/components/IconLink";
import { FaEnvelope } from "@react-icons/all-files/fa/FaEnvelope";
import { FaLinkedin } from "@react-icons/all-files/fa/FaLinkedin";
import { FaGithub } from "@react-icons/all-files/fa/FaGithub";
import { getCachedCvProjects } from "@/server/notion/getCachedCvProjects";

export const revalidate = 3600;

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await getLocale(params);
  return pageMetadata(
    "/contact",
    locale === "de"
      ? "Kontakt — Alexander Fuerst"
      : "Contact — Alexander Fuerst",
    locale === "de"
      ? "Beschreibe dein Projekt oder die gewünschte Zusammenarbeit mit Alexander Fuerst. Passende Erfahrung, Kontext und ein klarer nächster Schritt."
      : "Discuss your project or collaboration with Alexander Fuerst. Explore relevant work, share your context, and send a brief with a clear next step.",
    { locale },
  );
}

export default async function ContactPage({
  params,
  searchParams,
}: LocaleParams & {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale(params);
  const [projects, query] = await Promise.all([
    getCachedCvProjects(locale),
    searchParams,
  ]);
  const context = enquiryContext(query);
  const intent = ENQUIRY_INTENTS.includes(query.intent as EnquiryIntent)
    ? (query.intent as EnquiryIntent)
    : "";
  const evidence = projects.map((project) => ({
    id: project.id,
    name: project.name,
    href: projectPath(project, locale),
    summary: flattenRichText(project.description).slice(0, 280),
  }));

  return (
    <Layout locale={locale}>
      <div className="space-y-10">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {locale === "de"
              ? "Lass uns über dein Vorhaben sprechen"
              : "Let’s discuss your project"}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-neutral-300">
            {locale === "de"
              ? "Ein paar Fragen helfen uns, den passenden Einstieg zu finden. Du kannst auch direkt per E-Mail Kontakt aufnehmen."
              : "A few questions help us find a useful starting point. You can also contact me directly by email."}
          </p>
        </header>

        <EnquiryFlow
          locale={locale}
          projects={evidence}
          initialContext={context}
          initialIntent={intent}
        />
        <noscript>
          <p>
            {locale === "de"
              ? "Für das geführte Formular wird JavaScript benötigt. Schreibe mir alternativ eine E-Mail."
              : "The guided form needs JavaScript. You can email me directly instead."}
          </p>
        </noscript>

        <section className="space-y-4 border-t border-white/20 pt-8">
          <h2 className="text-xs uppercase tracking-[0.3em] text-neutral-400">
            {locale === "de"
              ? "Weitere Kontaktmöglichkeiten"
              : "Other ways to reach me"}
          </h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <IconLink
              href="mailto:alexander@fuerst.one"
              icon={FaEnvelope}
              className="flex-none"
            >
              alexander@fuerst.one
            </IconLink>
            <IconLink
              href="https://github.com/fuerst-one"
              icon={FaGithub}
              className="flex-none"
            >
              GitHub
            </IconLink>
            <IconLink
              href="https://www.linkedin.com/in/fuerst-one/"
              icon={FaLinkedin}
              className="flex-none"
            >
              LinkedIn
            </IconLink>
          </div>
          <p className="text-xs text-neutral-400">
            {locale === "de"
              ? "Lieber über eine Plattform? Du findest mich auf "
              : "Prefer a hiring platform? Find me on "}
            <Link
              href="/hire"
              className="underline underline-offset-4 hover:text-white"
            >
              Malt, freelancermap, and LinkedIn ↗
            </Link>
            .
          </p>
        </section>
      </div>
    </Layout>
  );
}
