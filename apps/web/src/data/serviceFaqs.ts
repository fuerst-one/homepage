import type { Locale } from "@homepage/content/i18n";
import { serviceCopy, serviceSlugs, type ServiceSlug } from "./services";

export type ServiceFaq = {
  /** `<service>:<position>`, one-based; English and German entries share positions. */
  id: string;
  service: ServiceSlug;
  question: string;
  answer: string;
};

export function serviceFaqs(locale: Locale): ServiceFaq[] {
  return serviceSlugs.flatMap((service) =>
    serviceCopy[service][locale].questions.map((entry, index) => ({
      id: `${service}:${index + 1}`,
      service,
      ...entry,
    })),
  );
}

export const serviceFaq = (locale: Locale, id: string) =>
  serviceFaqs(locale).find((faq) => faq.id === id);
