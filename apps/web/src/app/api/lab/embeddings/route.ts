import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { embedKnowledge, embeddingModel } from "@homepage/knowledge/openRouter";
import preview from "../../../../content/lab-preview.json";
import type { LabProject } from "../../../../components/ProjectLab/analysis";
import { fieldAvailability } from "../../../../components/ExperienceAtlas/embeddingFields";
import {
  embeddingInput,
  embeddingKey,
} from "../../../../components/ExperienceAtlas/embeddingInputs";
import {
  ExperimentInputError,
  runEmbeddingExperiment,
  validExperimentVector,
  vectorKey,
} from "../../../../components/ExperienceAtlas/embeddingExperiments";
import { localExperimentAllowed } from "../../../../components/ExperienceAtlas/experimentAccess";
import type { SemanticCache } from "../../../../components/ExperienceAtlas/spaceTypes";

export const runtime = "nodejs";
const projects = preview.snapshot.projects as LabProject[];
let running = false;
const respond = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  if (!localExperimentAllowed(request, process.env.NODE_ENV))
    return respond({ error: "Not available" }, 404);
  return respond({
    configured: Boolean(process.env.OPENROUTER_API_KEY),
    fields: fieldAvailability(projects),
    projects: projects.length,
  });
}

export async function POST(request: Request) {
  if (!localExperimentAllowed(request, process.env.NODE_ENV, true))
    return respond({ error: "Not available" }, 404);
  if (running)
    return respond(
      { error: "A comparison is already running. Try again when it finishes." },
      429,
    );
  if (embeddingModel() !== "openai/text-embedding-3-small")
    return respond(
      { error: "The lab requires the configured small embedding model." },
      503,
    );
  if (Number(request.headers.get("content-length")) > 8192)
    return respond({ error: "Selection too large" }, 413);
  running = true;
  let stage = "selection";
  try {
    const text = await request.text();
    if (text.length > 8192)
      return respond({ error: "Selection too large" }, 413);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return respond({ error: "Invalid selection" }, 400);
    }
    const model = embeddingModel(),
      dimensions = 1536;
    const directory = resolve(process.cwd(), "../../data/project-lab");
    const path = resolve(directory, "field-experiment-vectors.json");
    const cache = new Map<string, number[]>();
    stage = "cache-read";
    try {
      const saved = JSON.parse(await readFile(path, "utf8"));
      if (
        saved.model === model &&
        saved.version === 1 &&
        saved.dimensions === dimensions
      )
        for (const [key, value] of Object.entries(saved.vectors ?? {}))
          if (
            /^[a-f0-9]{64}$/.test(key) &&
            validExperimentVector(value, dimensions)
          )
            cache.set(key, value);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    // Existing prepared lens vectors are valid joint-text cache entries too.
    try {
      const legacy = JSON.parse(
        await readFile(resolve(directory, "semantic-embeddings.json"), "utf8"),
      ) as SemanticCache;
      if (legacy.model === model && legacy.dimensions === dimensions)
        for (const record of legacy.records) {
          const project = projects.find((p) => p.id === record.id);
          if (
            project &&
            record.hash === embeddingKey(project, record.recipe, model) &&
            validExperimentVector(record.embedding, dimensions)
          )
            cache.set(
              vectorKey(
                model,
                dimensions,
                embeddingInput(project, record.recipe),
              ),
              record.embedding,
            );
        }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    stage = "calculation";
    const result = await runEmbeddingExperiment(projects, body, {
      model,
      dimensions,
      cache,
      embed: async (inputs) => {
        stage = "provider";
        const vectors = await embedKnowledge(inputs, request.signal);
        stage = "calculation";
        return vectors;
      },
      persist: async () => {
        stage = "cache-write";
        await mkdir(directory, { recursive: true });
        await writeFile(
          `${path}.tmp`,
          JSON.stringify({
            version: 1,
            model,
            dimensions,
            vectors: Object.fromEntries(cache),
          }),
          { mode: 0o600 },
        );
        await rename(`${path}.tmp`, path);
        stage = "calculation";
      },
    });
    return respond(result);
  } catch (error) {
    if (error instanceof ExperimentInputError)
      return respond({ error: error.message }, 400);
    if (request.signal.aborted)
      return respond(
        { error: "Comparison cancelled. Completed vectors remain cached." },
        499,
      );
    // Do not log raw provider errors: they can contain input text or credentials.
    const code = (error as NodeJS.ErrnoException)?.code;
    console.error("[lab embeddings] comparison failed", {
      stage,
      code:
        typeof code === "string" && /^[A-Z_]{1,24}$/.test(code)
          ? code
          : "UNEXPECTED_ERROR",
    });
    if (stage.startsWith("cache-"))
      return respond(
        {
          error:
            "The local vector cache could not be read or saved. Check the dev-server log and cache file before retrying.",
        },
        500,
      );
    return respond(
      {
        error: process.env.OPENROUTER_API_KEY
          ? "The comparison could not finish. Cached vectors are preserved; retry to continue."
          : "The local dev server needs its embedding-provider configuration.",
      },
      502,
    );
  } finally {
    running = false;
  }
}
