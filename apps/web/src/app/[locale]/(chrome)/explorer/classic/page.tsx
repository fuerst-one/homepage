import { ClassicExplorePage } from "../../../../../components/ExperienceAtlas/ExplorePage";
import { getLocale } from "../../../../../server/i18n/getLocale";
import { pageMetadata } from "../../../../../lib/seo";
import { localizedPath } from "@homepage/content/i18n";

export const revalidate = 60;
export default ClassicExplorePage;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await getLocale(params);
  return {
    ...pageMetadata(
      localizedPath("/explorer/classic", locale),
      "Classic Explorer — FUERST.ONE",
      locale === "de"
        ? "Die bisherige Explorer-Ansicht zum Vergleich."
        : "The previous explorer, kept for comparison.",
      { locale },
    ),
    robots: { index: false, follow: true },
  };
}
