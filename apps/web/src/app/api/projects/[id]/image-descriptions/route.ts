import { NextRequest, NextResponse } from "next/server";
import { readPublicImageDescriptions } from "@homepage/database/imageDescriptions";
export const runtime = "nodejs";
/** Read precomputed public text; viewing an image never invokes a model. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";
  if (!["en", "de"].includes(locale) || id.length > 100)
    return NextResponse.json({ descriptions: [] }, { status: 400 });
  try {
    return NextResponse.json(
      {
        descriptions: await readPublicImageDescriptions(
          id,
          locale as "en" | "de",
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { descriptions: [] },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
