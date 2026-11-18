/** Dry run by default. Pass --embed to cache only missing/changed public field combinations. */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  embedKnowledge,
  embeddingModel,
} from "../../packages/knowledge/src/openRouter";
import type { LabSnapshot } from "../../apps/web/src/components/ProjectLab/analysis";
import {
  embeddingInput,
  embeddingKey,
} from "../../apps/web/src/components/ExperienceAtlas/embeddingInputs";
import {
  SPACE_RECIPES,
  type SemanticCache,
} from "../../apps/web/src/components/ExperienceAtlas/spaceTypes";

async function main() {
  const path = resolve("data/project-lab/semantic-embeddings.json");
  const snapshot: LabSnapshot = JSON.parse(
    await readFile(
      process.env.PROJECT_LAB_SNAPSHOT ??
        resolve("data/project-lab/snapshot.json"),
      "utf8",
    ),
  );
  const model = embeddingModel();
  if (model !== "openai/text-embedding-3-small")
    throw new Error(
      "Atlas script expects the configured small embedding model",
    );
  let cache: SemanticCache = {
    version: 1,
    model,
    dimensions: 1536,
    generatedAt: new Date().toISOString(),
    records: [],
  };
  try {
    const previous: SemanticCache = JSON.parse(await readFile(path, "utf8"));
    if (
      previous.version === 1 &&
      previous.model === model &&
      previous.dimensions === 1536
    )
      cache = previous;
  } catch {
    /* First run has no cache. */
  }
  const entries = snapshot.projects
    .flatMap((project) =>
      SPACE_RECIPES.filter(({ id }) => id === "engineering").map(
        ({ id: recipe }) => ({
          id: project.id,
          recipe,
          hash: embeddingKey(project, recipe, model),
          input: embeddingInput(project, recipe),
        }),
      ),
    )
    .filter((entry) => entry.input);
  const pending = entries.filter(
    (entry) =>
      !cache.records.some(
        (old) =>
          old.id === entry.id &&
          old.recipe === entry.recipe &&
          old.hash === entry.hash &&
          old.embedding.length === 1536 &&
          old.embedding.every(Number.isFinite) &&
          Math.hypot(...old.embedding) > 0,
      ),
  );
  console.log(
    JSON.stringify({
      model,
      combinations: entries.length,
      cached: entries.length - pending.length,
      pending: pending.length,
      inputCharacters: pending.reduce(
        (sum, entry) => sum + entry.input.length,
        0,
      ),
      mode: process.argv.includes("--embed") ? "embed" : "dry-run",
    }),
  );
  if (!process.argv.includes("--embed")) return;
  await mkdir(dirname(path), { recursive: true });
  for (let start = 0; start < pending.length; start += 24) {
    const batch = pending.slice(start, start + 24);
    const vectors = await embedKnowledge(batch.map((entry) => entry.input));
    const replacing = new Set(
      batch.map((entry) => `${entry.recipe}:${entry.id}`),
    );
    cache.records = cache.records
      .filter((record) => !replacing.has(`${record.recipe}:${record.id}`))
      .concat(
        batch.map((entry, i) => ({
          id: entry.id,
          recipe: entry.recipe,
          hash: entry.hash,
          embedding: vectors[i],
        })),
      );
    cache.generatedAt = new Date().toISOString();
    await writeFile(`${path}.tmp`, JSON.stringify(cache), { mode: 0o600 });
    await rename(`${path}.tmp`, path);
    console.log(
      `Cached ${Math.min(start + batch.length, pending.length)}/${pending.length} new embeddings`,
    );
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error &&
      /OpenRouter request failed|Atlas script expects/.test(error.message)
      ? error.message
      : "Atlas embedding preparation failed; inputs and credentials were not logged",
  );
  process.exitCode = 1;
});
