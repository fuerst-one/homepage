"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { getJsxFormattedTextFromTextBlock } from "./getJsxFormattedTextFromTextBlock";
import { CvProject } from "@/server/notion/getCvProjects";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/de";
import Link from "@/components/i18n/LocalizedLink";
import { FaImage } from "@react-icons/all-files/fa/FaImage";
import { FaExternalLinkAlt } from "@react-icons/all-files/fa/FaExternalLinkAlt";
import { FaChartLine } from "@react-icons/all-files/fa/FaChartLine";
import { FaGithub } from "@react-icons/all-files/fa/FaGithub";
import { getProjectLogoSources } from "./getProjectLogoSources";
import { ProjectLogo } from "./ProjectLogo";
import { colors } from "./colors";
import { useProjectFocusStore } from "./projectFocusStore";
import { cn } from "@/lib/utils";
import { projectPath } from "@/lib/seo";
import { localeFromPath } from "@/lib/i18n";
import { caseStudyPageId } from "@/lib/projectCaseStudy";

dayjs.extend(duration);
dayjs.extend(relativeTime);

export const ProjectCard = ({ project }: { project: CvProject }) => {
  const locale = useLocale();
  const {
    id,
    name,
    projectType,
    websiteUrl,
    githubUrl,
    startDate,
    endDate,
    screenshots,
  } = project;

  const setFocused = useProjectFocusStore((s) => s.setFocusedProjectId);
  const description = getJsxFormattedTextFromTextBlock(project.description);
  const kpis = getJsxFormattedTextFromTextBlock(project.kpis);

  const logos = getProjectLogoSources(project);
  const primaryLogo = logos[0];
  const thumbnail = screenshots?.[0];
  const color = colors.projectType?.[projectType];
  const openDialog = () => setFocused(id);
  const path = projectPath(project, locale);
  const hasCaseStudy = !!caseStudyPageId(project, localeFromPath(path));

  return (
    <article className="group relative grid grid-cols-1 gap-5 border border-white/30 bg-black/85 p-5 transition hover:border-white md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
      <button
        type="button"
        onClick={openDialog}
        aria-label={
          locale === "de"
            ? `Details zu ${name} anzeigen`
            : `View details for ${name}`
        }
        className="absolute inset-0 z-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white print:hidden"
      />
      <div className="pointer-events-none relative z-10 flex min-w-0 flex-col gap-3">
        <Thumbnail
          src={thumbnail}
          projectName={name}
          onClick={openDialog}
          screenshotCount={screenshots?.length ?? 0}
        />
        {(websiteUrl || githubUrl) && (
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            {websiteUrl && (
              <Link
                href={websiteUrl}
                target="_blank"
                className="inline-flex items-center gap-2 border border-white/30 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-neutral-200 transition hover:border-white hover:text-white print:ml-0 print:block"
              >
                Website
                <FaExternalLinkAlt className="text-xs print:hidden" />
                <span className="hidden print:inline">: {websiteUrl}</span>
              </Link>
            )}
            {githubUrl && (
              <Link
                href={githubUrl}
                target="_blank"
                className="inline-flex items-center gap-2 border border-white/30 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-neutral-200 transition hover:border-white hover:text-white print:ml-0 print:block"
              >
                GitHub
                <FaGithub className="text-xs print:hidden" />
                <span className="hidden print:inline">: {githubUrl}</span>
              </Link>
            )}
          </div>
        )}
        {hasCaseStudy && (
          <Link
            href={`${path}/case-study`}
            prefetch={false}
            className="pointer-events-auto self-start text-sm text-neutral-200 underline underline-offset-4 hover:text-white"
          >
            {locale === "de" ? "Fallstudie lesen" : "Read case study"} →
          </Link>
        )}
        {kpis && (
          <div className="flex items-start gap-2 text-sm text-white">
            <FaChartLine className="mt-0.5 shrink-0 text-base" />
            <span className="line-clamp-3">{kpis}</span>
          </div>
        )}
      </div>
      <div className="pointer-events-none relative z-10 flex min-w-0 flex-col gap-3">
        <header className="space-y-1">
          <div className="flex items-center justify-between gap-3">
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
              <ProjectLogo src={primaryLogo} alt={`${name} logo`} />
            )}
          </div>
          <h3 className="text-2xl font-semibold text-white">
            <Link href={path} className="pointer-events-auto hover:underline">
              {name}
            </Link>
          </h3>
          <p className="text-xs text-neutral-400">
            <DateRange
              startDate={startDate}
              endDate={endDate}
              locale={locale}
            />
          </p>
        </header>
        {description && (
          <div className="line-clamp-5 text-sm leading-relaxed text-neutral-300">
            {description}
          </div>
        )}
      </div>
    </article>
  );
};

const Thumbnail = ({
  src,
  projectName,
  onClick,
  screenshotCount,
}: {
  src: string | undefined;
  projectName: string;
  onClick: () => void;
  screenshotCount: number;
}) => {
  const hasMultiple = screenshotCount > 1;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open details for ${projectName}`}
      className="group/thumb pointer-events-auto relative block aspect-video w-full overflow-hidden border border-white/20 bg-black transition hover:border-white focus-visible:border-white focus-visible:outline-none print:hidden"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`${projectName} preview`}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover/thumb:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-neutral-500">
          <FaImage className="text-2xl" />
        </div>
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-[0.65rem] uppercase tracking-[0.3em] text-white opacity-0 transition group-hover/thumb:opacity-100">
        View
      </span>
      {hasMultiple && (
        <span className="absolute bottom-2 right-2 border border-white/30 bg-black/70 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.25em] text-neutral-200">
          +{screenshotCount - 1}
        </span>
      )}
    </button>
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
