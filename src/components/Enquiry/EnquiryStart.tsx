import { ENQUIRY_INTENTS, enquiryPath } from "@/lib/enquiry";
import type { Locale } from "@/lib/i18n";
import Link from "@/components/i18n/LocalizedLink";
import { enquiryCopy, intentLabels } from "./enquiryCopy";

export function EnquiryStart({ locale }: { locale: Locale }) {
  return (
    <section
      className="mx-auto w-full max-w-4xl space-y-6 px-6 py-16"
      aria-labelledby="enquiry-start-title"
    >
      <h2
        id="enquiry-start-title"
        className="max-w-2xl text-2xl font-medium leading-relaxed text-white"
      >
        {enquiryCopy[locale].question}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {ENQUIRY_INTENTS.map((intent) => (
          <Link
            key={intent}
            href={enquiryPath({ source: "home", intent }, locale)}
            className="flex min-h-16 items-center justify-between gap-4 border border-white/30 bg-black/80 px-5 py-4 text-sm text-neutral-200 transition hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            {intentLabels[locale][intent]}
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
