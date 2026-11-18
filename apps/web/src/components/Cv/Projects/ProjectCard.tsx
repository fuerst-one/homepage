"use client";

import { recordVisitorInteraction } from "../../VisitorProfile/profileStore";

import { useLocale } from "../../i18n/LocaleProvider";
import { getJsxFormattedTextFromTextBlock } from "./getJsxFormattedTextFromTextBlock";
import { CvProject } from "@homepage/content/models";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/de";
import Link from "../../i18n/LocalizedLink";
import { FaImage } from "@react-icons/all-files/fa/FaImage";
import { FaExternalLinkAlt } from "@react-icons/all-files/fa/FaExternalLinkAlt";
import { FaChartLine } from "@react-icons/all-files/fa/FaChartLine";
import { FaGithub } from "@react-icons/all-files/fa/FaGithub";
import { FaArrowRight } from "@react-icons/all-files/fa/FaArrowRight";
import { getProjectLogoSources } from "./getProjectLogoSources";
import { ProjectLogo } from "./ProjectLogo";
import { ProjectIndustry } from "./ProjectIndustry";
import { useProjectFocusStore } from "./projectFocusStore";
import { projectPath } from "../../../lib/seo";
import { localeFromPath } from "@homepage/content/i18n";
import { caseStudyPageId } from "@homepage/content/projectCaseStudy";
import { projectHeading } from "./projectHeading";

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
  const openDialog = () => {
    recordVisitorInteraction("project_opened", id);
    setFocused(id);
  };
  const path = projectPath(project, locale);
  const hasCaseStudy = !!caseStudyPageId(project, localeFromPath(path));
  const { title, subtitle } = projectHeading(name);

  return (
    <article className="glass-panel group relative grid grid-cols-1 gap-5 border border-white/30 p-5 transition hover:border-white md:grid-cols-[16rem_minmax(0,1fr)] md:gap-6">
      <Link
        href={path}
        aria-label={
          locale === "de" ? `Projekt ansehen: ${name}` : `View project: ${name}`
        }
        className="absolute inset-0 z-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white print:hidden"
      />
      <div className="pointer-events-none relative z-10 flex min-w-0 flex-col gap-3">
        <Thumbnail
          src={thumbnail}
          projectName={name}
          locale={locale}
          onClick={openDialog}
          screenshotCount={screenshots?.length ?? 0}
        />
        {(websiteUrl || githubUrl || hasCaseStudy) && (
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            {websiteUrl && (
              <Link
                href={websiteUrl}
                data-profile-proof={`${id}|live`}
                target="_blank"
                className="inline-flex items-center gap-2 border border-white/30 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-neutral-200 transition hover:border-white hover:text-white print:ml-0 print:block"
              >
                Website
                <FaExternalLinkAlt className="text-xs print:hidden" />
                <span className="hidden print:inline">: {websiteUrl}</span>
              </Link>
            )}
            {hasCaseStudy && (
              <Link
                href={`${path}/case-study`}
                prefetch={false}
                className="inline-flex items-center gap-2 border border-white/30 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-neutral-200 transition hover:border-white hover:text-white print:ml-0 print:block"
              >
                {locale === "de" ? "Fallstudie" : "Case study"}
                <FaArrowRight
                  className="text-xs print:hidden"
                  aria-hidden="true"
                />
              </Link>
            )}
            {githubUrl && (
              <Link
                href={githubUrl}
                data-profile-proof={`${id}|github`}
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
        {kpis && (
          <div className="flex items-start gap-2 text-sm text-white">
            <FaChartLine className="mt-0.5 shrink-0 text-base" />
            <span className="line-clamp-3">{kpis}</span>
          </div>
        )}
      </div>
      <div className="pointer-events-none relative z-10 flex min-w-0 flex-col gap-4">
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <ProjectIndustry project={project} locale={locale} />
            {primaryLogo && (
              <ProjectLogo src={primaryLogo} alt={`${name} logo`} />
            )}
          </div>
          <h3 className="text-2xl font-semibold text-white">{title}</h3>
          {subtitle && (
            <p className="text-base leading-snug text-neutral-300">
              {subtitle}
            </p>
          )}
          <p className="text-xs text-neutral-400">
            {projectType} ·{" "}
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
  locale,
}: {
  src: string | undefined;
  projectName: string;
  onClick: () => void;
  screenshotCount: number;
  locale: "en" | "de";
}) => {
  const hasMultiple = screenshotCount > 1;
  if (!src)
    return (
      <div
        className="flex aspect-video w-full items-center justify-center border border-white/20 bg-black text-neutral-500 print:hidden"
        aria-hidden="true"
      >
        <FaImage className="text-2xl" />
      </div>
    );

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        locale === "de"
          ? `Bilder von ${projectName} ansehen`
          : `View images for ${projectName}`
      }
      className="group/thumb pointer-events-auto relative block aspect-video w-full overflow-hidden border border-white/20 bg-black transition hover:border-white focus-visible:border-white focus-visible:outline-none print:hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${projectName} preview`}
        loading="lazy"
        className="h-full w-full object-cover transition duration-500 group-hover/thumb:scale-105"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-[0.65rem] uppercase tracking-[0.3em] text-white opacity-0 transition group-hover/thumb:opacity-100">
        {locale === "de" ? "Bilder ansehen" : "View images"}
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
