import { ReactNode } from "react";
import { FaExternalLinkAlt } from "@react-icons/all-files/fa/FaExternalLinkAlt";
import { FaGithub } from "@react-icons/all-files/fa/FaGithub";
import { FaChartLine } from "@react-icons/all-files/fa/FaChartLine";
import Link from "next/link";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import { CvProject } from "@/server/notion/getCvProjects";
import { ProjectScreenshots } from "./ProjectScreenshots";
import { ProjectMetaTable } from "./ProjectMetaTable";
import { getJsxFormattedTextFromTextBlock } from "./getJsxFormattedTextFromTextBlock";
import { getProjectLogoSources } from "./getProjectLogoSources";
import { colors } from "./colors";
import { cn } from "@/lib/utils";

dayjs.extend(duration);
dayjs.extend(relativeTime);

export const ProjectDetails = ({
  project,
  heading,
  inDialog = false,
}: {
  project: CvProject;
  heading?: ReactNode;
  inDialog?: boolean;
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
            <div className="flex h-9 shrink-0 items-center justify-center border border-white/30 bg-white/20 px-3 text-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={primaryLogo}
                alt={`${name} logo`}
                className="h-5 w-auto object-contain grayscale [mix-blend-mode:screen]"
                loading="lazy"
              />
            </div>
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
            <DateRange startDate={startDate} endDate={endDate} />
          </span>
          {websiteUrl && (
            <Link
              href={websiteUrl}
              target="_blank"
              className="inline-flex items-center gap-2 border border-white/30 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-neutral-200 transition hover:border-white hover:text-white"
            >
              Website
              <FaExternalLinkAlt className="text-xs" />
            </Link>
          )}
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
        <ProjectMetaTable project={project} filterable={inDialog} />
      </div>
    </div>
  );
};

const DateRange = ({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string | null;
}) => {
  const startDateObj = dayjs(startDate);
  let endDateObj = endDate ? dayjs(endDate) : dayjs();
  if (endDateObj.isAfter(dayjs())) {
    endDateObj = dayjs();
  }
  const durationLabel = dayjs
    .duration(endDateObj.diff(startDateObj))
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
