import { after, NextResponse } from "next/server";
import { getSiteFeatures } from "@/server/siteFeatures";
import {
  knowledgeAvailability,
  probeKnowledgeServices,
} from "../../../../server/knowledge/availability";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  if (
    !getSiteFeatures().assistantEnabled ||
    !process.env.KNOWLEDGE_DATABASE_URL ||
    !process.env.OPENROUTER_API_KEY
  )
    return NextResponse.json(
      { available: false, verified: false, retryAt: Date.now() + 300_000 },
      { headers: { "Cache-Control": "no-store" } },
    );
  const circuit = knowledgeAvailability();
  const status = circuit.status();
  // Health checks use fixed synthetic text only, never visitor questions, history or IPs.
  if (!status.available || !status.verified)
    after(() => circuit.probe(probeKnowledgeServices, true));
  return NextResponse.json(
    {
      ...status,
      available: status.available && status.verified,
      retryAt: status.verified
        ? status.retryAt
        : Math.max(status.retryAt, Date.now() + 5000),
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
