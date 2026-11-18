import type { CvProject } from "@homepage/content/models";
import type { Locale } from "@homepage/content/i18n";
import { ArrowUpRight } from "lucide-react";
import Link from "../../i18n/LocalizedLink";
import { projectPath } from "../../../lib/seo";
import { relatedExperience } from "./projectDiscovery";

export function RelatedExperience({
  project,
  projects,
  locale,
}: {
  project: CvProject;
  projects: CvProject[];
  locale: Locale;
}) {
  const related = relatedExperience(project.id, projects, locale);
  if (!related.length) return null;
  const de = locale === "de";
  return (
    <section className="space-y-6" aria-labelledby="related-experience-title">
      <div className="max-w-2xl space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
          {de ? "Erfahrung übertragen" : "Experience that carries over"}
        </p>
        <h2
          id="related-experience-title"
          className="text-2xl font-semibold text-white"
        >
          {de ? "Verwandte Erfahrung" : "Related experience"}
        </h2>
        <p className="text-sm leading-relaxed text-neutral-400">
          {de
            ? "Andere Projekte zeigen, wo ähnliche Aufgaben wiederkehren – und wo sich die Anforderungen unterscheiden."
            : "Other projects show where similar challenges recur—and where the requirements differ."}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {related.map(({ project: other, title, connection, difference }) => (
          <article
            key={other.id}
            className="glass-panel flex flex-col gap-5 border border-white/20 p-6"
          >
            <div className="space-y-2">
              <p className="text-xs text-neutral-400">{other.name}</p>
              <h3 className="text-lg font-semibold leading-snug text-white">
                {title}
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-neutral-200">
              {connection}
            </p>
            <div className="border-l-2 border-white/25 pl-4">
              <p className="mb-2 text-xs font-medium text-neutral-400">
                {de ? "Was sich unterscheidet" : "What differs"}
              </p>
              <p className="text-sm leading-relaxed text-neutral-400">
                {difference}
              </p>
            </div>
            <Link
              href={projectPath(other, locale)}
              aria-label={`${de ? "Projekt ansehen" : "Explore project"}: ${other.name}`}
              className="mt-auto inline-flex items-center gap-2 self-start text-sm text-white underline decoration-white/30 underline-offset-4 hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              {de ? "Projekt ansehen" : "Explore project"}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
