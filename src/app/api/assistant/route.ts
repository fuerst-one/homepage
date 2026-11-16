import { after, NextRequest, NextResponse } from "next/server";
import { parseKnowledgeRequest } from "@/lib/knowledge";
import { answerKnowledge } from "@/server/knowledge/chat";
import { KnowledgeQuotaError } from "@/server/knowledge/usage";
import { knowledgeFallback } from "@/lib/knowledgeFallback";
import {
  knowledgeAvailability,
  probeKnowledgeServices,
} from "@/server/knowledge/availability";

export const runtime = "nodejs";
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  if (process.env.KNOWLEDGE_ASSISTANT_ENABLED !== "true")
    return reply({ error: "unavailable" }, 503);
  // CSRF check only; the durable database quotas enforce the public usage boundary.
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return reply({ error: "origin" }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return reply({ error: "content_type" }, 415);
  const reader = request.body?.getReader();
  if (!reader) return reply({ error: "invalid_request" }, 400);
  let input: unknown;
  try {
    let size = 0;
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 5000) {
        await reader.cancel();
        return reply({ error: "too_large" }, 413);
      }
      chunks.push(value);
    }
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return reply({ error: "invalid_request" }, 400);
  }
  const parsed = parseKnowledgeRequest(input);
  if (!parsed) return reply({ error: "invalid_request" }, 400);
  // Vercel replaces this header at its trusted ingress. Local testing shares one visitor bucket.
  const ip =
    process.env.VERCEL === "1"
      ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0] ||
        "unknown"
      : "local";
  const circuit = knowledgeAvailability();
  let mode: "answer" | "fallback" = "answer";
  const answer = await circuit.run(
    (signal) => answerKnowledge(parsed.message, parsed.locale, ip, signal),
    () => {
      mode = "fallback";
      return knowledgeFallback(parsed.locale);
    },
    (error) => !(error instanceof KnowledgeQuotaError),
  );
  if (!circuit.status().available)
    after(() => circuit.probe(probeKnowledgeServices));
  return reply({ ...answer, mode, availability: circuit.status() });
}
