import { getLocale } from "../../../../server/i18n/getLocale";
import { ReactNode } from "react";
import { Layout } from "../../../../components/Layout";

export default async function LegalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await getLocale(params);
  return (
    <Layout locale={locale}>
      <article className="space-y-6 text-sm leading-relaxed text-neutral-300">
        {children}
      </article>
    </Layout>
  );
}
