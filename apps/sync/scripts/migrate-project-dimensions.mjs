import { createRequire } from "node:module";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
const METHODS = [
  "A/B-Testing",
  "CI/CD",
  "Expert Research",
  "Prototyping",
  "User Testing",
  "Site Audit",
  "Workshop",
  "Prompt Engineering",
];
const TOOL_METHODS = [
  "7-Level-Model",
  "Jobs To Be Done",
  "Limbic Types",
  "Personas",
];
const TECHNOLOGIES = [
  "WebGL",
  "Embeddings",
  "Graph Databases",
  "Vector Databases",
];
const CAPABILITIES = [
  "3D",
  "Agent Harnesses",
  "AI Engineering",
  "Animation",
  "Artificial Intelligence",
  "Backend-Development",
  "Behaviour Psychology",
  "Business Administration",
  "Chat Bot Design",
  "Conception",
  "Consulting",
  "Conversion Rate Optimization",
  "Data Aggregation",
  "Data Analysis",
  "Data Visualization",
  "Fashion Design",
  "Finance",
  "Frontend-Development",
  "Fullstack-Development",
  "Geospatial Visualization",
  "GPU Shaders",
  "Leadership",
  "Library Development",
  "Native Development",
  "Online-Marketing",
  "Open Source Software Development",
  "Reporting",
  "SEO",
  "UI-Design",
  "Usability",
  "User Research",
  "UX-Design",
  "Web-Scraping",
];
const uniq = (xs) => [...new Set(xs)].sort();
const tags = (p, k) =>
  uniq((p.properties?.[k]?.multi_select ?? []).map((x) => x.name));
const visible = (p) =>
  p.properties?.Hidden?.checkbox === false && !p.archived && !p.in_trash;
const fingerprint = (p) =>
  JSON.stringify([
    visible(p),
    ...["Experiences", "Tools", "Capabilities", "Methods"].map((k) =>
      tags(p, k),
    ),
  ]);
export function planDimensionMigration(database, pages) {
  const definitions = {
    Capabilities: CAPABILITIES,
    Methods: [...METHODS, ...TOOL_METHODS],
  };
  const properties = {};
  for (const [name, options] of Object.entries(definitions)) {
    const existing = database.properties[name];
    if (existing && existing.type !== "multi_select")
      throw Error(`Incompatible property: ${name}`);
    if (!existing)
      properties[name] = {
        multi_select: { options: options.map((name) => ({ name })) },
      };
  }
  const updates = [];
  for (const p of pages.filter(visible)) {
    const legacy = tags(p, "Experiences"),
      tools = tags(p, "Tools"),
      capabilities = tags(p, "Capabilities"),
      methods = tags(p, "Methods");
    const unknown = legacy.filter(
      (t) => ![...CAPABILITIES, ...METHODS, ...TECHNOLOGIES].includes(t),
    );
    if (unknown.length) throw Error(`Unclassified tags: ${unknown.join(", ")}`);
    const intended = {
      Capabilities: capabilities.length
        ? capabilities
        : legacy.filter((t) => CAPABILITIES.includes(t)),
      Methods: uniq([
        ...(methods.length
          ? methods
          : legacy.filter((t) => METHODS.includes(t))),
        ...tools.filter((t) => TOOL_METHODS.includes(t)),
      ]),
      Tools: uniq([
        ...tools.filter((t) => !TOOL_METHODS.includes(t)),
        ...legacy.filter((t) => TECHNOLOGIES.includes(t)),
      ]),
    };
    const values = Object.fromEntries(
      Object.entries(intended).filter(
        ([k, v]) => !isDeepStrictEqual(tags(p, k), v),
      ),
    );
    if (Object.keys(values).length)
      updates.push({ id: p.id, fingerprint: fingerprint(p), values });
  }
  return { properties, updates };
}
async function main() {
  const apply = process.argv.slice(2).includes("--apply");
  if (process.argv.slice(2).some((a) => a !== "--apply"))
    throw Error("Use --apply or no argument for preview");
  const id = process.env.NEXT_NOTION_PROJECT_DB_ID;
  if (
    id?.replaceAll("-", "") !== "f53d61ec13a049b79f25c5c98e0994cb" ||
    !process.env.NEXT_NOTION_TOKEN
  )
    throw Error("Unexpected or missing source");
  const require = createRequire(new URL("../package.json", import.meta.url));
  const { Client, collectPaginatedAPI } = require("@notionhq/client");
  const client = new Client({
    auth: process.env.NEXT_NOTION_TOKEN,
    logger: () => {},
    timeoutMs: 30000,
  });
  const [database, pages] = await Promise.all([
    client.databases.retrieve({ database_id: id }),
    collectPaginatedAPI(client.databases.query, {
      database_id: id,
      page_size: 100,
    }),
  ]);
  const plan = planDimensionMigration(database, pages);
  const dir = await mkdtemp(join(tmpdir(), "notion-dimensions-"));
  const receipt = {
    at: new Date().toISOString(),
    database: id,
    mode: apply ? "apply" : "preview",
    properties: Object.keys(plan.properties),
    planned: plan.updates.length,
    verified: [],
    attempting: null,
  };
  const save = () =>
    writeFile(
      join(dir, "receipt.json"),
      JSON.stringify(receipt, null, 2) + "\n",
      { mode: 0o600 },
    );
  await writeFile(
    join(dir, "before.json"),
    JSON.stringify({ database, pages: pages.filter(visible), plan }, null, 2) +
      "\n",
    { mode: 0o600 },
  );
  await save();
  console.log(
    JSON.stringify({
      mode: receipt.mode,
      properties: receipt.properties,
      projects: pages.filter(visible).length,
      updates: plan.updates.length,
      backup: dir,
    }),
  );
  if (!apply) return;
  if (Object.keys(plan.properties).length)
    await client.databases.update({
      database_id: id,
      properties: plan.properties,
    });
  for (const update of plan.updates) {
    const fresh = await client.pages.retrieve({ page_id: update.id });
    if (fingerprint(fresh) !== update.fingerprint)
      throw Error(`Source changed; stopped before ${update.id}`);
    receipt.attempting = update.id;
    await save();
    const result = await client.pages.update({
      page_id: update.id,
      properties: Object.fromEntries(
        Object.entries(update.values).map(([k, values]) => [
          k,
          { multi_select: values.map((name) => ({ name })) },
        ]),
      ),
    });
    for (const [k, values] of Object.entries(update.values))
      if (!isDeepStrictEqual(tags(result, k), values))
        throw Error(`Verification failed: ${update.id} ${k}`);
    receipt.verified.push(update.id);
    receipt.attempting = null;
    await save();
    if (receipt.verified.length % 10 === 0)
      console.log(
        JSON.stringify({
          verified: receipt.verified.length,
          total: plan.updates.length,
        }),
      );
  }
  const after = await collectPaginatedAPI(client.databases.query, {
    database_id: id,
    page_size: 100,
  });
  const repeated = planDimensionMigration(
    await client.databases.retrieve({ database_id: id }),
    after,
  );
  receipt.remaining = repeated.updates.length;
  await save();
  console.log(
    JSON.stringify({
      verified: receipt.verified.length,
      remaining: receipt.remaining,
      receipt: join(dir, "receipt.json"),
    }),
  );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((e) => {
    console.error(
      e.message?.startsWith("Unclassified")
        ? e.message
        : "Dimension migration stopped; inspect the private receipt and source state before retrying. Upstream errors withheld.",
    );
    process.exitCode = 1;
  });
