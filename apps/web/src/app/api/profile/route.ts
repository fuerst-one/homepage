import { isLocale } from "@homepage/content/i18n";
import { NextRequest, NextResponse } from "next/server";
import { getCachedCvOwnerPublic } from "../../../server/content/getCachedCvOwner";
import {
  buildRateLimitedResponse,
  checkRateLimit,
} from "../../../server/api/rateLimit";
import { buildApiHeaders } from "../../../server/api/responseHeaders";
import { API_BASE_URL } from "../../../server/api/baseUrl";

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

  const profile = await getCachedCvOwnerPublic(locale);
  const absoluteProfile = {
    ...profile,
    avatarUrl: profile.avatarUrl ? `${API_BASE_URL}${profile.avatarUrl}` : null,
  };

  return NextResponse.json(absoluteProfile, {
    headers: buildApiHeaders(rateLimit),
  });
};
