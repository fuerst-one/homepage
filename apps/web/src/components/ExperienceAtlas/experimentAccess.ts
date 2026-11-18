/** The experiment runner is an owner tool on localhost, never a public paid API. */
export function localExperimentAllowed(
  request: Request,
  environment: string | undefined,
  write = false,
) {
  if (
    environment !== "development" ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return false;
  const url = new URL(request.url);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  )
    return false;
  // Next can normalize request.url to its listening hostname. Validate the
  // browser-facing authority separately, then use it for the origin check.
  const host = request.headers.get("host");
  if (!host) return false;
  try {
    const authority = new URL(`${url.protocol}//${host}`);
    if (
      authority.host !== host ||
      authority.port !== url.port ||
      !["localhost", "127.0.0.1", "[::1]"].includes(authority.hostname)
    )
      return false;
    const origin = request.headers.get("origin");
    return origin ? origin === authority.origin : !write;
  } catch {
    return false;
  }
}
