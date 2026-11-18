import assert from "node:assert/strict";
import { after, test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const database = new URL(
  process.env.KNOWLEDGE_DATABASE_URL || "http://unconfigured",
);
const base = new URL(process.env.SEO_TEST_BASE_URL || "http://localhost:6914");
if (
  ![database.hostname, base.hostname].every((host) =>
    ["localhost", "127.0.0.1"].includes(host),
  ) ||
  database.pathname !== "/homepage_image_descriptions_preview"
)
  throw new Error(
    "This test requires the isolated image-description preview database and local web server",
  );

const { knowledgeDatabase } = loadTs(
  new URL("../packages/database/src/database.ts", import.meta.url),
);
const sql = knowledgeDatabase();
after(() => sql.end());
const get = (path) =>
  fetch(new URL(path, base), { signal: AbortSignal.timeout(60_000) });

test("generated alt and description HTML withdraws immediately after a previously rendered publication changes", async () => {
  const project = "/en/projects/konfig-product-design-configurator";
  const paths = [
    project,
    `${project}/case-study`,
    "/en/services/product-interfaces",
    "/de/services/product-interfaces/review",
  ];
  const [original] =
    await sql`SELECT payload,refreshed_at FROM public_content WHERE key='website-v3'`;
  assert.ok(original, "real public preview must be seeded first");
  for (const path of paths) {
    const response = await get(path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /private|no-store/);
    const html = await response.text();
    assert.match(
      html,
      /Automatically generated image description|Automatisch erstellte Bildbeschreibung/,
    );
    if (path === project) {
      const screenshots = html
        .match(/<img[^>]+alt="[^"]*"[^>]*>/g)
        .filter((tag) => tag.includes("Screenshots"));
      assert.ok(screenshots.length);
      assert.ok(
        screenshots.every((tag) => !/alt="[^"]*screenshot \d+"/.test(tag)),
        "all screenshot alts must be present in initial HTML",
      );
    }
  }
  try {
    const withdrawn = { ...original.payload, assets: {} };
    await sql`UPDATE public_content SET payload=${sql.json(withdrawn)},refreshed_at=clock_timestamp() WHERE key='website-v3'`;
    for (const path of paths) {
      const response = await get(path);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.doesNotMatch(
        html,
        /Automatically generated image description|Automatisch erstellte Bildbeschreibung/,
      );
      if (path === project)
        assert.match(html, /alt="Konfig[^\"]* screenshot 1"/);
    }
  } finally {
    await sql`UPDATE public_content SET payload=${sql.json(original.payload)},refreshed_at=${original.refreshed_at} WHERE key='website-v3'`;
  }
  for (const path of paths)
    assert.match(
      await (await get(path)).text(),
      /Automatically generated image description|Automatisch erstellte Bildbeschreibung/,
      "restored publication must be readable without an ISR delay",
    );
});
