// Usage: node --env-file=.env.local scripts/seed-notion-case-dimensions.mjs [--apply]
// Fill blank editorial dimensions only; existing portfolio properties stay untouched.
import { Client, collectPaginatedAPI } from "@notionhq/client";
import { isDeepStrictEqual } from "node:util";
import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const allowedFields = new Set([
  "Buyer Needs",
  "Delivery Stages",
  "Project Domains",
  "AI Usage",
  "AI Capabilities",
  "Personal Contribution",
  "Case Context",
  "Delivery Evidence",
  "Outcome Evidence",
  "Outcome Basis",
  "Evidence Gaps",
  "Case Review",
  "Ownership Model",
  "Contribution Basis",
  "Maintenance Mode",
]);
const richText = (property) =>
  (property?.rich_text ?? property?.title ?? [])
    .map((part) => part.plain_text ?? part.text?.content ?? "")
    .join("");

export function projectSource(page) {
  const p = page.properties;
  return {
    name: richText(p.Name),
    description: richText(p["Project Description"]),
    kpis: richText(p.KPIs),
    experiences: (p.Experiences?.multi_select ?? []).map((v) => v.name).sort(),
    status: p.Status?.select?.name ?? null,
    startDate: p["Start Date"]?.date?.start ?? null,
    endDate: p["End Date"]?.date?.start ?? null,
  };
}

function propertyValue(property, type) {
  if (type === "rich_text") return richText(property);
  if (type === "multi_select")
    return (property?.multi_select ?? []).map((v) => v.name);
  return property?.select?.name ?? "";
}

export function planCaseBackfill(database, pages, seed) {
  const addProperties = {};
  for (const [name, definition] of Object.entries(seed.schema)) {
    const type = Object.keys(definition)[0];
    if (
      !allowedFields.has(name) ||
      !["rich_text", "multi_select", "select"].includes(type)
    )
      throw new Error(`Unsupported field: ${name}`);
    const current = database.properties[name];
    if (current && current.type !== type)
      throw new Error(`Incompatible property: ${name}`);
    if (!current) addProperties[name] = definition;
  }
  const byId = new Map(pages.map((page) => [page.id, page]));
  const seen = new Set();
  const updates = [];
  const preserved = [];
  const conflicts = [];
  for (const entry of seed.projects) {
    if (seen.has(entry.id)) throw new Error(`Duplicate project: ${entry.id}`);
    seen.add(entry.id);
    const page = byId.get(entry.id);
    if (!page) throw new Error(`Missing project: ${entry.id}`);
    if (page.properties.Hidden?.checkbox)
      throw new Error(`Hidden project: ${entry.id}`);
    if (!isDeepStrictEqual(projectSource(page), entry.source))
      throw new Error(
        `Project source changed; review before retrying: ${entry.id}`,
      );
    const properties = {};
    const withheld = new Set();
    // Confirmation and evidence must stay attached to the exact associated claim.
    for (const group of [
      ["Personal Contribution", "Contribution Basis", "Ownership Model"],
      [
        "Delivery Stages",
        "Delivery Evidence",
        "Maintenance Mode",
        "AI Usage",
        "AI Capabilities",
      ],
      ["Outcome Evidence", "Outcome Basis"],
    ]) {
      const differs = group.some((name) => {
        const definition = seed.schema[name];
        if (!definition || entry.fields[name] === undefined) return false;
        const current = propertyValue(
          page.properties[name],
          Object.keys(definition)[0],
        );
        const proposed = entry.fields[name];
        return (
          current.length &&
          !isDeepStrictEqual(
            Array.isArray(current) ? [...current].sort() : current,
            Array.isArray(proposed) ? [...proposed].sort() : proposed,
          )
        );
      });
      if (differs) {
        group.forEach((name) => withheld.add(name));
        conflicts.push({ id: entry.id, fields: group });
      }
    }
    for (const [name, value] of Object.entries(entry.fields)) {
      const definition = seed.schema[name];
      if (!allowedFields.has(name) || !definition)
        throw new Error(`Unsupported field: ${name}`);
      const type = Object.keys(definition)[0];
      if (
        type === "multi_select"
          ? !Array.isArray(value) || value.some((v) => typeof v !== "string")
          : typeof value !== "string"
      )
        throw new Error(`Invalid value: ${name}`);
      if (type !== "rich_text") {
        const options = definition[type].options.map((v) => v.name);
        for (const choice of Array.isArray(value)
          ? value
          : value
            ? [value]
            : []) {
          if (!options.includes(choice))
            throw new Error(`Unsupported option: ${name}/${choice}`);
        }
      }
      const current = propertyValue(page.properties[name], type);
      if (current.length || withheld.has(name)) {
        preserved.push({ id: entry.id, field: name });
        continue;
      }
      if (!value.length) continue;
      properties[name] =
        type === "rich_text"
          ? {
              rich_text: Array.from(
                { length: Math.ceil(value.length / 2000) },
                (_, i) => ({
                  text: { content: value.slice(i * 2000, (i + 1) * 2000) },
                }),
              ),
            }
          : type === "multi_select"
            ? { multi_select: [...new Set(value)].map((v) => ({ name: v })) }
            : { select: { name: value } };
    }
    if (Object.keys(properties).length)
      updates.push({ id: entry.id, properties });
  }
  return { addProperties, updates, preserved, conflicts };
}

