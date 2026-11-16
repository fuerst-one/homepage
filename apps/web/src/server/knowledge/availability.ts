import { createServiceCircuit } from "./serviceCircuit";
import {
  knowledgeResponseSchema,
  validateKnowledgeAnswer,
} from "@homepage/content/knowledge";
import { knowledgeDatabase } from "@homepage/database/database";
import {
  chatModel,
  embeddingModel,
  embedKnowledge,
  routerRequest,
  verifyChatPrice,
} from "@homepage/knowledge/openRouter";
import {
  finishKnowledgeUsage,
  reserveKnowledgeUsage,
  KnowledgeQuotaError,
} from "@homepage/knowledge/usage";

// Route bundles in the same Node process share this flag; it needs no healthy DB.
const state = globalThis as typeof globalThis & {
  homepageKnowledgeCircuit?: ReturnType<typeof createServiceCircuit>;
};
export const knowledgeAvailability = () =>
  (state.homepageKnowledgeCircuit ??= createServiceCircuit({
    shouldTripProbe: (error) => !(error instanceof KnowledgeQuotaError),
  }));

/** Verify the dependencies actually used by answers, within the shared budget. */
export async function probeKnowledgeServices(signal: AbortSignal) {
  if (
    !(process.env.KNOWLEDGE_RATE_LIMIT_SECRET || process.env.CRON_SECRET) ||
    embeddingModel() !== "openai/text-embedding-3-small"
  )
    throw new Error("Knowledge configuration unavailable");
  const sql = knowledgeDatabase();
  const [sync] =
    await sql`SELECT synced_at > now() - interval '15 minutes' AS fresh FROM knowledge_sync WHERE id=1`.signal(
      signal,
    );
  if (!sync?.fresh) throw new Error("Knowledge source needs synchronization");
  const chunks = await sql`SELECT 1 FROM knowledge_chunks LIMIT 1`.signal(
    signal,
  );
  if (!chunks.length) throw new Error("Knowledge source empty");
  // Cold server instances can reuse a successful synthetic check for one hour.
  // A process that observed an actual failure must verify recovery itself.
  if (knowledgeAvailability().status().available) {
    const [shared] = await sql`SELECT EXISTS(
      SELECT 1 FROM knowledge_usage WHERE kind='probe' AND status='complete'
      AND created_at > now()-interval '1 hour'
    ) AS healthy`.signal(signal);
    if (shared?.healthy) return;
  }
  await verifyChatPrice(signal);
  const reservation = await reserveKnowledgeUsage(
    "availability-probe",
    true,
    signal,
  );
  try {
    signal.throwIfAborted();
    await embedKnowledge(["Portfolio availability check"], signal);
    const evidence = [
      {
        id: "s1",
        projectId: "probe",
        title: "Availability check",
        href: "/en/projects",
        content: "This is synthetic health-check data.",
      },
    ];
    const result = await routerRequest(
      "chat/completions",
      {
        model: chatModel(),
        messages: [
          {
            role: "user",
            content:
              'Return answer OK, sourceIds ["s1"], actions []. This is a synthetic availability check.',
          },
        ],
        max_tokens: 64,
        temperature: 0.1,
        provider: { require_parameters: true },
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "portfolio_probe",
            strict: true,
            schema: knowledgeResponseSchema(evidence),
          },
        },
      },
      signal,
    );
    const content = result.choices?.[0]?.message?.content;
    if (
      typeof content !== "string" ||
      !validateKnowledgeAnswer(JSON.parse(content), evidence, "en")
    )
      throw new Error("Model probe failed");
    await finishKnowledgeUsage(
      reservation,
      typeof result.usage?.cost === "number" ? result.usage.cost : undefined,
      false,
      signal,
    );
  } catch (error) {
    await finishKnowledgeUsage(
      reservation,
      undefined,
      true,
      AbortSignal.timeout(750),
    ).catch(() => {});
    throw error;
  }
}
