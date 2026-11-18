import { after, NextRequest, NextResponse } from "next/server";
import { parseKnowledgeRequest } from "@homepage/content/knowledge";
import { KnowledgeQuotaError } from "@homepage/knowledge/usage";
import { recordKnowledgeAdmission } from "@homepage/knowledge/policy";
import { parseKnowledgeConsent } from "@/lib/knowledgeConsent";
import { getSiteFeatures } from "@/server/siteFeatures";
import {
  getKnowledgeAdmission,
  knowledgeClientAddress,
} from "@/server/knowledge/admission";
import { searchKnowledgeProjects } from "@/server/knowledge/projectSearch";

export const runtime = "nodejs";
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  if (!getSiteFeatures().assistantEnabled)
    return reply({ error: "unavailable" }, 503);
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
      Date.now(),
      "search",
    )
  )
    return reply({ error: "consent_required" }, 428);
  const parsed = parseKnowledgeRequest(input, "search");
  if (!parsed) return reply({ error: "invalid_request" }, 400);
  const admission = await getKnowledgeAdmission(request, parsed.message);
  const address = knowledgeClientAddress(request);
  if (!admission.allowed || !address)
    return reply({ error: "unavailable" }, 503);
  try {
    const projectIds = await searchKnowledgeProjects(
      parsed.message,
      address,
      AbortSignal.any([request.signal, AbortSignal.timeout(8000)]),
      parsed.consent,
      (input as { message: string }).message,
    );
    return reply({ projectIds });
  } catch (error) {
    if (error instanceof KnowledgeQuotaError)
      after(() => recordKnowledgeAdmission("quota").catch(() => {}));
    return reply(
      { error: "unavailable" },
      error instanceof KnowledgeQuotaError ? 429 : 503,
    );
  }
}
