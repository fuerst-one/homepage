import { publicProjectScale } from "@homepage/content/projectScale";
import type { Locale } from "@homepage/content/i18n";
import type { AtlasProject } from "./model";
import type { SpaceLens } from "./spaceTypes";
import {
  DEFAULT_FIELDS,
  EMBEDDING_FIELDS,
  type EmbeddingField,
} from "./embeddingFields";
import { SCALE_FIELDS, type ScaleField } from "./scaleSpace";
import { atlasTerm, atlasText } from "./atlasCopy";

const SCALE_INPUTS: Record<ScaleField, EmbeddingField> = {
  complexity: "complexity",
  team: "teamSize",
  effort: "effort",
  code: "codeSloc",
};

/** Display the recorded inputs for this lens, never projected coordinates or inferred values. */
export function projectLensFacts(
  project: AtlasProject,
  lens: SpaceLens,
  locale: Locale,
  options: { fields?: EmbeddingField[]; scaleFields?: ScaleField[] } = {},
) {
  const de = locale === "de";
  const t = (value: string) => atlasText(locale, value);
  const p = publicProjectScale(project.scale);
  const number = new Intl.NumberFormat(de ? "de-DE" : "en-GB", {
    maximumFractionDigits: 1,
  });
  const range = (low: number | null, high: number | null) =>
    low === null
      ? high === null
        ? ""
        : `≤ ${number.format(high)}`
      : high === null
        ? `≥ ${number.format(low)}`
        : low === high
          ? number.format(low)
          : `${number.format(low)}–${number.format(high)}`;
  const team = range(p.teamLow, p.teamHigh),
    effort = range(p.effortLow, p.effortHigh);
  const values: Partial<
    Record<EmbeddingField, string | string[] | null | undefined>
  > = {
    domains: project.matching.domains,
    buyerNeeds: project.matching.buyerNeeds,
    stages: project.matching.stages,
    productTypes: project.productTypes,
    tools: project.tools,
    languages: project.languages,
    capabilities: project.capabilities,
    methods: project.methods,
    industries: project.industries,
    ownership: project.ownership,
    projectType: project.projectType,
    workingPattern: p.workingPattern,
    contribution: project.contribution,
    maintenance: project.maintenance,
    deliveryEvidence: project.delivery,
    outcomeEvidence: project.outcome,
    outcomeBasis: project.outcomeBasis,
    shortDescription: project.subtitle,
    summary: project.summary,
    name: project.name,
    startDate: project.startDate,
    endDate: project.endDate,
    wowFactor: project.wowFactor == null ? "" : `${project.wowFactor} / 10`,
    complexity: p.complexity === null ? "" : `${p.complexity} / 5`,
    teamSize:
      team &&
      `${team} ${p.teamLow === 1 && p.teamHigh === 1 ? (de ? "Person" : "person") : de ? "Personen" : "people"}`,
    effort: effort && `${effort} ${de ? "Personentage" : "person-days"}`,
    codeSloc:
      p.codeSloc === null
        ? ""
        : `${number.format(p.codeSloc)} ${de ? "Quellcodezeilen" : "source lines"}`,
    testSloc:
      p.testSloc === null
        ? ""
        : `${number.format(p.testSloc)} ${de ? "Quellcodezeilen" : "source lines"}`,
    sourceFiles: p.sourceFiles === null ? "" : number.format(p.sourceFiles),
  };
  const notes: Partial<Record<EmbeddingField, string>> = {
    complexity:
      p.complexityBasis === "assessment"
        ? de
          ? "Einschätzung"
          : "Assessment"
        : de
          ? "Basis nicht angegeben"
          : "Basis unspecified",
    teamSize: de ? "Erfasster Projektkontext" : "Recorded project context",
    effort:
      p.effortBasis === "rebuild-estimate"
        ? de
          ? "Geschätzter Neuaufbau, nicht historische Arbeitszeit"
          : "Estimated rebuild, not historical time spent"
        : de
          ? "Basis nicht angegeben; nicht mit Neuaufbau-Schätzungen vergleichbar"
          : "Basis unspecified; not comparable with rebuild estimates",
    codeSloc: de
      ? "Untersuchter Code; kann Team- und bestehenden Code enthalten"
      : "Inspected source; may include team and inherited code",
  };
  const fields =
    lens === "scale"
      ? (options.scaleFields ?? SCALE_FIELDS.map((f) => f.id)).map(
          (id) => SCALE_INPUTS[id],
        )
      : (options.fields ?? DEFAULT_FIELDS[lens]);
  return fields.map((id) => {
    const raw = values[id];
    const items = (Array.isArray(raw) ? raw : [raw]).filter(
      (value): value is string =>
        typeof value === "string" && Boolean(value.trim()),
    );
    return {
      id,
      label: t(EMBEDDING_FIELDS.find((field) => field.id === id)!.label),
      value: items.length
        ? items.map((value) => atlasTerm(locale, value)).join(" · ")
        : id in values
          ? t("Not recorded")
          : t("Not available in this view"),
      note: items.length ? notes[id] : undefined,
    };
  });
}
