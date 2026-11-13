import type { Metadata } from "next";
import { pageMetadata, PERSON_ID, SITE_URL } from "@/lib/seo";
import { languageAlternates } from "@/lib/i18n";
import {
  serviceCopy,
  servicePath,
  type ServiceLocale,
  type ServiceSlug,
} from "@/data/services";

export function serviceAlternates(slug: ServiceSlug) {
  return languageAlternates(servicePath(slug, "en"));
}

export function serviceMetadata(
  slug: ServiceSlug,
  locale: ServiceLocale,
): Metadata {
  const copy = serviceCopy[slug][locale];
  return pageMetadata(servicePath(slug, locale), copy.title, copy.description, {
    locale,
  });
}

export function serviceSchema(slug: ServiceSlug, locale: ServiceLocale) {
  const copy = serviceCopy[slug][locale];
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}${servicePath(slug, locale)}#service`,
    name: copy.label,
    serviceType: copy.label,
    description: copy.description,
    url: `${SITE_URL}${servicePath(slug, locale)}`,
    inLanguage: locale,
    provider: {
      "@type": "Person",
      "@id": PERSON_ID,
      name: "Alexander Fuerst",
      url: SITE_URL,
    },
  };
}
