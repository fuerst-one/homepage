"use client";

import { useLocale } from "../../i18n/LocaleProvider";
import * as Dialog from "@radix-ui/react-dialog";
import { FaTimes } from "@react-icons/all-files/fa/FaTimes";
import { CvProject } from "@homepage/content/models";
import { useProjectFocusStore } from "./projectFocusStore";
import { useVisitorProfileStore } from "../../VisitorProfile/profileStore";
import { Button } from "../../Button";
import { ProjectScreenshots } from "./ProjectScreenshots";
import { projectHeading } from "./projectHeading";
import { projectPath } from "../../../lib/seo";
import { caseStudyPageId } from "@homepage/content/projectCaseStudy";
import { localeFromPath } from "@homepage/content/i18n";
import { caseLabel } from "@homepage/content/projectCase";
import { publicProjectScale } from "@homepage/content/projectScale";
import { ProjectScaleFacts } from "./ProjectScaleFacts";

export const ProjectDetailDialog = ({
  projects,
}: {
  projects: CvProject[];
}) => {
  const locale = useLocale();
  const liveProfileOpen = useVisitorProfileStore((s) => s.enabled && s.open);
  const focusedId = useProjectFocusStore((s) => s.focusedProjectId);
  const setFocused = useProjectFocusStore((s) => s.setFocusedProjectId);
  const project = focusedId
    ? (projects.find((p) => p.id === focusedId) ?? null)
    : null;

  const isOpen = !!project;
  const { title, subtitle } = project
    ? projectHeading(project.name)
    : { title: "", subtitle: "" };
  const path = project ? projectPath(project, locale) : "";
  const hasCaseStudy =
    !!project && !!caseStudyPageId(project, localeFromPath(path));

  const scale = publicProjectScale(project?.scale);
  const hasContext =
    !!project &&
    !!(
      project.matching?.ownership ||
      project.matching?.stages.length ||
      scale.teamLow ||
      scale.teamHigh ||
      scale.complexity
    );
  const actionClass =
    "h-11 w-full whitespace-nowrap sm:w-44 [&>span]:gap-2 [&>span]:px-3";
  const secondaryActionClass = `${actionClass} border-white/30 bg-transparent text-neutral-200 hover:border-white hover:bg-transparent hover:text-white`;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setFocused(null);
    }
  };

  return (
    <Dialog.Root
      modal={!liveProfileOpen}
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm" />
        <Dialog.Content
          data-profile-project={project?.id}
          style={liveProfileOpen ? { zIndex: 75 } : undefined}
          onInteractOutside={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest("[data-profile-ui]")
            )
              event.preventDefault();
          }}
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed left-1/2 top-1/2 z-[101] flex h-[90dvh] max-h-[90dvh] w-[min(64rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col border border-white/30 bg-black text-neutral-100 shadow-2xl outline-none [@media(max-height:500px)]:overflow-y-auto"
          aria-describedby={undefined}
        >
          {project ? (
            <>
              <div className="relative shrink-0 border-b border-white/15 px-5 py-4 pr-16 [@media(max-height:500px)]:sticky [@media(max-height:500px)]:top-0 [@media(max-height:500px)]:z-10 [@media(max-height:500px)]:bg-black">
                <Dialog.Title className="text-xl font-semibold text-white">
                  {title}
                </Dialog.Title>
                {subtitle && (
                  <p className="mt-1 text-sm leading-snug text-neutral-400">
                    {subtitle}
                  </p>
                )}
                <Dialog.Close
                  className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center border border-white/30 bg-black/60 text-neutral-200 transition hover:border-white hover:text-white focus-visible:border-white focus-visible:text-white focus-visible:outline-none"
                  aria-label={
                    locale === "de"
                      ? "Projektdetails schließen"
                      : "Close project details"
                  }
                >
                  <FaTimes className="text-base" />
                </Dialog.Close>
              </div>
              <div className="flex min-h-0 flex-1 flex-col p-2 sm:p-4 [@media(max-height:500px)]:h-48 [@media(max-height:500px)]:flex-none">
                {project.screenshots?.some(Boolean) ? (
                  <ProjectScreenshots
                    key={project.id}
                    screenshots={project.screenshots}
                    projectName={title}
                    projectId={project.id}
                    locale={locale}
                    viewer
                  />
                ) : (
                  <p className="m-auto text-sm text-neutral-400">
                    {locale === "de"
                      ? "Für dieses Projekt sind noch keine Bilder hinterlegt."
                      : "No images have been added for this project yet."}
                  </p>
                )}
              </div>
              {hasContext && (
                <section
                  aria-label={
                    locale === "de" ? "Projektkontext" : "Project context"
                  }
                  className="flex shrink-0 flex-wrap gap-x-8 gap-y-3 border-t border-white/15 px-5 py-3"
                >
                  <dl className="grid w-full grid-cols-2 gap-x-8 gap-y-3 sm:flex sm:w-auto sm:flex-wrap">
                    {project.matching?.ownership && (
                      <div>
                        <dt className="text-[0.65rem] text-neutral-500">
                          {locale === "de" ? "Meine Rolle" : "My role"}
                        </dt>
                        <dd className="mt-1 text-xs text-neutral-200">
                          {caseLabel(project.matching.ownership, locale)}
                        </dd>
                      </div>
                    )}
                    {!!project.matching?.stages.length && (
                      <div>
                        <dt className="text-[0.65rem] text-neutral-500">
                          {locale === "de" ? "Projektphase" : "Delivery stage"}
                        </dt>
                        <dd className="mt-1 text-xs text-neutral-200">
                          {project.matching.stages
                            .map((s) => caseLabel(s, locale))
                            .join(" · ")}
                        </dd>
                      </div>
                    )}
                  </dl>
                  <ProjectScaleFacts
                    scale={project.scale}
                    locale={locale}
                    compact
                  />
                </section>
              )}
              <div className="shrink-0 border-t border-white/15 px-4 py-3">
                <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                  <Button href={path} className={actionClass}>
                    {locale === "de" ? "Projektdetails" : "Project details"}
                  </Button>
                  {hasCaseStudy && (
                    <Button
                      href={`${path}/case-study`}
                      prefetch={false}
                      className={secondaryActionClass}
                    >
                      {locale === "de" ? "Fallstudie" : "Case study"}
                    </Button>
                  )}
                  {project.websiteUrl && (
                    <Button
                      href={project.websiteUrl}
                      target="_blank"
                      className={secondaryActionClass}
                    >
                      {locale === "de" ? "Live-Website" : "Live site"}
                    </Button>
                  )}
                  {project.githubUrl && (
                    <Button
                      href={project.githubUrl}
                      target="_blank"
                      className={secondaryActionClass}
                    >
                      GitHub
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <Dialog.Title className="sr-only">
              {locale === "de" ? "Projektdetails" : "Project details"}
            </Dialog.Title>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
