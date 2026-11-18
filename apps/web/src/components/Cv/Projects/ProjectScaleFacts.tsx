import {
  publicProjectScale,
  effortBasisLabel,
  type ProjectScale,
} from "@homepage/content/projectScale";

export function ProjectScaleFacts({
  scale,
  locale = "en",
  compact = false,
}: {
  scale?: ProjectScale;
  locale?: "en" | "de";
  compact?: boolean;
}) {
  if (!scale) return null;
  const p = publicProjectScale(scale),
    de = locale === "de";
  const number = new Intl.NumberFormat(de ? "de-DE" : "en-GB", {
    maximumFractionDigits: 1,
  });
  const range = (low: number | null, high: number | null) =>
    low == null
      ? high == null
        ? null
        : `≤ ${number.format(high)}`
      : high == null
        ? `≥ ${number.format(low)}`
        : low === high
          ? number.format(low)
          : `${number.format(low)}–${number.format(high)}`;
  const team = range(p.teamLow, p.teamHigh),
    effort = range(p.effortLow, p.effortHigh);
  const facts = [
    team && {
      label: de ? "Teamgröße" : "Team size",
      value: `${team} ${p.teamLow === 1 && p.teamHigh === 1 ? (de ? "Person" : "person") : de ? "Personen" : "people"}`,
      note: de ? "Erfasster Projektkontext" : "Recorded project context",
    },
    p.complexity != null && {
      label: de ? "Komplexität" : "Complexity",
      value: `${p.complexity} / 5`,
      note:
        p.complexityBasis === "assessment"
          ? de
            ? "Einschätzung"
            : "Assessment"
          : de
            ? "Erfasster Wert; Basis nicht angegeben"
            : "Recorded score; basis unspecified",
    },
    !compact &&
      effort && {
        label: de ? "Aufwand" : "Effort",
        value: `${effort} ${de ? "Personentage" : "person-days"}`,
        note: effortBasisLabel(p.effortBasis, locale),
      },
    !compact &&
      p.codeSloc != null && {
        label: de ? "Codeumfang" : "Codebase size",
        value: `${number.format(p.codeSloc)} ${de ? "Quellcodezeilen" : "source lines"}`,
        note: de
          ? "Untersuchter Code; kann Team- und bestehenden Code enthalten"
          : "Inspected source; may include team and inherited code",
      },
  ].filter((fact): fact is { label: string; value: string; note: string } =>
    Boolean(fact),
  );
  if (!facts.length && (compact || !p.workingPattern)) return null;
  if (compact)
    return (
      <dl className="grid w-full grid-cols-2 gap-x-8 gap-y-3 sm:flex sm:w-auto sm:flex-wrap">
        {facts.map((f) => (
          <div key={f.label}>
            <dt className="text-[0.65rem] text-neutral-500">{f.label}</dt>
            <dd className="mt-1 text-xs text-neutral-200">
              {f.value}
              <small className="mt-1 block text-[0.6rem] text-neutral-500">
                {f.note}
              </small>
            </dd>
          </div>
        ))}
      </dl>
    );
  return (
    <section
      aria-label={
        de ? "Umfang und Zusammenarbeit" : "Scale and delivery context"
      }
      className="space-y-4 border border-white/20 bg-black/20 p-4"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
        {de ? "Umfang & Zusammenarbeit" : "Scale & delivery"}
      </p>
      <dl className="grid gap-5 sm:grid-cols-2">
        {facts.map((f) => (
          <div key={f.label}>
            <dt className="text-xs text-neutral-400">{f.label}</dt>
            <dd className="mt-1 text-lg text-neutral-100">
              {f.value}
              <span className="mt-1 block text-xs leading-relaxed text-neutral-400">
                {f.note}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      {p.workingPattern && (
        <p className="text-xs text-neutral-300">
          {de ? "Arbeitsweise" : "Working pattern"}:{" "}
          {de && p.workingPattern === "3 days/week"
            ? "3 Tage/Woche"
            : p.workingPattern}
        </p>
      )}
      {p.codeMeasuredAt && p.codeSloc != null && (
        <p className="text-xs text-neutral-400">
          {de ? "Code gemessen am" : "Code measured"} {p.codeMeasuredAt}.{" "}
          {de
            ? "Ohne Kommentare, Leerzeilen und Abhängigkeiten; Testcode separat."
            : "Excludes comments, blanks and dependencies; test code counted separately."}
        </p>
      )}
    </section>
  );
}
