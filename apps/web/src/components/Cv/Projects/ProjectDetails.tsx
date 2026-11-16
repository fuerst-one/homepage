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
import { colors } from "./colors";
import { cn } from "../../../lib/utils";
import { projectPath, SITE_URL } from "../../../lib/seo";
import { localeFromPath } from "@homepage/content/i18n";
import { caseStudyPageId } from "@homepage/content/projectCaseStudy";
import { Button } from "../../Button";

dayjs.extend(duration);
dayjs.extend(relativeTime);

export const ProjectDetails = ({
  project,
  heading,
  inDialog = false,
  locale = "en",
}: {
  project: CvProject;
  heading?: ReactNode;
  inDialog?: boolean;
  locale?: "en" | "de";
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
  const color = colors.projectType?.[projectType];
  const path = projectPath(project, locale);
  const hasCaseStudy = !!caseStudyPageId(project, localeFromPath(path));

  return (
    <div
      className={
        inDialog
          ? "flex max-h-[90vh] flex-col"
          : "flex flex-col border border-white/30 bg-black/85"
      }
    >
      <div className="space-y-3 border-b border-white/15 p-6">
        <div className="-mt-2 flex items-center justify-between gap-3 pr-12">
          <span
            className={cn(
              "inline-flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.2em]",
              color?.text,
            )}
          >
            <span
              className={cn(
                "inline-block size-2 shrink-0 rounded-[50%] border",
                color?.background,
                color?.border,
              )}
            />
            {projectType}
          </span>
          {primaryLogo && (
            <ProjectLogo src={primaryLogo} alt={`${name} logo`} size="detail" />
          )}
        </div>
        {heading ?? (
          <h1 className="text-3xl font-semibold text-white">{name}</h1>
        )}
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {screenshots && screenshots.length > 0 && (
          <ProjectScreenshots screenshots={screenshots} projectName={name} />
        )}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-neutral-400">
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
        {kpis && (
          <div className="flex items-start gap-2 text-sm text-white">
            <FaChartLine className="mt-1 shrink-0 text-base" />
            <span>{kpis}</span>
          </div>
        )}
        {description && (
          <div className="space-y-2 text-sm leading-relaxed text-neutral-200">
            {description}
          </div>
        )}
        {(hasCaseStudy || websiteUrl) && (
          <div className="flex flex-wrap items-center gap-3">
            {hasCaseStudy && (
              <Button href={`${path}/case-study`} prefetch={false} arrow>
                {locale === "de"
                  ? "Vollständige Fallstudie lesen"
                  : "Read full case study"}
              </Button>
            )}
            {websiteUrl && (
              <Button
                href={websiteUrl}
                target="_blank"
                className="border-white/30 bg-transparent text-neutral-200 hover:border-white hover:bg-transparent hover:text-white"
                arrow
              >
                {locale === "de" ? "Live-Website öffnen" : "Visit live site"}
              </Button>
            )}
          </div>
        )}
        <ProjectMetaTable
          project={project}
          filterable={inDialog}
          locale={locale}
        />
      </div>
      <div className="flex shrink-0 flex-col items-start gap-3 border-t border-white/15 p-6 text-sm">
        <Link
          href={path}
          className="break-all text-xs text-neutral-400 underline underline-offset-4"
        >
          {`${SITE_URL.replace("https://", "")}${path}`}
        </Link>
      </div>
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
