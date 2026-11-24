import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { CvProject } from "@homepage/content/models";
import { publicBrandSpelling } from "@homepage/content/publicIdentity";
import type { LabSnapshot } from "../../apps/web/src/components/ProjectLab/analysis";
import { publicLabSnapshot } from "../../apps/web/src/components/ProjectLab/publicSnapshot";
import { projectAtlasData } from "../../apps/web/src/components/ExperienceAtlas/model";
import { prepareSemanticSpaces } from "../../apps/web/src/components/ExperienceAtlas/semanticSpaces";

// Explicit inputs keep private exports out of the deploy and never trigger paid embedding calls.
async function main() {
  const [snapshotPath, publicationPath, embeddingsPath] = process.argv.slice(2);
  if (
    !snapshotPath ||
    !publicationPath ||
    !embeddingsPath ||
    process.argv.length !== 5
  )
    throw new Error(
      "Usage: prepare-preview.ts SNAPSHOT.json PUBLICATION_EXPORT.json EMBEDDINGS.json",
    );
  const [source, publication, cache] = await Promise.all(
    [snapshotPath, publicationPath, embeddingsPath].map(async (path) =>
      JSON.parse(await readFile(resolve(path), "utf8")),
    ),
  );
  const published = publication.projects as CvProject[];
  const snapshot = publicLabSnapshot(source as LabSnapshot, published);
  if (!snapshot.projects.length)
    throw new Error("No public projects to prepare");
  const atlas = projectAtlasData(snapshot.projects, published);
  const semantic = prepareSemanticSpaces(
    snapshot.projects,
    cache,
    snapshot.metadata.publicationRefreshedAt,
  );
  const output = resolve("apps/web/src/content/lab-preview.json");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(
    output,
    `${JSON.stringify(publicBrandSpelling({ snapshot, atlas, semantic }))}\n`,
  );
  console.log(
    JSON.stringify({
      output,
      projects: atlas.length,
      spaces: Object.fromEntries(
        Object.entries(semantic.spaces).map(([id, space]) => [
          id,
          { included: space.ids.length, excluded: space.excluded.length },
        ]),
      ),
    }),
  );
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Preview preparation failed",
  );
  process.exitCode = 1;
});
