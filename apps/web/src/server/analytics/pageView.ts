import { createHmac } from "node:crypto";
import { getClientIp } from "../api/rateLimit";
import type { AnalyticsConfig, UmamiSend } from "./umami";

type PageRequest = Pick<Request, "method" | "headers"> & { nextUrl: URL };

const PAGE_PATH = /^\/(en|de)(\/[^.]*)?$/;
const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
];
const LANGUAGE_TAG = /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i;
const COUNTRY = /^[A-Z]{2}$/;
// Temporary: scrapers posing as browsers pass Umami's user-agent bot check, so
// we record browser-set headers to find a signal that tells them apart.
const FINGERPRINT_HEADERS = [
  "accept",
  "accept-encoding",
  "priority",
  "sec-ch-ua",
  "sec-ch-ua-mobile",
  "sec-ch-ua-platform",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "sec-fetch-user",
  "upgrade-insecure-requests",
];
const FINGERPRINT_VALUE_LENGTH = 200;

function isPageNavigation({ method, nextUrl: url, headers }: PageRequest) {
  if (method !== "GET" || !PAGE_PATH.test(url.pathname)) return false;
  if (
    headers.has("next-router-prefetch") ||
    headers.get("sec-purpose")?.includes("prefetch") ||
    headers.get("purpose") === "prefetch"
  )
    return false;
  return (
    headers.get("rsc") === "1" || headers.get("sec-fetch-dest") === "document"
  );
}

function campaignQuery(url: URL) {
  const kept = new URLSearchParams();
  for (const name of UTM_PARAMS) {
    const value = url.searchParams.get(name);
    if (value) kept.set(name, value);
  }
  const query = kept.toString();
  return query ? `?${query}` : "";
}

function externalReferrerOrigin(referer: string | null, ownHost: string) {
  if (!referer) return undefined;
  try {
    const { protocol, host } = new URL(referer);
    if (!["http:", "https:"].includes(protocol) || host === ownHost)
      return undefined;
    return `${protocol}//${host}/`;
  } catch {
    return undefined;
  }
}

function primaryLanguage(acceptLanguage: string | null) {
  const tag = acceptLanguage?.split(",")[0]?.split(";")[0]?.trim();
  return tag && tag.length <= 35 && LANGUAGE_TAG.test(tag) ? tag : undefined;
}

function headerFingerprint(headers: Headers) {
  const fingerprint: Record<string, string> = {};
  for (const name of FINGERPRINT_HEADERS) {
    const value = headers.get(name);
    if (value) fingerprint[name] = value.slice(0, FINGERPRINT_VALUE_LENGTH);
  }
  // Names only, and no x-* names: those carry proxy and IP details, not browser behaviour.
  const names = [...headers.keys()].filter((name) => !name.startsWith("x-"));
  fingerprint["header-names"] = names
    .join(",")
    .slice(0, FINGERPRINT_VALUE_LENGTH);
  return fingerprint;
}

function dailyVisitorSalt(
  secret: string,
  ip: string,
  userAgent: string,
  now: Date,
) {
  const day = now.toISOString().slice(0, 10);
  return createHmac("sha256", secret)
    .update(`${day}|${ip}|${userAgent}`)
    .digest("hex");
}

/** Returns null for anything that is not a counted page view. */
export function buildPageView(
  request: PageRequest,
  config: Pick<AnalyticsConfig, "websiteId" | "saltSecret">,
  now = new Date(),
): UmamiSend | null {
  const { nextUrl: url, headers } = request;
  const userAgent = headers.get("user-agent");
  if (!userAgent || headers.get("sec-gpc") === "1") return null;
  if (!isPageNavigation(request)) return null;

  const referrer = externalReferrerOrigin(headers.get("referer"), url.host);
  const language = primaryLanguage(headers.get("accept-language"));
  const country = headers.get("x-vercel-ip-country");
  return {
    payload: {
      website: config.websiteId,
      hostname: url.hostname,
      url: url.pathname + campaignQuery(url),
      ...(referrer && { referrer }),
      ...(language && { language }),
      data: headerFingerprint(headers),
      salt: dailyVisitorSalt(
        config.saltSecret,
        getClientIp(request),
        userAgent,
        now,
      ),
    },
    headers: {
      "user-agent": userAgent,
      ...(country &&
        COUNTRY.test(country) && { "x-vercel-ip-country": country }),
    },
  };
}