async function main() {
  const seed = JSON.parse(
    await readFile(
      new URL(
        "../../../ops/notion/project-case-dimensions.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const databaseId = process.env.NEXT_NOTION_PROJECT_DB_ID;
  if (!databaseId || !process.env.NEXT_NOTION_TOKEN)
    throw new Error("Homepage Notion environment required");
  if (databaseId.replaceAll("-", "") !== seed.databaseId.replaceAll("-", ""))
    throw new Error("Seed belongs to a different database");
  const notion = new Client({ auth: process.env.NEXT_NOTION_TOKEN });
  let database = await notion.databases.retrieve({ database_id: databaseId });
  const pages = await collectPaginatedAPI(notion.databases.query, {
    database_id: databaseId,
  });
  const plan = planCaseBackfill(database, pages, seed);
  console.log(
    JSON.stringify(
      {
        mode: process.argv.includes("--apply") ? "apply" : "preview",
        addProperties: Object.keys(plan.addProperties),
        projectsToFill: plan.updates.length,
        preservedFields: plan.preserved.length,
        conflicts: plan.conflicts,
        publicProjects: pages.filter((p) => !p.properties.Hidden?.checkbox)
          .length,
        seededProjects: seed.projects.length,
      },
      null,
      2,
    ),
  );
  if (!process.argv.includes("--apply")) return;
  const snapshotDir = await mkdtemp(join(tmpdir(), "homepage-case-backfill-"));
  await writeFile(
    join(snapshotDir, "before.json"),
    JSON.stringify({ database, pages }, null, 2),
    { mode: 0o600 },
  );
  console.log(`Snapshot and receipt: ${snapshotDir}`);
  if (Object.keys(plan.addProperties).length)
    database = await notion.databases.update({
      database_id: databaseId,
      properties: plan.addProperties,
    });
  const receipt = [];
  for (const change of plan.updates) {
    await delay(350);
    const fresh = await notion.pages.retrieve({ page_id: change.id });
    const currentPlan = planCaseBackfill(database, [fresh], {
      ...seed,
      projects: seed.projects.filter((p) => p.id === change.id),
    });
    if (currentPlan.conflicts.length)
      console.warn(
        `Preserved conflicting evidence groups: ${JSON.stringify(currentPlan.conflicts)}`,
      );
    const update = currentPlan.updates[0];
    if (!update) continue;
    const saved = await notion.pages.update({
      page_id: change.id,
      properties: update.properties,
    });
    for (const name of Object.keys(update.properties)) {
      const type = Object.keys(seed.schema[name])[0];
      const expected = propertyValue(update.properties[name], type);
      if (
        !isDeepStrictEqual(
          propertyValue(saved.properties[name], type),
          expected,
        )
      )
        throw new Error(
          `Saved value differs: ${change.id}/${name}; inspect before retrying`,
        );
    }
    receipt.push({
      id: change.id,
      fields: Object.keys(update.properties),
      savedAt: saved.last_edited_time,
    });
    await writeFile(
      join(snapshotDir, "receipt.json"),
      JSON.stringify(receipt, null, 2),
      { mode: 0o600 },
    );
  }
  console.log(
    `Filled ${receipt.length} project records. Existing non-empty fields were preserved.`,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
