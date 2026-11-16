import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  MALT_PROFILE_URL,
  parseMaltProfile,
} from "@homepage/content/maltMirror";
import { postgresMaltMirrorStore } from "@homepage/database/postgresMaltMirrorStore";
import { refreshMaltMirror } from "@homepage/database/refreshMaltMirror";
import { fetchMaltProfile } from "../../../../server/malt/fetchMaltProfile";

export const runtime = "nodejs";
const respond = (body: unknown, status: number) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
function unauthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return respond({ error: "unconfigured" }, 503);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected))
    return respond({ error: "unauthorized" }, 401);
}
export async function GET(request: NextRequest) {
  const rejected = unauthorized(request);
  if (rejected) return rejected;
  try {
    const result = await refreshMaltMirror(
      postgresMaltMirrorStore(),
      fetchMaltProfile,
    );
    return respond(result, result.status === "ok" ? 200 : 502);
  } catch {
    return respond({ error: "mirror_storage_failed" }, 503);
  }
}

/** Operator import of a fresh, public browser observation while public server fetching is blocked. */
export async function POST(request: NextRequest) {
  const rejected = unauthorized(request);
  if (rejected) return rejected;
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return respond({ error: "content_type" }, 415);
  const reader = request.body?.getReader();
  if (!reader) return respond({ error: "body" }, 400);
  let observation;
  try {
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 200_000) {
        await reader.cancel();
        return respond({ error: "too_large" }, 413);
      }
      chunks.push(value);
    }
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const age = Date.now() - Date.parse(input.observedAt);
    if (
      input.sourceUrl !== MALT_PROFILE_URL ||
      typeof input.html !== "string" ||
      !Number.isFinite(age) ||
      age < 0 ||
      age > 3600_000
    )
      return respond({ error: "invalid_observation" }, 400);
    observation = parseMaltProfile(
      input.html,
      input.observedAt,
      "browser-verified",
    );
  } catch {
    return respond({ error: "invalid_observation" }, 400);
  }
  try {
    const written = await postgresMaltMirrorStore().write({
      version: 1,
      profileUrl: MALT_PROFILE_URL,
      observation,
      lastAttempt: { at: observation.observedAt, status: "ok" },
    });
    if (written === "older")
      return respond({ error: "older_observation" }, 409);
    return respond({ status: "ok", observedAt: observation.observedAt }, 200);
  } catch {
    return respond({ error: "mirror_storage_failed" }, 503);
  }
}
