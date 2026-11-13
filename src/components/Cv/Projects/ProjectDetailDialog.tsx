"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import * as Dialog from "@radix-ui/react-dialog";
import { FaTimes } from "@react-icons/all-files/fa/FaTimes";
import { CvProject } from "@/server/notion/getCvProjects";
import { useProjectFocusStore } from "./projectFocusStore";
import { ProjectDetails } from "./ProjectDetails";

export const ProjectDetailDialog = ({
  projects,
}: {
  projects: CvProject[];
}) => {
  const locale = useLocale();
  const focusedId = useProjectFocusStore((s) => s.focusedProjectId);
  const setFocused = useProjectFocusStore((s) => s.setFocusedProjectId);
  const project = focusedId
    ? (projects.find((p) => p.id === focusedId) ?? null)
    : null;

  const isOpen = !!project;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setFocused(null);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[101] flex max-h-[90vh] w-[min(64rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col border border-white/30 bg-black text-neutral-100 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          aria-describedby={undefined}
        >
          {project ? (
            <ProjectDetails
              project={project}
              locale={locale}
              inDialog
              heading={
                <Dialog.Title className="text-3xl font-semibold text-white">
                  {project.name}
                </Dialog.Title>
              }
            />
          ) : (
            <Dialog.Title className="sr-only">
              {locale === "de" ? "Projektdetails" : "Project details"}
            </Dialog.Title>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
