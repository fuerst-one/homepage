import { isLocale } from "@homepage/content/i18n";
import { NextRequest, NextResponse } from "next/server";
import { readWebsiteSections } from "@homepage/database/websiteContent";
import { filterCvProjectsForApi } from "../../../server/api/filterCvProjects";
import { parseListParams } from "../../../server/api/parseListParams";
import { toProjectListItem } from "../../../server/api/projectListItem";
import {
  buildRateLimitedResponse,
  checkRateLimit,
} from "../../../server/api/rateLimit";
import { buildApiHeaders } from "../../../server/api/responseHeaders";

export const runtime = "nodejs";

export const GET = async (request: NextRequest) => {
  const rateLimit = checkRateLimit(request);
  if (!rateLimit.allowed) return buildRateLimitedResponse(rateLimit);
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";
  if (!isLocale(locale))
    return NextResponse.json(
      { error: "Invalid locale", expected: "en|de" },
      { status: 400, headers: buildApiHeaders(rateLimit) },
    );

  const parsed = parseListParams(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, param: parsed.param, expected: parsed.expected },
      { status: 400, headers: buildApiHeaders(rateLimit) },
    );
  }

  const { projects, icons, cases } = await readWebsiteSections(
    ["projects", "icons", "cases"],
    undefined,
    locale,
  );
  const allProjects = projects;
  const casesById = new Map(cases.map((value) => [value.id, value.caseStudy]));
  const matched = filterCvProjectsForApi(allProjects, parsed.params);
  const results = matched.map((project) => ({
    matching: casesById.get(project.id),
    ...toProjectListItem(
      {
        ...project,
        icon: icons ? (icons[project.id] ?? null) : (project.icon ?? null),
      },
      locale,
    ),
  }));

  return NextResponse.json(
    { count: results.length, total: allProjects.length, results },
    {
      headers: {
        ...buildApiHeaders(rateLimit),
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    },
  );
};
