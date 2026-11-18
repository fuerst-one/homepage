import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const editable = new Set([
  "Product type",
  "Target market",
  "Usage context",
  "Delivery model",
  "Methods",
  "Code SLOC",
  "Test SLOC",
  "Source Files",
  "Code Measured At",
  "Code Revision",
  "Code Size Scope",
  "Local Code Paths",
  "Team Size Low",
  "Team Size High",
  "Ownership Model",
  "Personal Contribution",
  "Contribution Basis",
  "Status",
  "Delivery Evidence",
  "Research Evidence",
  "Evidence Gaps",
  "Effort Estimate Basis",
  "Case Context",
  "Outcome Basis",
  "Outcome Evidence",
]);
export function propertyValue(property) {
  const value = property[property.type];
  if (["title", "rich_text"].includes(property.type))
    return value.map((v) => v.plain_text ?? v.text?.content ?? "").join("");
  if (property.type === "multi_select") return value.map((v) => v.name).sort();
  if (property.type === "select") return value?.name ?? null;
  return value;
}
const normalize = (value, type) =>
  JSON.stringify(
    type === "date" && value
      ? {
          start: value.start,
          end: value.end ?? null,
          time_zone: value.time_zone ?? null,
        }
      : Array.isArray(value)
        ? [...value].sort()
        : value,
  );
function encode(type, value) {
  if (type === "rich_text")
    return {
      rich_text: value
        ? value
            .match(/[\s\S]{1,1900}/g)
            .map((content) => ({ type: "text", text: { content } }))
        : [],
    };
  if (type === "multi_select")
    return { multi_select: value.map((name) => ({ name })) };
  if (type === "select") return { select: value ? { name: value } : null };
  if (["number", "date"].includes(type)) return { [type]: value };
  throw new Error(`Unsupported property type: ${type}`);
}

/** Scoped expected-value checks permit concurrent changes to unrelated properties. */
export function propertiesToApply(page, change) {
  assert.equal(page.id, change.id, "Wrong page");
  assert.ok(
    !page.archived && !page.in_trash && !page.properties.Hidden?.checkbox,
    "Hidden or withdrawn page",
  );
  const properties = {};
  for (const [name, field] of Object.entries(change.fields)) {
    assert.ok(editable.has(name), `Unsupported cleanup field: ${name}`);
    assert.equal(
      page.properties[name]?.type,
      field.type,
      `Schema changed: ${name}`,
    );
    const current = propertyValue(page.properties[name]);
    if (normalize(current, field.type) === normalize(field.after, field.type))
      continue;
    assert.equal(
      normalize(current, field.type),
      normalize(field.before, field.type),
      `Stale cleanup field: ${name}`,
    );
    properties[name] = encode(field.type, field.after);
  }
  return properties;
}

async function main() {
  const planPath = resolve(process.argv[2]);
  const plan = JSON.parse(await readFile(planPath, "utf8"));
  const expectedDb = "f53d61ec13a049b79f25c5c98e0994cb";
  assert.equal(plan.databaseId.replaceAll("-", ""), expectedDb);
  assert.equal(
    process.env.NEXT_NOTION_PROJECT_DB_ID?.replaceAll("-", ""),
    expectedDb,
  );
  assert.equal(
    new Set(plan.projects.map((p) => p.id)).size,
    plan.projects.length,
    "Duplicate projects",
  );
  const require = createRequire(
    new URL("../../../../apps/sync/package.json", import.meta.url),
  );
  const { Client } = require("@notionhq/client");
  const notion = new Client({
    auth: process.env.NEXT_NOTION_TOKEN,
    logger: () => {},
    timeoutMs: 30000,
  });
  // Validate the entire batch before any write, then recheck each target immediately.
  for (const change of plan.projects) {
    const page = await notion.pages.retrieve({ page_id: change.id });
    assert.equal(
      page.parent?.database_id?.replaceAll("-", ""),
      expectedDb,
      "Unexpected parent",
    );
    propertiesToApply(page, change);
  }
  if (!process.argv.includes("--apply")) {
    console.log(
      JSON.stringify({
        preview: true,
        projects: plan.projects.length,
        fields: plan.projects.reduce(
          (n, p) => n + Object.keys(p.fields).length,
          0,
        ),
      }),
    );
    return;
  }
  const receipt = {
    startedAt: new Date().toISOString(),
    planPath,
    verified: [],
    attempted: [],
  };
  const receiptPath = planPath.replace(/\.json$/, "-receipt.json");
  for (const change of plan.projects) {
    const current = await notion.pages.retrieve({ page_id: change.id });
    const properties = propertiesToApply(current, change);
    receipt.attempted.push({
      id: change.id,
      fields: Object.keys(properties),
      at: new Date().toISOString(),
    });
    await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n", {
      mode: 0o600,
    });
    if (Object.keys(properties).length)
      await notion.pages.update({ page_id: change.id, properties });
    const after = await notion.pages.retrieve({ page_id: change.id });
    assert.deepEqual(propertiesToApply(after, change), {}, "Read-back differs");
    receipt.verified.push({
      id: change.id,
      name: change.name,
      fields: Object.keys(change.fields),
      written: Object.keys(properties),
      checkedAt: new Date().toISOString(),
    });
    await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n", {
      mode: 0o600,
    });
  }
  receipt.completedAt = new Date().toISOString();
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n", {
    mode: 0o600,
  });
  console.log(
    JSON.stringify({
      completedAt: receipt.completedAt,
      projects: receipt.verified.length,
      receiptPath,
    }),
  );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch(() => {
    console.error(
      "Cleanup stopped; review expected values and receipt before rerunning. Upstream details withheld.",
    );
    process.exitCode = 1;
  });
