import { NextRequest, NextResponse } from "next/server";
import { parseEnquiry, ENQUIRY_MAX_BODY_BYTES } from "@/lib/enquiry";
import { submitEnquiry } from "@/server/enquiries/submitEnquiry";
import { notionEnquiryStore } from "@/server/enquiries/notionEnquiryStore";
import { checkRateLimit } from "@/server/api/rateLimit";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
const respond = (body: unknown, status: number) =>
  NextResponse.json(body, { status, headers });

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return respond({ error: "origin" }, 403);
  if (!checkRateLimit(request).allowed)
    return respond({ error: "rate_limit" }, 429);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return respond({ error: "content_type" }, 415);
  const reader = request.body?.getReader();
  if (!reader) return respond({ error: "invalid_brief" }, 400);
  let input: unknown;
  try {
    const chunks: Uint8Array[] = [];
    let length = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > ENQUIRY_MAX_BODY_BYTES) {
        await reader.cancel();
        return respond({ error: "too_large" }, 413);
      }
      chunks.push(value);
    }
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return respond({ error: "invalid_json" }, 400);
  }
  const parsed = parseEnquiry(input);
  if (!parsed.ok)
    return respond({ error: "invalid_brief", fields: parsed.fields }, 400);
  try {
    const saved = await submitEnquiry(parsed.value, notionEnquiryStore());
    return respond({ receipt: saved.receipt }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "enquiry_conflict")
      return respond({ error: "conflict" }, 409);
    // Do not log the brief, email, credentials or upstream request payload.
    console.error("Enquiry persistence failed");
    return respond({ error: "save_failed" }, 503);
  }
}
