import { notFound } from "next/navigation";
import { isLocale, locales } from "@/lib/i18n";
import { isServiceSlug, serviceSlugs } from "@/data/services";
import { ServicePage } from "@/components/Services/ServicePage";
import { serviceMetadata } from "@/components/Services/serviceMetadata";

type Props = { params: Promise<{ locale: string; service: string }> };

// Retry an outage fallback instead of retaining an empty-evidence prerender forever.
export const revalidate = 60;

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    serviceSlugs.map((service) => ({ locale, service })),
  );
}
export async function generateMetadata({ params }: Props) {
  const { service, locale } = await params;
  if (!isServiceSlug(service) || !isLocale(locale)) notFound();
  return serviceMetadata(service, locale);
}
export default async function Page({ params }: Props) {
  const { service, locale } = await params;
  if (!isServiceSlug(service) || !isLocale(locale)) notFound();
  return <ServicePage slug={service} locale={locale} />;
}
