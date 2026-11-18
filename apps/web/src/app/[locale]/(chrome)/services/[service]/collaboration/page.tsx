import { personName } from "@homepage/content/i18n";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@homepage/content/i18n";
import { isServiceSlug, serviceSlugs } from "../../../../../../data/services";
import {
  serviceCollaborations,
  serviceCollaborationPath,
} from "../../../../../../data/serviceCollaborations";
import { ServiceCollaborationPage } from "../../../../../../components/Services/ServiceCollaborationPage";
import { pageMetadata } from "../../../../../../lib/seo";

type Props = { params: Promise<{ locale: string; service: string }> };
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    serviceSlugs.map((service) => ({ locale, service })),
  );
}

async function validatedParams(params: Props["params"]) {
  const { locale, service } = await params;
  if (!isLocale(locale) || !isServiceSlug(service)) notFound();
  return { locale, service };
}

export async function generateMetadata({ params }: Props) {
  const { locale, service } = await validatedParams(params);
  const copy = serviceCollaborations[service][locale];
  return pageMetadata(
    serviceCollaborationPath(service, locale),
    `${copy.label} — ${personName(locale)}`,
    copy.description,
    { locale },
  );
}

export default async function Page({ params }: Props) {
  const { locale, service } = await validatedParams(params);
  return <ServiceCollaborationPage slug={service} locale={locale} />;
}
