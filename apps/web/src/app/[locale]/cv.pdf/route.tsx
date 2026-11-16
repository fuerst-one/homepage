import { NextRequest, NextResponse } from "next/server";
import { isLocale } from "@homepage/content/i18n";
import { retiredCvResponse } from "../../../server/api/retiredCv";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  if (!isLocale((await params).locale))
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  return retiredCvResponse(request);
}
