export type UmamiPayload = {
  website: string;
  hostname: string;
  url: string;
  referrer?: string;
  language?: string;
  name?: string;
  data?: Record<string, string | number>;
  salt: string;
};
export type UmamiSend = {
  payload: UmamiPayload;
  headers: Record<string, string>;
};
export type AnalyticsConfig = {
  url: string;
  websiteId: string;
  saltSecret: string;
};

// Our Umami reads the client IP from this header (CLIENT_IP_HEADER). A fixed
// documentation address keeps real IPs out of Umami; the salt separates visitors.
export const CLIENT_IP_HEADER = "x-analytics-client-ip";
const PLACEHOLDER_IP = "192.0.2.1";
const SEND_TIMEOUT_MS = 1500;

export function getAnalyticsConfig(): AnalyticsConfig | null {
  const url = process.env.UMAMI_URL;
  const websiteId = process.env.UMAMI_WEBSITE_ID;
  const saltSecret = process.env.ANALYTICS_SALT_SECRET;
  if (!url || !websiteId || !saltSecret) return null;
  return { url: url.replace(/\/+$/, ""), websiteId, saltSecret };
}

/** Never throws: analytics must not affect the visitor's response. */
export async function sendToUmami(
  config: AnalyticsConfig,
  send: UmamiSend,
): Promise<void> {
  try {
    await fetch(`${config.url}/api/send`, {
      method: "POST",
      headers: {
        ...send.headers,
        "content-type": "application/json",
        [CLIENT_IP_HEADER]: PLACEHOLDER_IP,
      },
      body: JSON.stringify({ type: "event", payload: send.payload }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
  } catch {
    // Dropped page views are acceptable; retries would delay the function.
  }
}
