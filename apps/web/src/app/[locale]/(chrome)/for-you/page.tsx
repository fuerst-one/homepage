import { notFound } from "next/navigation";
import type { LocaleParams } from "@homepage/content/i18n";
import { validateForYouPlan } from "@homepage/content/forYouPlan";
import { getLocale } from "../../../../server/i18n/getLocale";
import { pageMetadata } from "../../../../lib/seo";
import { FOR_YOU_ENABLED } from "../../../../lib/forYouEnabled";
import { Layout } from "../../../../components/Layout";
import { ForYouPlanView } from "../../../../components/ForYou/ForYouPlanView";
import { ForYouReviewAid } from "../../../../components/ForYou/ForYouReviewAid";
import { forYouExamples } from "../../../../components/ForYou/forYouExamples";
import { ForYouPage } from "../../../../components/ForYou/ForYouPage";
import {
  getForYouCandidates,
  getForYouCards,
  getForYouProjects,
} from "../../../../server/content/getForYouCandidates";
import type { Locale } from "@homepage/content/i18n";

type ForYouPageProps = LocaleParams & {
  searchParams: Promise<{ example?: string; shown?: string }>;
};

export async function generateMetadata({ params }: LocaleParams) {
  if (!FOR_YOU_ENABLED) notFound();
  const locale = await getLocale(params);
  return {
    ...pageMetadata(
      "/for-you",
      locale === "de" ? "Für dich" : "For you",
      locale === "de"
        ? "Eine Seite, aufgebaut um die Interessen deines Besucherprofils."
        : "A page arranged around the interests of your visitor profile.",
      { locale },
    ),
    robots: { index: false, follow: false },
  };
}

export default async function ForYouRoute({
  params,
  searchParams,
}: ForYouPageProps) {
  if (!FOR_YOU_ENABLED) notFound();
  const locale = await getLocale(params);
  const query = await searchParams;
  if (query.example !== undefined)
    return <ExampleReview locale={locale} query={query} />;
  // The profile lives in the browser, so the page picks its state there.
  return (
    <Layout locale={locale} wide>
      <ForYouPage locale={locale} cards={await getForYouCards(locale)} />
    </Layout>
  );
}

/** Hand-written example plans for reviewing the section library. */
async function ExampleReview({
  locale,
  query,
}: {
  locale: Locale;
  query: Awaited<ForYouPageProps["searchParams"]>;
}) {
  const example =
    forYouExamples.find(({ name }) => name === query.example) ??
    forYouExamples[0];
  const planLocale =
    (example.plan as { locale?: string }).locale === "de" ? "de" : "en";
  const { context, projects } = await getForYouCandidates(
    planLocale,
    example.visitor.openedProjects,
  );
  const result = validateForYouPlan(example.plan, context);
  const shown = Number.parseInt(query.shown ?? "", 10) || null;
  const sections = result.ok
    ? result.plan.sections.slice(0, shown ?? undefined)
    : [];
  const shownProjects = await getForYouProjects(sections, projects, planLocale);
  return (
    <Layout locale={locale} wide>
      <ForYouReviewAid
        locale={locale}
        examples={forYouExamples}
        current={example}
        shown={shown}
        dropped={result.dropped}
        error={result.ok ? null : result.reason}
      />
      {result.ok && (
        <ForYouPlanView
          locale={planLocale}
          sections={sections}
          pending={sections.length < result.plan.sections.length}
          projects={shownProjects}
          needs={context.needs}
        />
      )}
    </Layout>
  );
}
