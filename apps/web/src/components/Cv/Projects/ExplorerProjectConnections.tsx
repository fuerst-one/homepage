import type { CvProject } from "@homepage/content/models";
import type { Locale } from "@homepage/content/i18n";
import { ArrowUpRight } from "lucide-react";
import Link from "../../i18n/LocalizedLink";
import { PageEyebrow } from "../../PageEyebrow";
import { projectDescription, projectPath } from "../../../lib/seo";
import { atlasTerm, atlasText } from "../../ExperienceAtlas/atlasCopy";
import preview from "../../../content/lab-preview.json";
import { explorerConnections } from "./explorerConnections";
import { projectHeading } from "./projectHeading";

export function ExplorerProjectConnections({
  project,
  projects,
  locale,
}: {
  project: CvProject;
  projects: CvProject[];
  locale: Locale;
}) {
  const connections = explorerConnections(
    project.id,
    projects,
    preview.atlas,
    locale,
  );
  if (!connections.length) return null;
  const t = (text: string) => atlasText(locale, text);
  const term = (text: string) => atlasTerm(locale, text);
  return (
    <section className="space-y-6" aria-labelledby="explorer-connections-title">
      <div className="space-y-2">
        <PageEyebrow>{t("Follow a connection")}</PageEyebrow>
        <h2
          id="explorer-connections-title"
          className="text-2xl font-semibold text-white"
        >
          {t("Different fields. Familiar challenges. ")}
        </h2>
        <p className="text-sm leading-relaxed text-neutral-400">
          {t("Shared needs and methods connect this work ")}
          {t("to other industries in the portfolio. ")}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {connections.map(({ project: other, reasons, industries }) => (
          <article
            key={other.id}
            className="glass-panel bg-card/40 flex flex-col gap-4 border border-white/30 p-5"
          >
            <p className="text-xs leading-relaxed text-neutral-400">
              {industries.map(term).join(" / ")}
            </p>
            <h3 className="break-words text-lg font-semibold leading-snug text-white">
              {projectHeading(other.name).title}
            </h3>
            <p
              className="text-sm leading-relaxed text-neutral-400"
              lang={other.contentLocale ?? "en"}
            >
              {projectDescription(other)}
            </p>
            <div className="space-y-2 border-t border-white/15 pt-4">
              <p className="text-xs text-neutral-400">{t("The connection")}</p>
              <p className="text-xs leading-relaxed text-neutral-200">
                {reasons.map(term).join(" · ")}
              </p>
            </div>
            <Link
              href={projectPath(other, locale)}
              aria-label={`${locale === "de" ? "Verbundenes Projekt ansehen" : "View connected project"}: ${other.name}`}
              className="mt-auto inline-flex items-center gap-2 self-start py-2 text-sm text-white underline decoration-white/30 underline-offset-4 hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              {locale === "de" ? "Projekt ansehen" : "View project"}
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
