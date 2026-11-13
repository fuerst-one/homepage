import { toPublicProject } from "@/lib/localizeContent";
import { isLocale } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { getCachedCvProjects } from "@/server/notion/getCachedCvProjects";
import {
  buildRateLimitedResponse,
  checkRateLimit,
} from "@/server/api/rateLimit";
import { buildApiHeaders } from "@/server/api/responseHeaders";
import { API_BASE_URL } from "@/server/api/baseUrl";
import { projectPath, SITE_URL } from "@/lib/seo";

export const runtime = "nodejs";

const absolutizeImagePaths = (paths: string[] | null): string[] | null => {
  if (!paths) return paths;
  return paths.map((path) =>
    path.startsWith("/") ? `${API_BASE_URL}${path}` : path,
  );
};

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const rateLimit = checkRateLimit(request);
  if (!rateLimit.allowed) return buildRateLimitedResponse(rateLimit);
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";
  if (!isLocale(locale))
    return NextResponse.json(
      { error: "Invalid locale", expected: "en|de" },
      { status: 400, headers: buildApiHeaders(rateLimit) },
    );

  const { id } = await params;
  const projects = await getCachedCvProjects(locale);
  const project = projects.find((p) => p.id === id);

  if (!project) {
    return NextResponse.json(
      { error: "not_found", message: `No project with id "${id}"` },
      { status: 404, headers: buildApiHeaders(rateLimit) },
    );
  }

  const absoluteProject = {
    ...toPublicProject(project),
    webUrl: `${SITE_URL}${projectPath(project)}`,
    logo: absolutizeImagePaths(project.logo),
    screenshots: absolutizeImagePaths(project.screenshots),
  };

  return NextResponse.json(absoluteProject, {
    headers: buildApiHeaders(rateLimit),
  });
};
