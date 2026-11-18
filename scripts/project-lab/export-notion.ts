import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { safeNotionLogger } from "../../packages/database/src/notionDiagnostics";

type Row = Record<string, unknown>;
const object = (value: unknown): Row =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};
const text = (value: unknown): string =>
  typeof value === "string" ? value : "";
const array = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const fields: Record<
  string,
  "title" | "rich_text" | "select" | "multi_select" | "number" | "date"
> = {
  Name: "title",
  "Short Description": "rich_text",
  "Outcome Basis": "select",
  "Contribution Basis": "select",
  "Delivery Evidence": "rich_text",
  "Outcome Evidence": "rich_text",
  "Evidence Gaps": "rich_text",
  "Personal Contribution": "rich_text",
  "Working pattern": "select",
  "Target market": "multi_select",
  "Product type": "multi_select",
  Sector: "select",
  "Usage context": "multi_select",
  "Delivery model": "select",
  Tools: "multi_select",
  Languages: "multi_select",
  Capabilities: "multi_select",
  Methods: "multi_select",
  "Code SLOC": "number",
  "Test SLOC": "number",
  "Source Files": "number",
  "Code Measured At": "date",
  "Buyer Needs": "multi_select",
  "Project Domains": "multi_select",
  "Delivery Stages": "multi_select",
  "AI Usage": "multi_select",
  "AI Capabilities": "multi_select",
  "Ownership Model": "select",
  "Maintenance Mode": "select",
  "Case Context": "rich_text",
  "Project Type": "select",
  Status: "select",
  "Start Date": "date",
  "End Date": "date",
  "Wow-Factor 1-10": "number",
  "Complexity 1-5": "number",
  "Complexity Basis": "rich_text",
  "Effort Days Low": "number",
  "Effort Days High": "number",
  "Effort Class (upper)": "select",
  "Effort Estimate Basis": "rich_text",
  "Team Size Low": "number",
  "Team Size High": "number",
  Workplace: "select",
};

/** Keep only analysis fields; rich-text links, files, relations and raw URLs are omitted. */
export function projectNotionPage(value: unknown) {
  const page = object(value),
    source = object(page.properties),
    visibility = object(source.Hidden);
  if (
    !text(page.id) ||
    visibility.type !== "checkbox" ||
    typeof visibility.checkbox !== "boolean"
  )
    throw new Error("Project identity or visibility is unavailable");
  const hidden = visibility.checkbox === true;
  const properties: Row = {
    Hidden: { type: "checkbox", checkbox: hidden },
  };
  // Hidden/withdrawn records supply visibility only, never private case text.
  if (!hidden && page.archived !== true && page.in_trash !== true) {
    for (const [name, type] of Object.entries(fields)) {
      const property = object(source[name]);
      if (property.type !== type) continue;
      let projected: unknown;
      if (type === "title" || type === "rich_text") {
        projected = array(property[type]).map((part) => {
          const rich = object(part);
          return {
            plain_text:
              text(rich.plain_text) || text(object(rich.text).content),
          };
        });
      } else if (type === "select") {
        const name = text(object(property.select).name);
        projected = name ? { name } : null;
      } else if (type === "number") {
        projected =
          typeof property.number === "number" &&
          Number.isFinite(property.number)
            ? property.number
            : null;
      } else if (type === "date") {
        const date = object(property.date);
        projected = text(date.start)
          ? { start: text(date.start), end: text(date.end) || null }
          : null;
      } else {
        projected = array(property.multi_select)
          .map((entry) => text(object(entry).name))
          .filter(Boolean)
          .map((name) => ({ name }));
      }
      properties[name] = { type, [type]: projected };
    }
  }
  return {
    id: text(page.id),
    last_edited_time: text(page.last_edited_time),
    archived: page.archived === true,
    in_trash: page.in_trash === true,
    properties,
  };
}

async function main() {
  if (process.argv.length > 3)
    throw new Error("Only one output path is accepted");
  const auth = process.env.NEXT_NOTION_TOKEN,
    databaseId = process.env.NEXT_NOTION_PROJECT_DB_ID;
  if (!auth || !databaseId) throw new Error("Notion source is unconfigured");

  // The existing sync workspace owns the SDK dependency. This CLI needs no database.
  const require = createRequire(
    new URL("../../apps/sync/package.json", import.meta.url),
  );
  const { Client, collectPaginatedAPI } = require("@notionhq/client");
  const notion = new Client({
    auth,
    timeoutMs: 30_000,
    logger: safeNotionLogger,
  });
  const sourcePages: unknown[] = await collectPaginatedAPI(
    notion.databases.query,
    { database_id: databaseId, page_size: 100 },
  );
  const pages = sourcePages.map(projectNotionPage);
  const output = resolve(
    process.argv[2] ?? "data/project-lab/notion-source.json",
  );
  await mkdir(dirname(output), { recursive: true });
  await writeFile(
    output,
    `${JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        source:
          "Read-only paginated Notion Projects query. Allowlisted analysis fields only; hidden and withdrawn records contain visibility metadata only.",
        pages,
      },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  );
  console.log(JSON.stringify({ output, projects: pages.length }));
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch(() => {
    console.error(
      "Notion lab export failed; check source environment, database access and output path. Credentials and upstream errors were withheld.",
    );
    process.exitCode = 1;
  });
