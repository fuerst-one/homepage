import { getLocale } from "../../../../server/i18n/getLocale";
import { ReactNode } from "react";
import { Layout } from "../../../../components/Layout";
import { LangSwitcher } from "../../../../components/Legal/LangSwitcher";

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
      <div className="mb-8 flex justify-end">
        <LangSwitcher />
      </div>
      <article className="space-y-6 text-sm leading-relaxed text-neutral-300">
        {children}
      </article>
    </Layout>
  );
}
