// Usage: node --env-file=.env.local scripts/seed-notion-project-icons.mjs [--apply]
// Adds only the 3D Icon select and fills blank values. Existing choices are preserved.
import { Client, collectPaginatedAPI } from "@notionhq/client";
import { readFileSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const readJson = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const choices = readJson("../../../ops/notion/project-icons-seed.json");
const slugs = JSON.parse(
  readFileSync(
    new URL(import.meta.resolve("@homepage/content/data/project-slugs.json")),
    "utf8",
  ),
);
const iconNames = [
  "react",
  ...Object.keys(readJson("../../../apps/web/src/data/landing-icon-svgs.json")),
];
const databaseId = process.env.NEXT_NOTION_PROJECT_DB_ID;
if (!databaseId || !process.env.NEXT_NOTION_TOKEN)
  throw new Error("Homepage Notion environment required");
const notion = new Client({ auth: process.env.NEXT_NOTION_TOKEN });
const database = await notion.databases.retrieve({ database_id: databaseId });
const property = database.properties["3D Icon"];
if (property && property.type !== "select")
  throw new Error("3D Icon already exists with an incompatible type");
const pages = await collectPaginatedAPI(notion.databases.query, {
  database_id: databaseId,
});
const byId = new Map(pages.map((page) => [page.id, page]));
const changes = Object.entries(slugs).map(([id, slug]) => {
  const icon = choices[slug];
  if (!iconNames.includes(icon))
    throw new Error(`Unsupported icon for ${slug}`);
  const page = byId.get(id);
  if (!page) throw new Error(`Project missing from database: ${slug}`);
  const current = page.properties["3D Icon"]?.select?.name ?? null;
  return { id, slug, icon, current };
});
console.log(
  JSON.stringify(
    {
      mode: process.argv.includes("--apply") ? "apply" : "preview",
      addProperty: !property,
      fill: changes.filter((c) => !c.current),
      preserve: changes.filter((c) => c.current),
    },
    null,
    2,
  ),
);
if (process.argv.includes("--apply")) {
  if (!property)
    await notion.databases.update({
      database_id: databaseId,
      properties: {
        "3D Icon": { select: { options: iconNames.map((name) => ({ name })) } },
      },
    });
  const receipt = [];
  for (const change of changes) {
    if (change.current) continue;
    await delay(350);
    await notion.pages.update({
      page_id: change.id,
      properties: { "3D Icon": { select: { name: change.icon } } },
    });
    receipt.push(change);
    writeFileSync(
      "/tmp/homepage-notion-icon-migration.json",
      `${JSON.stringify(receipt, null, 2)}\n`,
    );
  }
  console.log(
    `Populated ${receipt.length} blank project icons; preserved ${changes.length - receipt.length} existing choices.`,
  );
}
