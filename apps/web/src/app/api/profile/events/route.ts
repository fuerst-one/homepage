import { randomUUID } from "node:crypto";
import { after, NextRequest } from "next/server";
import {
  parseProfileEventBatch,
  validProfileToken,
  type SharedProfileEvent,
} from "@homepage/content/visitorProfile";
import {
  deleteProfileEvents,
  storeProfileEvents,
  pruneProfileEvents,
} from "@homepage/database/visitorProfile";
import { getProfileCatalog } from "../../../../server/content/getProfileCatalog";
import { checkRateLimit } from "../../../../server/api/rateLimit";
import { buildProfileSignalEvents } from "../../../../server/analytics/profileSignals";
import {
  getAnalyticsConfig,
  sendToUmami,
} from "../../../../server/analytics/umami";

export const runtime = "nodejs";
const reply = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
function countSharedSignals(
  request: NextRequest,
  events: SharedProfileEvent[],
) {
  const analytics = getAnalyticsConfig();
  const userAgent = request.headers.get("user-agent");
  if (!analytics || !userAgent || request.headers.get("sec-gpc") === "1")
    return;
  const sends = buildProfileSignalEvents(
    events,
    {
      websiteId: analytics.websiteId,
      hostname: request.nextUrl.hostname,
      userAgent,
    },
    randomUUID(),
  );
  after(() => Promise.all(sends.map((send) => sendToUmami(analytics, send))));
}
async function readInput(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("body");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (
      let chunk = await reader.read();
      !chunk.done;
      chunk = await reader.read()
    ) {
      const value = chunk.value;
      length += value.byteLength;
      if (length > 16_384) {
        await reader.cancel();
        throw new Error("size");
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } finally {
    reader.releaseLock();
  }
}
async function handle(request: NextRequest, remove: boolean) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return reply({ error: "origin" }, 403);
  if (!checkRateLimit(request).allowed)
    return reply({ error: "rate_limit" }, 429);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return reply({ error: "content_type" }, 415);
  let input: unknown;
  try {
    input = await readInput(request);
  } catch {
    return reply({ error: "invalid_input" }, 400);
  }
  try {
    if (remove) {
      if (
        !input ||
        typeof input !== "object" ||
        Object.keys(input).length !== 1 ||
        !("token" in input) ||
        !validProfileToken(input.token)
      )
        return reply({ error: "invalid_token" }, 400);
      await deleteProfileEvents(input.token);
      return reply({ deleted: true });
    }
    const batch = parseProfileEventBatch(input, await getProfileCatalog());
    if (!batch) return reply({ error: "invalid_events" }, 400);
    const accepted = await storeProfileEvents(
      batch.token,
      batch.events,
      undefined,
      batch.consentAt,
    );
    if (!accepted) return reply({ error: "session_closed" }, 409);
    countSharedSignals(request, batch.events);
    await pruneProfileEvents();
    return reply({ accepted: batch.events.length });
  } catch {
    return reply({ error: "unavailable" }, 503);
  }
}
export const POST = (request: NextRequest) => handle(request, false);
export const DELETE = (request: NextRequest) => handle(request, true);
