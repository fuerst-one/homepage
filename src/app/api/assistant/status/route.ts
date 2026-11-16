import { after, NextRequest, NextResponse } from "next/server";
import {
  knowledgeAvailability,
  probeKnowledgeServices,
} from "@/server/knowledge/availability";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) {
  if (process.env.KNOWLEDGE_ASSISTANT_ENABLED !== "true")
    return NextResponse.json(
      { available: false, verified: false, retryAt: Date.now() + 300_000 },
      { headers: { "Cache-Control": "no-store" } },
    );
  const circuit = knowledgeAvailability();
  const recover = request.nextUrl.searchParams.get("recover") === "1";
  const status = circuit.status();
  if (!status.available || (recover && !status.verified))
    after(() => circuit.probe(probeKnowledgeServices, recover));
  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-store" },
  });
}
