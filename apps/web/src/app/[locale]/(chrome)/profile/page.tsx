import type { LocaleParams } from "@homepage/content/i18n";
import { getLocale } from "../../../../server/i18n/getLocale";
import { pageMetadata } from "../../../../lib/seo";
import { Layout } from "../../../../components/Layout";
import { PageEyebrow } from "../../../../components/PageEyebrow";
import VisitorProfilePage from "../../../../components/VisitorProfile/VisitorProfilePage";

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await getLocale(params);
  return {
    ...pageMetadata(
      "/profile",
      locale === "de" ? "Dein Interessenprofil" : "Your interest profile",
      locale === "de"
        ? "Deine Interessen, ihre Grundlage und deine Einstellungen auf einen Blick."
        : "Inspect your interests, their evidence and your profile settings.",
      { locale },
    ),
    robots: { index: false, follow: true },
  };
}
export default async function ProfilePage({ params }: LocaleParams) {
  const locale = await getLocale(params);
  return (
    <Layout locale={locale} wide>
      <article className="content-page">
        <header className="content-page-heading">
          <PageEyebrow>
            {locale === "de" ? "Ein offenes Experiment" : "An open experiment"}
          </PageEyebrow>
          <h1 className="content-page-title">
            {locale === "de"
              ? "Deine Interessen nehmen Form an."
              : "Your interests, taking shape."}
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-neutral-300">
            {locale === "de"
              ? "Sieh, was dein Besuch vermittelt. Verstehe die Signale, passe dein Profil an und entscheide selbst über deine Daten."
              : "See what your visit communicates. Understand the signals, adjust your profile and decide what happens to your data."}
          </p>
        </header>
        <VisitorProfilePage />
      </article>
    </Layout>
  );
}
