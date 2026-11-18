// node --env-file=.env.local scripts/seed-notion-translations.mjs [--apply]
import { createHash } from "node:crypto";
import { Client, collectPaginatedAPI } from "@notionhq/client";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { missingTranslationProperties } from "./lib/translationProperties.mjs";

const apply = process.argv.includes("--apply");
const n = new Client({ auth: process.env.NEXT_NOTION_TOKEN });
const databaseId = process.env.NEXT_NOTION_PROJECT_DB_ID;
const ownerId = process.env.NEXT_NOTION_OWNER_CONTACT_ID;
if (!databaseId || !ownerId)
  throw new Error("Homepage Notion environment required");
const translations = JSON.parse(
  readFileSync(
    new URL(
      "../../../ops/notion/project-translations-de.json",
      import.meta.url,
    ),
  ),
);
const sourceHashes = JSON.parse(
  readFileSync(
    new URL(
      "../../../ops/notion/project-translation-source-hashes.json",
      import.meta.url,
    ),
  ),
);
const copy = JSON.parse(
  readFileSync(
    new URL("../../../ops/notion/site-copy-seed.json", import.meta.url),
  ),
);
const db = await n.databases.retrieve({ database_id: databaseId });
const schema = {};
for (const key of ["Project Description DE", "KPIs DE"])
  if (!db.properties[key]) schema[key] = { rich_text: {} };
if (!db.properties["German ready"]) schema["German ready"] = { checkbox: {} };
if (apply && Object.keys(schema).length)
  await n.databases.update({ database_id: databaseId, properties: schema });
const pages = await collectPaginatedAPI(n.databases.query, {
  database_id: databaseId,
  filter: { property: "Hidden", checkbox: { equals: false } },
});
let projects = 0;
for (const page of pages) {
  const translation = translations[page.id];
  if (!translation) continue;
  const sourceHash = createHash("sha256")
    .update(
      JSON.stringify(
        ["Project Description", "KPIs"].map((key) =>
          page.properties[key].rich_text.map((t) => ({
            text: t.plain_text,
            href: t.href,
            annotations: t.annotations,
          })),
        ),
      ),
    )
    .digest("hex");
  if (sourceHashes[page.id] !== sourceHash)
    throw new Error(
      `English source changed for ${page.id}; review its translation before applying`,
    );
  const changes = missingTranslationProperties(page.properties, translation);
  // Only newly seeded prose is automatically published; existing editorial decisions remain intact.
  if (changes["Project Description DE"])
    changes["German ready"] = { checkbox: true };
  if (!Object.keys(changes).length) continue;
  projects++;
  if (apply) {
    await n.pages.update({ page_id: page.id, properties: changes });
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
}
const owner = await n.pages.retrieve({ page_id: ownerId });
if (owner.parent.type !== "database_id")
  throw new Error("Owner must be a database record");
const ownerDb = await n.databases.retrieve({
  database_id: owner.parent.database_id,
});
const ownerSchema = {};
const ownerTranslations = {
  "Position DE": "UX + KI-Engineer",
  "Status DE": "Unternehmer",
  "Languages DE": "Deutsch (Muttersprache), Englisch (verhandlungssicher)",
  "Education DE": "Bachelor of Science, E-Commerce an der THWS, 2020",
};
for (const key of Object.keys(ownerTranslations))
  if (!ownerDb.properties[key]) ownerSchema[key] = { rich_text: {} };
if (apply && Object.keys(ownerSchema).length)
  await n.databases.update({
    database_id: ownerDb.id,
    properties: ownerSchema,
  });
const rich = (content) => [{ type: "text", text: { content } }];
const ownerChanges = {};
for (const [key, value] of Object.entries(ownerTranslations))
  if (!owner.properties[key]?.rich_text?.length)
    ownerChanges[key] = { rich_text: rich(value) };
if (apply && Object.keys(ownerChanges).length)
  await n.pages.update({ page_id: ownerId, properties: ownerChanges });
const configUrl = new URL("../src/data/notion-site-copy.json", import.meta.url);
let copyDatabaseId = existsSync(configUrl)
  ? JSON.parse(readFileSync(configUrl)).databaseId
  : null;
if (apply && !copyDatabaseId) {
  const parentPageId =
    db.parent.type === "page_id" ? db.parent.page_id : ownerId;
  const created = await n.databases.create({
    parent: { type: "page_id", page_id: parentPageId },
    title: rich("FUERST.ONE · Site Copy"),
    properties: {
      Key: { title: {} },
      English: { rich_text: {} },
      German: { rich_text: {} },
    },
  });
  copyDatabaseId = created.id;
  writeFileSync(
    configUrl,
    JSON.stringify({ databaseId: copyDatabaseId }, null, 2) + "\n",
  );
}
let copyRows = 0;
if (copyDatabaseId) {
  const rows = await collectPaginatedAPI(n.databases.query, {
    database_id: copyDatabaseId,
  });
  for (const [key, values] of Object.entries(copy)) {
    const row = rows.find(
      (row) =>
        row.properties.Key?.title?.map((t) => t.plain_text).join("") === key,
    );
    const properties = {};
    for (const [field, value] of [
      ["English", values.en],
      ["German", values.de],
    ])
      if (!row?.properties[field]?.rich_text?.length)
        properties[field] = { rich_text: rich(value) };
    if (!Object.keys(properties).length) continue;
    copyRows++;
    if (apply) {
      if (row) await n.pages.update({ page_id: row.id, properties });
      else
        await n.pages.create({
          parent: { database_id: copyDatabaseId },
          properties: { Key: { title: rich(key) }, ...properties },
        });
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
}
console.log(
  JSON.stringify({
    apply,
    projects,
    copyRows,
    copyDatabaseId,
    addedProjectFields: Object.keys(schema),
    addedOwnerFields: Object.keys(ownerSchema),
  }),
);
