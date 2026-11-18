import {
  readNotionProjectScale,
  publicProjectScale,
} from "../../packages/content/src/projectScale";
import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  projectSimilarities,
  type AuditFinding,
  type LabProject,
  type LabSnapshot,
} from "../../apps/web/src/components/ProjectLab/analysis";

type Row = Record<string, unknown>;
type Inputs = {
  database: unknown;
  notion: unknown;
  commercial: unknown;
  privateAudit: unknown;
  comparison?: unknown;
};
const obj = (value: unknown): Row =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const str = (value: unknown): string =>
  typeof value === "string" ? value : "";
const strings = (value: unknown): string[] => [
  ...new Set(list(value).map(str).filter(Boolean)),
];
const rows = (value: unknown): Row[] => list(value).map(obj);
const propertyText = (properties: Row, key: string) =>
  rows(obj(properties[key]).rich_text)
    .map((t) => str(t.plain_text) || str(obj(t.text).content))
    .join("");
const selected = (properties: Row, key: string) =>
  str(obj(obj(properties[key]).select).name);
const multi = (properties: Row, key: string) =>
  strings(rows(obj(properties[key]).multi_select).map((t) => t.name));
function blockText(value: unknown): string {
  return rows(value)
    .map((block) =>
      [
        rows(block.richText)
          .map((t) => str(t.plain_text))
          .join(""),
        rows(block.caption)
          .map((t) => str(t.plain_text))
          .join(""),
        blockText(block.children),
      ]
        .filter(Boolean)
        .join(" "),
    )
    .join(" ");
}
const hidden = (page: Row) =>
  page.hidden === true ||
  page.archived === true ||
  page.is_archived === true ||
  page.in_trash === true ||
  obj(obj(page.properties).Hidden).checkbox === true;

