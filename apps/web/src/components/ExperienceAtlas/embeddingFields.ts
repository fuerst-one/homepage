import { publicProjectScale } from "@homepage/content/projectScale";
import type { LabProject } from "../ProjectLab/analysis";
import type { SpaceRecipe } from "./spaceTypes";

export const EMBEDDING_FIELDS = [
  {
    id: "shortDescription",
    label: "Short description",
    inputLabel: "Product",
    text: true,
  },
  { id: "summary", label: "Case context", inputLabel: "Context", text: true },
  { id: "buyerNeeds", label: "Client needs", inputLabel: "Client needs" },
  { id: "domains", label: "Use cases", inputLabel: "Use cases" },
  {
    id: "productTypes",
    label: "Product formats",
    inputLabel: "Product formats",
  },
  {
    id: "tools",
    label: "Technologies",
    inputLabel: "Tools and libraries",
  },
  { id: "languages", label: "Languages", inputLabel: "Programming languages" },
  { id: "capabilities", label: "Expertise", inputLabel: "Capabilities" },
  {
    id: "methods",
    label: "Methods & principles",
    inputLabel: "Methods",
  },
  { id: "ownership", label: "Ownership", inputLabel: "Ownership" },
  { id: "stages", label: "Delivery stages", inputLabel: "Delivery stages" },
  { id: "industries", label: "Sector", inputLabel: "Sector" },
  { id: "targetMarket", label: "Target market", inputLabel: "Target market" },
  { id: "usageContext", label: "Usage context", inputLabel: "Usage context" },
  {
    id: "deliveryModel",
    label: "Delivery model",
    inputLabel: "Delivery model",
  },
  {
    id: "aiCapabilities",
    label: "AI capabilities",
    inputLabel: "AI capabilities",
  },
  { id: "aiUsage", label: "AI usage", inputLabel: "AI usage" },
  {
    id: "contribution",
    label: "My contribution",
    inputLabel: "Contribution",
    text: true,
  },
  { id: "maintenance", label: "Maintenance", inputLabel: "Maintenance" },
  {
    id: "projectType",
    label: "Project setting",
    inputLabel: "Engagement type",
  },
  { id: "status", label: "Project status", inputLabel: "Project status" },
  {
    id: "deliveryEvidence",
    label: "Delivery evidence",
    inputLabel: "Delivery",
    text: true,
  },
  {
    id: "outcomeEvidence",
    label: "Outcome evidence",
    inputLabel: "Outcomes",
    text: true,
  },
  {
    id: "contributionBasis",
    label: "Contribution basis",
    inputLabel: "Contribution basis",
  },
  { id: "outcomeBasis", label: "Outcome basis", inputLabel: "Outcome basis" },
  { id: "name", label: "Project name", inputLabel: "Project name", text: true },
  {
    id: "startDate",
    label: "Start date",
    inputLabel: "Start date",
    text: true,
  },
  { id: "endDate", label: "End date", inputLabel: "End date", text: true },
  {
    id: "caseStudyWords",
    label: "Case study length",
    inputLabel: "Case study length (words)",
    text: true,
    numeric: true,
  },
  {
    id: "wowFactor",
    label: "Wow factor",
    inputLabel: "Wow factor",
    text: true,
    numeric: true,
  },
  {
    id: "complexity",
    label: "Complexity",
    inputLabel: "Complexity",
    text: true,
    numeric: true,
  },
  {
    id: "teamSize",
    label: "Team size",
    inputLabel: "Team size",
    text: true,
    numeric: true,
  },
  {
    id: "effort",
    label: "Effort",
    inputLabel: "Effort",
    text: true,
    numeric: true,
  },
  {
    id: "codeSloc",
    label: "Codebase size",
    inputLabel: "Codebase",
    text: true,
    numeric: true,
  },
  {
    id: "testSloc",
    label: "Test code size",
    inputLabel: "Test code",
    text: true,
    numeric: true,
  },
  {
    id: "sourceFiles",
    label: "Source files",
    inputLabel: "Source files",
    text: true,
    numeric: true,
  },
  {
    id: "workingPattern",
    label: "Working pattern",
    inputLabel: "Working pattern",
  },
] as const;
export type EmbeddingField = (typeof EMBEDDING_FIELDS)[number]["id"];
export const DEFAULT_FIELDS: Record<SpaceRecipe, EmbeddingField[]> = {
  product: ["domains", "productTypes"],
  engineering: ["tools", "languages"],
  practice: ["ownership", "projectType", "workingPattern", "teamSize"],
};
export function canonicalFields(value: unknown): EmbeddingField[] {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.length > EMBEDDING_FIELDS.length ||
    value.some((id) => !EMBEDDING_FIELDS.some((f) => f.id === id))
  )
    throw new Error("Choose valid fields");
  return EMBEDDING_FIELDS.filter((f) => value.includes(f.id)).map((f) => f.id);
}
export function fieldValues(
  project: LabProject,
  field: EmbeddingField,
): string[] {
  const scale = publicProjectScale(project.scale);
  const range = (low: number | null, high: number | null, unit: string) =>
    low !== null && high !== null
      ? `${low === high ? low : `${low}–${high}`} ${unit}`
      : low !== null
        ? `at least ${low} ${unit} (upper bound unrecorded)`
        : high !== null
          ? `up to ${high} ${unit} (lower bound unrecorded)`
          : "";
  const effort = range(scale.effortLow, scale.effortHigh, "person-days");
  const scaleText: Partial<Record<EmbeddingField, string>> = {
    complexity:
      scale.complexity === null
        ? ""
        : `${scale.complexity}/5 (${scale.complexityBasis === "assessment" ? "assessment" : "basis unspecified"})`,
    teamSize: range(scale.teamLow, scale.teamHigh, "people"),
    effort: effort
      ? `${effort} (${scale.effortBasis === "rebuild-estimate" ? "rebuild estimate" : "basis unspecified"})`
      : "",
    codeSloc: scale.codeSloc === null ? "" : `${scale.codeSloc} source lines`,
    testSloc: scale.testSloc === null ? "" : `${scale.testSloc} source lines`,
    sourceFiles: scale.sourceFiles === null ? "" : String(scale.sourceFiles),
    workingPattern: scale.workingPattern,
  };
  const value =
    field in scaleText
      ? scaleText[field]
      : field === "wowFactor"
        ? project.assessment?.wow
        : field in project.matching
          ? project.matching[field as keyof typeof project.matching]
          : project[field as keyof LabProject];
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? [value]
      : typeof value === "number" && Number.isFinite(value)
        ? [String(value)]
        : [];
  return [
    ...new Set(
      values
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim().replace(/\s+/g, " "))
        .filter(Boolean),
    ),
  ].sort();
}
export function fieldsInput(project: LabProject, fields: EmbeddingField[]) {
  return canonicalFields(fields)
    .flatMap((id) => {
      const values = fieldValues(project, id);
      return values.length
        ? [
            `${EMBEDDING_FIELDS.find((f) => f.id === id)!.inputLabel}: ${values.join("; ")}`,
          ]
        : [];
    })
    .join("\n");
}
export function fieldTerms(project: LabProject, fields: EmbeddingField[]) {
  return [
    ...new Set(
      fields.flatMap((id) => {
        const field = EMBEDDING_FIELDS.find((f) => f.id === id)!;
        return "text" in field ? [] : fieldValues(project, id);
      }),
    ),
  ];
}

/** Presence only: the editor does not need the raw field values for a preview. */
export function fieldAvailability(projects: LabProject[]) {
  return EMBEDDING_FIELDS.map(({ id }) => ({
    id,
    projectIds: projects
      .filter((p) => fieldValues(p, id).length > 0)
      .map((p) => p.id),
  }));
}

export function selectionCoverage(
  projectIds: string[],
  fields: EmbeddingField[],
  availability: ReturnType<typeof fieldAvailability>,
) {
  const present = new Map(
    availability.map((f) => [f.id, new Set(f.projectIds)]),
  );
  const missingByField = Object.fromEntries(
    EMBEDDING_FIELDS.map(({ id }) => [
      id,
      projectIds.filter((projectId) => !present.get(id)?.has(projectId)),
    ]),
  ) as Record<EmbeddingField, string[]>;
  const incompleteIds = projectIds.filter((id) =>
    fields.some((field) => !present.get(field)?.has(id)),
  );
  const incomplete = new Set(incompleteIds);
  return {
    missingByField,
    incompleteIds,
    readyIds: fields.length
      ? projectIds.filter((id) => !incomplete.has(id))
      : [],
  };
}
