import { getLocale } from "@/server/i18n/getLocale";
import { getSiteCopy } from "@/server/notion/getSiteCopy";
import { type LocaleParams } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import Link from "@/components/i18n/LocalizedLink";
import { Layout } from "@/components/Layout";
import { PresetPicker, PresetOption } from "@/components/Cv/PresetPicker";
import { IconLink } from "@/components/IconLink";
import { FaEnvelope } from "@react-icons/all-files/fa/FaEnvelope";
import { FaLinkedin } from "@react-icons/all-files/fa/FaLinkedin";
import { FaGithub } from "@react-icons/all-files/fa/FaGithub";
import { getCachedCvProjects } from "@/server/notion/getCachedCvProjects";
import { filterProjects } from "@/components/Cv/Projects/Filter/utils";
import { CV_PRESET_ORDER, CV_PRESETS } from "@/components/Cv/cvPresets";

export const revalidate = 3600;

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await getLocale(params);
  const copy = await getSiteCopy(locale);
  return pageMetadata(
    "/contact",
    copy["contact.title"],
    copy["contact.description"],
    { locale },
  );
}

export default async function ContactPage({ params }: LocaleParams) {
  const locale = await getLocale(params);
  const [projects, copy] = await Promise.all([
    getCachedCvProjects(locale),
    getSiteCopy(locale),
  ]);
  const presets: PresetOption[] = CV_PRESET_ORDER.map((id) => {
    const preset = CV_PRESETS[id];
    const matched = filterProjects(projects, preset.filter);
    const matchedCount = preset.topN
      ? Math.min(preset.topN, matched.length)
      : matched.length;
    return { ...preset, matchedCount };
  });

  return (
    <Layout locale={locale}>
      <div className="space-y-10">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {copy["contact.heading"]}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-neutral-300">
            {copy["contact.intro"]}
          </p>
        </header>

        <PresetPicker presets={presets} />

        <section className="space-y-4 border-t border-white/20 pt-8">
          <h2 className="text-xs uppercase tracking-[0.3em] text-neutral-400">
            {locale === "de"
              ? "Weitere Kontaktmöglichkeiten"
              : "Other ways to reach me"}
          </h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <IconLink
              href="mailto:alexander@fuerst.one"
              icon={FaEnvelope}
              className="flex-none"
            >
              alexander@fuerst.one
            </IconLink>
            <IconLink
              href="https://github.com/fuerst-one"
              icon={FaGithub}
              className="flex-none"
            >
              GitHub
            </IconLink>
            <IconLink
              href="https://www.linkedin.com/in/fuerst-one/"
              icon={FaLinkedin}
              className="flex-none"
            >
              LinkedIn
            </IconLink>
          </div>
          <p className="text-xs text-neutral-400">
            {locale === "de"
              ? "Lieber über eine Plattform? Du findest mich auf "
              : "Prefer a hiring platform? Find me on "}
            <Link
              href="/hire"
              className="underline underline-offset-4 hover:text-white"
            >
              Malt, freelancermap, and LinkedIn ↗
            </Link>
            .
          </p>
        </section>
      </div>
    </Layout>
  );
}
