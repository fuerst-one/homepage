import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";
import { buildPageView } from "./server/analytics/pageView";
import { getAnalyticsConfig, sendToUmami } from "./server/analytics/umami";

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const config = getAnalyticsConfig();
  const pageView = config && buildPageView(request, config);
  if (config && pageView) event.waitUntil(sendToUmami(config, pageView));
  return NextResponse.next();
}

export const config = {
  matcher: [
    {
      source: "/:locale(en|de)/:path*",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
