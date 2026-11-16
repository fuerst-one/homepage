import { after, NextRequest, NextResponse } from "next/server";
import { parseKnowledgeRequest } from "@homepage/content/knowledge";
import { answerKnowledge } from "../../../server/knowledge/chat";
import { KnowledgeQuotaError } from "@homepage/knowledge/usage";
import { knowledgeFallback } from "../../../lib/knowledgeFallback";
import { parseKnowledgeConsent } from "@/lib/knowledgeConsent";
import { getSiteFeatures } from "@/server/siteFeatures";
import {
  getKnowledgeAdmission,
  knowledgeClientAddress,
} from "@/server/knowledge/admission";
import { recordKnowledgeAdmission } from "@homepage/knowledge/policy";
import {
  knowledgeAvailability,
  probeKnowledgeServices,
} from "../../../server/knowledge/availability";

export const runtime = "nodejs";
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  if (!getSiteFeatures().assistantEnabled)
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
  if (
    !parseKnowledgeConsent(
      input && typeof input === "object" && "consent" in input
        ? input.consent
        : null,
    )
  )
    return reply({ error: "consent_required" }, 428);
  const parsed = parseKnowledgeRequest(input);
  if (!parsed) return reply({ error: "invalid_request" }, 400);
  const admission = await getKnowledgeAdmission(request, parsed.message);
  if (!admission.allowed)
    return reply({
      ...knowledgeFallback(parsed.locale),
      mode: "fallback",
      availability: {
        eligible: false,
        available: false,
        verified: false,
        retryAt: admission.retryAt,
      },
    });
  const ip = knowledgeClientAddress(request);
  if (!ip) return reply({ error: "unavailable" }, 503);
  const circuit = knowledgeAvailability();
  let mode: "answer" | "fallback" = "answer";
  const answer = await circuit.run(
    (signal) =>
      answerKnowledge(
        parsed.message,
        parsed.locale,
        ip,
        AbortSignal.any([signal, request.signal]),
        parsed.consent,
      ),
    () => {
      mode = "fallback";
      return knowledgeFallback(parsed.locale);
    },
    (error) => {
      if (error instanceof KnowledgeQuotaError)
        after(() => recordKnowledgeAdmission("quota").catch(() => {}));
      return !request.signal.aborted && !(error instanceof KnowledgeQuotaError);
    },
  );
  if (!circuit.status().available)
    after(() => circuit.probe(probeKnowledgeServices));
  return reply({ ...answer, mode, availability: circuit.status() });
}
