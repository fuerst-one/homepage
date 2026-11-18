import "server-only";
import type { CvProject } from "@homepage/content/models";
import type { Locale } from "@homepage/content/i18n";
import { projectEditorialBrief } from "@homepage/content/projectEditorial";

export function ProjectBrief({
  project,
  locale,
}: {
  project: CvProject;
  locale: Locale;
}) {
  const brief = projectEditorialBrief(project, locale);
  if (!brief) return null;
  const de = locale === "de";
  const rows = [
    { label: de ? "Die Aufgabe" : "The problem", value: brief.problem },
    {
      label: de ? "Mein Beitrag" : "My contribution",
      value: brief.contribution,
    },
    {
      label: de ? "Stand der Umsetzung" : "Delivery state",
      value: brief.delivery,
    },
    { label: de ? "Ergebnis" : "Result", value: brief.result },
  ];
  return (
    <section
      aria-labelledby="case-brief-heading"
      className="mb-8 border-y border-white/20 py-6"
    >
      <h2
        id="case-brief-heading"
        className="text-xs uppercase tracking-[0.2em] text-neutral-400"
      >
        {de ? "Das Projekt auf einen Blick" : "The project at a glance"}
      </h2>
      <dl className="mt-5 grid gap-5 sm:grid-cols-2">
        {rows
          .filter((row) => row.value)
          .map((row) => (
            <div key={row.label}>
              <dt className="text-sm font-semibold text-white">{row.label}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-neutral-300">
                {row.value}
              </dd>
            </div>
          ))}
      </dl>
      <p className="mt-5 text-xs leading-relaxed text-neutral-400">
        {brief.note}
      </p>
    </section>
  );
}
