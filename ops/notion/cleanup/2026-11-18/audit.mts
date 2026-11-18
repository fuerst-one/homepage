import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { knowledgeDatabase } from "../../../../packages/database/src/database.ts";
import { readNotionProjectTaxonomy } from "../../../../packages/content/src/projectTaxonomy.ts";
import { readPublicProjectCase } from "../../../../packages/content/src/projectCase.ts";
import {
  readNotionProjectScale,
  effortClass,
} from "../../../../packages/content/src/projectScale.ts";
import { reviewProjectSource } from "../../../../packages/content/src/projectSourceReview.ts";

const source = JSON.parse(await readFile(resolve(process.argv[2]), "utf8"));
const out = resolve(process.argv[3]);
await mkdir(out, { recursive: true });
const url = new URL(process.env.KNOWLEDGE_DATABASE_URL!);
assert.ok(
  ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname),
  "Local database only",
);
const sql = knowledgeDatabase();
let published: any;
try {
  [published] =
    await sql`SELECT refreshed_at,payload FROM public_content WHERE key='website-v3'`;
} finally {
  await sql.end();
}
assert.equal(published.payload.version, 3);
await writeFile(out + "/source.json", JSON.stringify(source, null, 2) + "\n", {
  mode: 0o600,
});
await writeFile(
  out + "/publication.json",
  JSON.stringify(published, null, 2) + "\n",
  { mode: 0o600 },
);
const v = (p: any, k: string) => p.properties[k]?.value;
const name = (p: any) => v(p, "Name").trim();
const normalize = (v: any) =>
  JSON.stringify(
    Array.isArray(v) ? [...v].sort() : v == null || v === "" ? null : v,
  );
const present = (v: any): boolean =>
  v != null &&
  (typeof v === "string"
    ? Boolean(v.trim())
    : Array.isArray(v)
      ? v.length > 0
      : typeof v === "object"
        ? Object.values(v).some(present)
        : true);
const fields = Object.entries(source.schema)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([field, meta]: any) => {
    const missing = source.projects
      .filter((p: any) => !present(v(p, field)))
      .map(name);
    return {
      field,
      type: meta.type,
      recorded: source.projects.length - missing.length,
      missing: missing.length,
      missingProjects: missing,
    };
  });
const toPage = (p: any) => ({
  id: p.id,
  properties: Object.fromEntries(
    Object.entries(p.properties).map(([key, entry]: any) => {
      let value = entry.value;
      if (["title", "rich_text"].includes(entry.type))
        value = value ? [{ plain_text: value }] : [];
      if (entry.type === "multi_select")
        value = value.map((name: string) => ({ name }));
      if (entry.type === "select") value = value ? { name: value } : null;
      return [key, { type: entry.type, [entry.type]: value }];
    }),
  ),
});
const differences: any[] = [],
  reviews: any[] = [];
for (const p of source.projects) {
  const page = toPage(p),
    taxonomy = readNotionProjectTaxonomy(page),
    matching = readPublicProjectCase(page)!,
    scale = readNotionProjectScale(page);
  reviews.push(
    ...reviewProjectSource(page).map((issue) => ({
      project: name(p),
      ...issue,
    })),
  );
  for (const locale of ["en", "de"]) {
    const rows = published.payload.locales[locale].projects;
    const actual = rows.find((row: any) => row.id === p.id);
    if (!actual) {
      differences.push({ project: name(p), locale, field: "PROJECT" });
      continue;
    }
    const compare = (field: string, expected: any, value: any) => {
      if (normalize(expected) !== normalize(value))
        differences.push({
          project: name(p),
          locale,
          field,
          source: expected,
          publication: value,
        });
    };
    for (const [key, value] of Object.entries(taxonomy))
      compare(key, value, actual[key]);
    for (const [key, value] of Object.entries(matching))
      compare("matching." + key, value, actual.matching?.[key]);
    for (const [key, value] of Object.entries(scale))
      compare("scale." + key, value, actual.scale?.[key]);
    for (const [field, key] of Object.entries({
      Methods: "methods",
      Capabilities: "capabilities",
      Tools: "tools",
      Languages: "languages",
      Status: "status",
    }))
      compare(field, v(p, field), actual[key]);
  }
}
const privateTerms = [
  "Research Evidence",
  "Evidence Gaps",
  "Local Code Paths",
  "Code Revision",
  "Code Size Scope",
  "Personal Contribution",
  "Contribution Basis",
  "OWNER-REPORTED HISTORICAL PERSONAL EFFORT",
  "/Users/Alex/",
];
const serialized = JSON.stringify(published.payload);
const privateLeaks = privateTerms.filter((value) => serialized.includes(value));
const publicCounts = Object.fromEntries(
  ["en", "de"].map((locale) => [
    locale,
    published.payload.locales[locale].projects.length,
  ]),
);
const classMismatches = source.projects
  .filter(
    (p: any) =>
      v(p, "Effort Days High") != null &&
      v(p, "Effort Class (upper)") !== effortClass(v(p, "Effort Days High")),
  )
  .map((p: any) => ({
    project: name(p),
    upper: v(p, "Effort Days High"),
    stored: v(p, "Effort Class (upper)"),
    computed: effortClass(v(p, "Effort Days High")),
  }));
const analysis = {
  sourceReadAt: source.fetchedAt,
  publicationRefreshedAt: published.refreshed_at,
  sourceRows: source.total,
  publicRows: source.projects.length,
  hiddenRows: source.hidden,
  publicCounts,
  uniqueSourceIds: new Set(source.projects.map((p: any) => p.id)).size,
  fields,
  differences,
  reviews,
  privateLeaks,
  classMismatches,
};
await writeFile(out + "/audit.json", JSON.stringify(analysis, null, 2) + "\n", {
  mode: 0o600,
});
const csv = (value: any) => '"' + String(value).replaceAll('"', '""') + '"';
await writeFile(
  out + "/field-coverage.csv",
  [
    ["Field", "Type", "Recorded", "Missing", "Missing projects"],
    ...fields.map((f: any) => [
      f.field,
      f.type,
      f.recorded,
      f.missing,
      f.missingProjects.join("; "),
    ]),
  ]
    .map((r) => r.map(csv).join(","))
    .join("\n") + "\n",
);
console.log(JSON.stringify({ ...analysis, fields: undefined }, null, 2));
assert.equal(
  differences.length,
  0,
  "Publication differs from supported source fields",
);
assert.equal(reviews.length, 0, "Source requires taxonomy/core-field review");
assert.equal(privateLeaks.length, 0, "Private source fields leaked");
for (const locale of ["en", "de"]) {
  const ids = published.payload.locales[locale].projects
    .map((p: any) => p.id)
    .sort();
  assert.deepEqual(
    ids,
    source.projects.map((p: any) => p.id).sort(),
    "Public ID set differs",
  );
}
