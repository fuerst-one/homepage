import { NextRequest, NextResponse } from "next/server";
import { GET as renderPdf } from "@/app/cv.pdf/route";
import { isLocale } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  if (!isLocale((await params).locale))
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  return renderPdf(request);
}
