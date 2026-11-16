import { NextRequest, NextResponse } from "next/server";
import { isLocale } from "@homepage/content/i18n";
import { getProjectCaseStudy } from "../../../../../../../server/content/getProjectCaseStudy";
import {
  caseAssetKey,
  readWebsiteAsset,
} from "@homepage/database/websiteContent";
import { assetResponse } from "../../../../../../../server/content/assetResponse";

export const runtime = "nodejs";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> },
) {
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";
  if (!isLocale(locale)) return new NextResponse(null, { status: 400 });
  const { id, blockId } = await params;
  try {
    const study = await getProjectCaseStudy(id, locale);
    if (!study) return new NextResponse(null, { status: 404 });
    return assetResponse(
      await readWebsiteAsset(caseAssetKey(study.pageId, blockId)),
    );
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
