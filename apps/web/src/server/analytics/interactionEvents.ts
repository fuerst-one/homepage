import { isPagePath, visitorIdentity } from "./pageView";
import type { AnalyticsConfig, UmamiSend } from "./umami";

export type ClickInteraction =
  | { name: "outbound"; data: { url: string } }
  | { name: "download"; data: { file: string } }
  | { name: "explorer-used"; data: { demo: "explorer" } };
/** Only the server reports these, so the beacon endpoint never accepts them. */
type ServerInteraction = { name: "enquiry-sent" };
export type Interaction = ClickInteraction | ServerInteraction;

const URL_MAX_LENGTH = 200;
const FILE_TYPE = /^[a-z0-9]{1,8}$/;

type InteractionRequest = Pick<Request, "headers"> & { nextUrl: URL };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKey = (data: Record<string, unknown>, key: string) =>
  Object.keys(data).length === 1 && typeof data[key] === "string";

/** Origin and path only: queries and fragments can carry personal data. */
function outboundDestination(href: string) {
  try {
    const { protocol, origin, pathname } = new URL(href);
    if (protocol !== "https:" && protocol !== "http:") return null;
    const destination = origin + pathname;
    return destination.length <= URL_MAX_LENGTH ? destination : null;
  } catch {
    return null;
  }
}

export function parseInteraction(input: unknown): ClickInteraction | null {
  if (!isRecord(input) || !isRecord(input.data)) return null;
  const { name, data } = input;
  if (name === "outbound" && hasOnlyKey(data, "url")) {
    const url = outboundDestination(data.url as string);
    return url ? { name, data: { url } } : null;
  }
  if (name === "download" && hasOnlyKey(data, "file")) {
    const file = data.file as string;
    return FILE_TYPE.test(file) ? { name, data: { file } } : null;
  }
  if (name === "explorer-used" && hasOnlyKey(data, "demo"))
    return data.demo === "explorer"
      ? { name, data: { demo: "explorer" } }
      : null;
  return null;
}

function referringPagePath(referer: string | null, ownHost: string) {
  if (!referer) return null;
  try {
    const { host, pathname } = new URL(referer);
    return host === ownHost && isPagePath(pathname) ? pathname : null;
  } catch {
    return null;
  }
}

/** Null unless the interaction happened on one of our pages and may be counted. */
export function buildInteractionEvent(
  request: InteractionRequest,
  interaction: Interaction,
  config: Pick<AnalyticsConfig, "websiteId" | "saltSecret">,
  now = new Date(),
): UmamiSend | null {
  const url = referringPagePath(
    request.headers.get("referer"),
    request.nextUrl.host,
  );
  const visitor = url && visitorIdentity(request, config, now);
  if (!visitor) return null;
  return {
    payload: {
      website: config.websiteId,
      hostname: request.nextUrl.hostname,
      url,
      name: interaction.name,
      ...("data" in interaction && { data: interaction.data }),
      salt: visitor.salt,
    },
    headers: visitor.headers,
  };
}
