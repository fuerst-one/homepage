import type { Locale } from "@homepage/content/i18n";
import type { CvProject } from "@homepage/content/models";
import { ArrowUpRight } from "lucide-react";
import Link from "../i18n/LocalizedLink";
import preview from "../../content/lab-preview.json";
import { publishedExplorerData } from "./projectPresentation";
import type { SemanticDataset } from "./spaceTypes";
import { describeSpaceConnections } from "./spaceConnections";
import { spaceNodes } from "./spaceNodes";
import { CompactSpace3D } from "./CompactSpace3D";

export function ProjectExplorerPreview({
  projects: published,
  locale,
}: {
  projects: CvProject[];
  locale: Locale;
}) {
  const { projects, semanticData } = publishedExplorerData(
    { atlas: preview.atlas, semantic: preview.semantic as SemanticDataset },
    published,
    locale,
  );
  const space = semanticData.spaces.product;
  return (
    <section
      data-explorer-preview
      aria-label={locale === "de" ? "Projekt-Explorer" : "Project Explorer"}
    >
      <div className="glass-panel h-[30vh] min-h-[240px] w-full overflow-hidden border border-white/30">
        <CompactSpace3D
          nodes={spaceNodes(space, projects, locale)}
          groups={describeSpaceConnections(space, projects, "").groups}
        />
      </div>
      <Link
        href="/explorer"
        className="group flex min-h-11 items-center justify-between border-b border-white/20 py-3 text-xs text-neutral-300 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        {locale === "de" ? "Explorer öffnen" : "Open Explorer"}
        <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    </section>
  );
}
