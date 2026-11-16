import { NextRequest, NextResponse } from "next/server";
import {
  propertyAssetKey,
  readWebsiteAsset,
} from "@homepage/database/websiteContent";
import { assetResponse } from "../../../../../server/content/assetResponse";

export const runtime = "nodejs";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string; property: string }> },
) {
  const { pageId, property } = await params;
  const index = Number(request.nextUrl.searchParams.get("i") ?? 0);
  if (!Number.isInteger(index) || index < 0 || index > 50)
    return new NextResponse(null, { status: 400 });
  try {
    return assetResponse(
      await readWebsiteAsset(propertyAssetKey(pageId, property, index)),
    );
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
