import { localeFromPath } from "@/lib/i18n";
import { getSiteCopy } from "@/server/notion/getSiteCopy";
import { getCachedCvProjects } from "@/server/notion/getCachedCvProjects";
import { getCachedCvOwner } from "@/server/notion/getCachedCvOwner";
import { renderCvPdf } from "./renderCvPdf";
import { NextRequest, NextResponse } from "next/server";
import { resolvePreset, sortAndCapForPreset } from "@/components/Cv/cvPresets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = async (request: NextRequest) => {
  const locale = localeFromPath(request.nextUrl.pathname);
  const copy = await getSiteCopy(locale);
  const [allProjects, owner] = await Promise.all([
    getCachedCvProjects(locale),
    getCachedCvOwner(locale),
  ]);

  const preset = resolvePreset(request.nextUrl.searchParams.get("preset"));
  const featuredProjects = sortAndCapForPreset(allProjects, preset);

  const pdfBuffer = await renderCvPdf({
    featuredProjects,
    allProjects,
    owner,
    locale,
    summary: copy["pdf.summary"],
  });
  const pdfUint8Array = new Uint8Array(pdfBuffer);

  return new NextResponse(pdfUint8Array, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=cv-${locale}-${preset.id}.pdf`,
    },
  });
};