function finding(
  projectId: string,
  value: Row,
  kind: AuditFinding["kind"],
  tag: string,
): AuditFinding {
  const evidence = rows(value.evidence);
  return {
    projectId,
    property: str(value.field),
    tag,
    kind,
    confidence: str(value.confidence),
    evidence:
      str(value.reason) ||
      evidence
        .map((e) => str(e.reason))
        .filter(Boolean)
        .join(" ") ||
      str(value.evidenceClass),
    paths: evidence.flatMap((e) => {
      const path = str(e.path);
      return path
        ? [`${path}${Number.isInteger(e.line) ? `:${e.line}` : ""}`]
        : [];
    }),
    caveat: [
      str(value.caveat),
      str(value.scope),
      kind === "review"
        ? "Review provenance; do not remove historical tags automatically."
        : "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

/** Explicit projections only: no raw Notion properties, signed files or vectors reach the page. */
export function buildSnapshot(inputs: Inputs): LabSnapshot {
  const database = obj(inputs.database),
    notion = obj(inputs.notion),
    commercial = obj(inputs.commercial),
    privateAudit = obj(inputs.privateAudit);
  const embeddingDatabase = inputs.comparison
    ? obj(inputs.comparison)
    : database;
  const sourcePages = new Map(
    rows(notion.pages).map((page) => [str(page.id), page]),
  );
  const projects: LabProject[] = rows(database.projects)
    .filter(
      (p) =>
        str(p.id) &&
        sourcePages.has(str(p.id)) &&
        !hidden(p) &&
        !hidden(sourcePages.get(str(p.id)) ?? {}),
    )
    .map((p) => {
      const page = sourcePages.get(str(p.id)) ?? {},
        properties = obj(page.properties),
        profile = obj(p.matching);
      const studyId = str(obj(p.caseStudyIds).en);
      const studyBody = blockText(obj(database.studies)[studyId]).trim();
      const currentMulti = (key: string, fallback: unknown) =>
        Object.hasOwn(properties, key)
          ? multi(properties, key)
          : strings(fallback);
      const currentSelect = (key: string, fallback: unknown) =>
        Object.hasOwn(properties, key)
          ? selected(properties, key)
          : str(fallback);
      const numeric = (key: string) => {
        const value = obj(properties[key]).number;
        return typeof value === "number" && Number.isFinite(value)
          ? value
          : null;
      };
      const currentDate = (key: string, fallback: unknown) =>
        Object.hasOwn(properties, key)
          ? str(obj(obj(properties[key]).date).start)
          : str(fallback);
      return {
        id: str(p.id),
        name: Object.hasOwn(properties, "Name")
          ? rows(obj(properties.Name).title)
              .map((t) => str(t.plain_text))
              .join("")
              .trim()
          : str(p.name),
        projectType: currentSelect("Project Type", p.projectType),
        startDate: currentDate("Start Date", p.startDate),
        endDate: currentDate("End Date", p.endDate) || null,
        status: currentSelect("Status", p.status),
        tools: currentMulti("Tools", p.tools),
        languages: currentMulti("Languages", p.languages),
        capabilities: currentMulti("Capabilities", p.capabilities),
        methods: currentMulti("Methods", p.methods),
        scale: Object.keys(properties).length
          ? readNotionProjectScale(page)
          : publicProjectScale(p.scale),
        matching: {
          buyerNeeds: currentMulti("Buyer Needs", profile.buyerNeeds),
          stages: currentMulti("Delivery Stages", profile.stages),
          domains: currentMulti("Project Domains", profile.domains),
          aiUsage: currentMulti("AI Usage", profile.aiUsage),
          aiCapabilities: currentMulti(
            "AI Capabilities",
            profile.aiCapabilities,
          ),
          ownership: currentSelect("Ownership Model", profile.ownership),
          maintenance: currentSelect("Maintenance Mode", profile.maintenance),
          summary: Object.hasOwn(properties, "Case Context")
            ? propertyText(properties, "Case Context")
            : str(profile.summary),
        },
        caseStudyWords: studyBody ? studyBody.split(/\s+/u).length : 0,
        outcomeBasis: selected(properties, "Outcome Basis"),
        contributionBasis: selected(properties, "Contribution Basis"),
        deliveryEvidence: propertyText(properties, "Delivery Evidence"),
        outcomeEvidence: propertyText(properties, "Outcome Evidence"),
        evidenceGaps: propertyText(properties, "Evidence Gaps"),
        contribution: propertyText(properties, "Personal Contribution"),
        workingPattern: selected(properties, "Working pattern"),
        shortDescription: propertyText(properties, "Short Description"),
        industries: Object.hasOwn(properties, "Sector")
          ? [selected(properties, "Sector")].filter(Boolean)
          : strings(p.industries),
        targetMarket: currentMulti("Target market", p.targetMarket),
        productTypes: currentMulti("Product type", p.productTypes),
        usageContext: currentMulti("Usage context", p.usageContext),
        deliveryModel: currentSelect("Delivery model", p.deliveryModel) || null,
        sourceEditedAt: str(page.last_edited_time),
        assessment: {
          wow: numeric("Wow-Factor 1-10"),
          complexity: numeric("Complexity 1-5"),
          effortLow: numeric("Effort Days Low"),
          effortHigh: numeric("Effort Days High"),
          effortClass: selected(properties, "Effort Class (upper)"),
          effortBasis: propertyText(properties, "Effort Estimate Basis"),
          complexityBasis: propertyText(properties, "Complexity Basis"),
          teamLow: numeric("Team Size Low"),
          teamHigh: numeric("Team Size High"),
          workplace: selected(properties, "Workplace"),
        },
      };
    });
  const publicIds = new Set(projects.map((p) => p.id));
  const documents = rows(embeddingDatabase.documents)
    .filter(
      (d) =>
        d.locale === "en" &&
        d.matchesPublication === true &&
        publicIds.has(str(d.projectId)),
    )
    .map((d) => ({
      projectId: str(d.projectId),
      embeddingModel: str(d.embeddingModel),
      matchesCurrentPublication: true,
      chunks: rows(d.chunks).map((c) => {
        const contentHash = str(c.contentHash),
          content = str(c.content);
        const hashValid =
          !contentHash ||
          contentHash === createHash("sha256").update(content).digest("hex");
        return {
          embedding:
            hashValid && Array.isArray(c.embedding)
              ? (c.embedding as number[])
              : [],
        };
      }),
    }))
    .filter((d) => {
      const size = d.chunks[0]?.embedding.length;
      return Boolean(
        d.embeddingModel &&
        size &&
        d.chunks.every(
          (c) =>
            c.embedding.length === size &&
            c.embedding.every(
              (v) => typeof v === "number" && Number.isFinite(v),
            ) &&
            Math.hypot(...c.embedding) > 0,
        ),
      );
    });
  const findings: AuditFinding[] = rows(commercial.findings)
    .filter((f) => publicIds.has(str(f.projectId)))
    .map((f) =>
      finding(
        str(f.projectId),
        f,
        f.taxonomy === "new_candidate" ? "taxonomy" : "missing",
        str(f.tag),
      ),
    );
  for (const project of rows(privateAudit.projects)) {
    const id = str(project.id);
    if (!publicIds.has(id)) continue;
    for (const proposal of rows(project.proposals))
      findings.push(
        finding(
          id,
          proposal,
          proposal.taxonomy === "new_candidate" ? "taxonomy" : "missing",
          str(proposal.tag),
        ),
      );
    for (const flag of rows(project.reviewFlags))
      for (const tag of strings(flag.tags))
        findings.push(
          finding(
            id,
            flag,
            str(flag.action).startsWith("optional_") ? "taxonomy" : "review",
            tag,
          ),
        );
  }
  const matchedIds = new Set(
    [
      ...strings(commercial.matchedProjectIds),
      ...rows(privateAudit.projects).map((p) => str(p.id)),
    ].filter((id) => publicIds.has(id)),
  );
  const metadata = obj(database.metadata);
  const embeddingMetadata = obj(embeddingDatabase.metadata);
  return {
    metadata: {
      exportedAt: new Date().toISOString(),
      publicationRefreshedAt: str(metadata.publicationRefreshedAt),
      knowledgeSyncedAt: str(embeddingMetadata.knowledgeSyncedAt),
      ...(inputs.comparison
        ? {
            comparisonPublicationRefreshedAt: str(
              embeddingMetadata.publicationRefreshedAt,
            ),
            publicationEmbeddingDocuments: rows(database.documents).filter(
              (d) => d.locale === "en",
            ).length,
          }
        : {}),
      notionFetchedAt: str(notion.fetchedAt),
      embeddingModel: [...new Set(documents.map((d) => d.embeddingModel))].join(
        ", ",
      ),
      embeddingDimensions: Number(embeddingMetadata.embeddingDimensions) || 0,
      embeddedProjects: new Set(documents.map((d) => d.projectId)).size,
      chunks: documents.reduce((n, d) => n + d.chunks.length, 0),
      source:
        "Read-only public publication, existing English embeddings" +
        (inputs.comparison
          ? " from a separately dated stored comparison export"
          : "") +
        ", live Notion evidence fields, and local repository audits. No paid embedding calls or Notion edits. Embedding inputs include several matching labels; semantic comparisons are not independent validation of those labels.",
      auditCoverage: {
        matchedProjects: matchedIds.size,
        unmatchedProjects: projects
          .filter((p) => !matchedIds.has(p.id))
          .map((p) => p.name),
        notes: [
          ...strings(commercial.coverageNotes),
          "Matched projects count explicit repository mappings, including inspected projects without findings. Remaining portfolio projects have not received this repository audit.",
          ...rows(privateAudit.unmatchedRepos).map(
            (r) =>
              `Unmatched local repository: ${str(r.name)}. ${str(r.reason)}`,
          ),
        ],
      },
    },
    projects,
    similarities: projectSimilarities(projects, documents),
    findings,
  };
}

async function main() {
  const args = new Map<string, string>();
  for (let i = 2; i < process.argv.length; i += 2)
    args.set(process.argv[i], process.argv[i + 1]);
  const required = [
    "--database",
    "--notion",
    "--commercial",
    "--private",
    "--output",
  ];
  if (
    required.some((key) => !args.get(key)) ||
    [...args.keys()].some(
      (key) => ![...required, "--comparison-database"].includes(key),
    )
  )
    throw new Error(
      "Usage: build-snapshot.ts --database INPUT.json --notion INPUT.json --commercial INPUT.json --private INPUT.json --output OUTPUT.json [--comparison-database STORED.json]",
    );
  const read = async (key: string): Promise<unknown> =>
    JSON.parse(await readFile(resolve(args.get(key)!), "utf8"));
  const [database, notion, commercial, privateAudit, comparison] =
    await Promise.all([
      read("--database"),
      read("--notion"),
      read("--commercial"),
      read("--private"),
      args.has("--comparison-database")
        ? read("--comparison-database")
        : Promise.resolve(undefined),
    ]);
  const snapshot = buildSnapshot({
    database,
    notion,
    commercial,
    privateAudit,
    comparison,
  });
  const output = resolve(args.get("--output")!);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`);
  await chmod(output, 0o600);
  console.log(
    JSON.stringify({
      output,
      projects: snapshot.projects.length,
      pairs: snapshot.similarities.length,
      findings: snapshot.findings.length,
      auditMatchedProjects: snapshot.metadata.auditCoverage.matchedProjects,
    }),
  );
}

if (process.argv[1]?.endsWith("/build-snapshot.ts"))
  main().catch(() => {
    console.error(
      "Project lab snapshot failed; check supplied input paths and schema.",
    );
    process.exitCode = 1;
  });
