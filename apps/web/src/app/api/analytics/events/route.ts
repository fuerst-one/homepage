import { after, NextRequest } from "next/server";
import { checkRateLimit } from "../../../../server/api/rateLimit";
import {
  buildInteractionEvent,
  parseInteraction,
} from "../../../../server/analytics/interactionEvents";
import {
  getAnalyticsConfig,
  sendToUmami,
} from "../../../../server/analytics/umami";

export const runtime = "nodejs";
const MAX_BODY_LENGTH = 1024;

const reply = (status: number) =>
  new Response(null, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return reply(403);
  if (!checkRateLimit(request).allowed) return reply(429);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return reply(415);
  const body = await request.text();
  if (body.length > MAX_BODY_LENGTH) return reply(413);
  let interaction;
  try {
    interaction = parseInteraction(JSON.parse(body));
  } catch {
    return reply(400);
  }
  if (!interaction) return reply(400);

  const config = getAnalyticsConfig();
  const send = config && buildInteractionEvent(request, interaction, config);
  if (config && send) after(() => sendToUmami(config, send));
  return reply(204);
}
