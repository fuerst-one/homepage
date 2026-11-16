import { NextRequest, NextResponse } from "next/server";
import { isLocale } from "@/lib/i18n";
import { safeCaseStudyImage } from "@/lib/projectCaseStudy";
import { getProjectCaseStudy } from "@/server/notion/getProjectCaseStudy";
import type { CaseStudyBlock } from "@/server/notion/caseStudyBlocks";

const findImage = (blocks: CaseStudyBlock[], id: string): string | null => {
  for (const block of blocks) {
    if (block.id === id && block.type === "image")
      return safeCaseStudyImage(block.imageUrl);
    const nested = findImage(block.children, id);
    if (nested) return nested;
  }
  return null;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> },
) {
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";
  if (!isLocale(locale)) return new NextResponse(null, { status: 400 });
  const { id, blockId } = await params;
  const read = async (refresh = false) => {
    const study = await getProjectCaseStudy(id, locale, refresh);
    const url = study && findImage(study.blocks, blockId);
    return url
      ? fetch(url, {
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(15000),
        })
      : null;
  };
  try {
    let image = await read();
    if (image?.status === 403 || image?.status === 410)
      image = await read(true);
    if (!image) return new NextResponse(null, { status: 404 });
    const contentType = image.headers.get("content-type") ?? "";
    if (
      !image.ok ||
      !/^image\/(?:jpeg|png|webp|gif|avif)(?:;|$)/i.test(contentType)
    )
      return new NextResponse(null, { status: 502 });
    return new NextResponse(image.body, {
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
