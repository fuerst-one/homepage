import { notFound } from "next/navigation";
import { isLocale, locales } from "@homepage/content/i18n";
import { pageMetadata } from "../../../../../../lib/seo";
import { isServiceSlug } from "../../../../../../data/services";
import {
  serviceProducts,
  serviceProductPath,
  isServiceProduct,
  serviceProductSlugs,
} from "../../../../../../data/serviceProducts";
import { ServiceProductPage } from "../../../../../../components/Services/ServiceProductPage";

type Props = {
  params: Promise<{ locale: string; service: string; product: string }>;
};
export const revalidate = 60;

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    serviceProductSlugs.map((service) => ({
      locale,
      service,
      product: serviceProducts[service].segment,
    })),
  );
}

async function validatedParams(params: Props["params"]) {
  const { locale, service, product } = await params;
  if (
    !isLocale(locale) ||
    !isServiceSlug(service) ||
    !isServiceProduct(service, product)
  )
    notFound();
  return { locale, service };
}

export async function generateMetadata({ params }: Props) {
  const { locale, service } = await validatedParams(params);
  const copy = serviceProducts[service].copy[locale];
  return pageMetadata(
    serviceProductPath(service, locale),
    copy.title,
    copy.description,
    { locale },
  );
}

export default async function Page({ params }: Props) {
  const { locale, service } = await validatedParams(params);
  return <ServiceProductPage slug={service} locale={locale} />;
}
