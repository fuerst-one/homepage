import { ReactNode } from "react";
import { FaGithub } from "@react-icons/all-files/fa/FaGithub";
import { FaChartLine } from "@react-icons/all-files/fa/FaChartLine";
import Link from "../../i18n/LocalizedLink";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/de";
import { CvProject } from "@homepage/content/models";
import { ProjectScreenshots } from "./ProjectScreenshots";
import { ProjectMetaTable } from "./ProjectMetaTable";
import { getJsxFormattedTextFromTextBlock } from "./getJsxFormattedTextFromTextBlock";
import { getProjectLogoSources } from "./getProjectLogoSources";
import { ProjectLogo } from "./ProjectLogo";
import { ProjectIndustry } from "./ProjectIndustry";
import { projectPath } from "../../../lib/seo";
import { localeFromPath } from "@homepage/content/i18n";
import { caseStudyPageId } from "@homepage/content/projectCaseStudy";
import { Button } from "../../Button";
import { caseLabel } from "@homepage/content/projectCase";
import type { CaseStudyExcerpt } from "./projectDiscovery";

dayjs.extend(duration);
dayjs.extend(relativeTime);

export const ProjectDetails = ({
  project,
  heading,
  inDialog = false,
  locale = "en",
  casePreview = [],
}: {
  project: CvProject;
  heading?: ReactNode;
  inDialog?: boolean;
  locale?: "en" | "de";
  casePreview?: CaseStudyExcerpt[];
}) => {
  const {
    name,
    projectType,
    websiteUrl,
    githubUrl,
    startDate,
    endDate,
    screenshots,
  } = project;

  const description = getJsxFormattedTextFromTextBlock(project.description);
  const kpis = getJsxFormattedTextFromTextBlock(project.kpis);
  const logos = getProjectLogoSources(project);
  const primaryLogo = logos[0];
  const path = projectPath(project, locale);
  const hasCaseStudy = !!caseStudyPageId(project, localeFromPath(path));

  const actions = (inDialog || hasCaseStudy || websiteUrl) && (
    <div className="flex flex-wrap items-center gap-3">
      {inDialog && (
        <Button href={path} arrow>
          {locale === "de" ? "Projekt im Detail ansehen" : "View full project"}
        </Button>
      )}
      {hasCaseStudy &&
        (inDialog ? (
          <Link
            href={`${path}/case-study`}
            prefetch={false}
            className="text-sm text-neutral-200 underline underline-offset-4"
          >
            {locale === "de" ? "Fallstudie lesen" : "Read case study"}
          </Link>
        ) : (
          <Button href={`${path}/case-study`} prefetch={false} arrow>
            {locale === "de"
              ? "Vollständige Fallstudie lesen"
              : "Read full case study"}
          </Button>
        ))}
      {websiteUrl &&
        (inDialog ? (
          <Link
            href={websiteUrl}
            target="_blank"
            className="text-sm text-neutral-200 underline underline-offset-4"
          >
            {locale === "de" ? "Live-Website öffnen" : "Visit live site"}
          </Link>
        ) : (
          <Button
            href={websiteUrl}
            target="_blank"
            className="border-white/30 bg-transparent text-neutral-200 hover:border-white hover:bg-transparent hover:text-white"
            arrow
          >
            {locale === "de" ? "Live-Website öffnen" : "Visit live site"}
          </Button>
        ))}
    </div>
  );

  return (
    <div
      className={
        inDialog
          ? "flex max-h-[90vh] flex-col"
          : "glass-panel flex flex-col border border-white/30"
      }
    >
      <div className="shrink-0 space-y-3 border-b border-white/15 p-6">
        <div className="-mt-2 flex items-center justify-between gap-3 pr-12">
          <ProjectIndustry project={project} locale={locale} />
          {primaryLogo && (
            <ProjectLogo src={primaryLogo} alt={`${name} logo`} size="detail" />
          )}
        </div>
        {heading ?? (
          <h1 className="text-3xl font-semibold text-white">{name}</h1>
        )}
      </div>
      <div
        className={`min-h-0 flex-1 space-y-6 p-6 ${inDialog ? "overflow-y-auto" : ""}`}
      >
        {screenshots && screenshots.length > 0 && (
          <ProjectScreenshots
            screenshots={screenshots}
            projectName={name}
            compact={inDialog}
          />
        )}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-neutral-400">
            {projectType} ·{" "}
            <DateRange
              startDate={startDate}
              endDate={endDate}
              locale={locale}
            />
          </span>
          {githubUrl && (
            <Link
              href={githubUrl}
              target="_blank"
              className="inline-flex items-center gap-2 border border-white/30 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-neutral-200 transition hover:border-white hover:text-white"
            >
              GitHub
              <FaGithub className="text-xs" />
            </Link>
          )}
        </div>
        {!inDialog && kpis && (
          <div className="flex items-start gap-2 text-sm text-white">
            <FaChartLine className="mt-1 shrink-0 text-base" />
            <span>{kpis}</span>
          </div>
        )}
        {description && (
          <div
            className={`space-y-2 text-sm leading-relaxed text-neutral-200 ${inDialog ? "line-clamp-4" : ""}`}
          >
            {description}
          </div>
        )}
        {project.matching?.ownership && (
          <p className="text-sm text-neutral-300">
            <span className="text-neutral-500">
              {locale === "de" ? "Meine Rolle: " : "My role: "}
            </span>
            {caseLabel(project.matching.ownership, locale)}
          </p>
        )}
        {!inDialog && casePreview.length > 0 && (
          <section
            className="space-y-5 border-t border-white/15 pt-6"
            aria-labelledby="project-work-title"
          >
            <h2
              id="project-work-title"
              className="text-xl font-semibold text-white"
            >
              {locale === "de"
                ? "Einblick in die Umsetzung"
                : "Inside the work"}
            </h2>
            {casePreview.map(({ title, text }) => (
              <div key={title} className="space-y-2">
                <h3 className="text-base font-medium text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-neutral-300">
                  {text}
                </p>
              </div>
            ))}
          </section>
        )}
        {!inDialog && actions}
        {!inDialog && (
          <details className="border-t border-white/15 pt-5">
            <summary className="cursor-pointer text-sm font-medium text-neutral-300">
              {locale === "de"
                ? "Projektdaten & Technologien"
                : "Project facts & technologies"}
            </summary>
            <div className="mt-4">
              <ProjectMetaTable
                project={project}
                filterable={false}
                locale={locale}
              />
            </div>
          </details>
        )}
      </div>
      {inDialog && (
        <div className="shrink-0 border-t border-white/15 bg-black p-5">
          {actions}
        </div>
      )}
    </div>
  );
};

const DateRange = ({
  startDate,
  endDate,
  locale,
}: {
  startDate: string;
  endDate: string | null;
  locale: "en" | "de";
}) => {
  const startDateObj = dayjs(startDate);
  let endDateObj = endDate ? dayjs(endDate) : dayjs();
  if (endDateObj.isAfter(dayjs())) {
    endDateObj = dayjs();
  }
  const durationLabel = dayjs
    .duration(endDateObj.diff(startDateObj))
    .locale(locale)
    .humanize();
  const startDateFormatted = startDateObj.format("YYYY/MM");
  const endDateFormatted = endDateObj.format("YYYY/MM");

  if (startDateFormatted === endDateFormatted) {
    return (
      <span>
        {startDateFormatted} · {durationLabel}
      </span>
    );
  }

  return (
    <span>
      {startDateFormatted} – {endDateFormatted} · {durationLabel}
    </span>
  );
};
