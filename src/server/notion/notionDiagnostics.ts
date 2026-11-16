const safeCodes = new Set([
  "rate_limited",
  "service_overload",
  "service_unavailable",
  "validation_error",
  "unauthorized",
  "restricted_resource",
  "object_not_found",
  "internal_server_error",
  "notionhq_client_request_timeout",
  "notionhq_client_response_error",
  "42501",
  "42P01",
  "42703",
  "23505",
  "57014",
  "28P01",
  "08006",
  "08001",
  "53300",
  "ENOTFOUND",
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "snapshot_lease_lost",
]);

/** Never log SDK messages, SQL queries, parameters, URLs or upstream response bodies. */
export function notionFailure(error: unknown) {
  const value =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : {};
  const code =
    value.name === "TimeoutError" || value.name === "AbortError"
      ? "request_timeout"
      : typeof value.code === "string" && safeCodes.has(value.code)
        ? value.code
        : "unknown";
  return {
    code,
    ...(typeof value.status === "number" &&
    value.status >= 400 &&
    value.status <= 599
      ? { status: value.status }
      : {}),
  };
}

export function safeNotionLogger(
  _level: unknown,
  _message: string,
  details: Record<string, unknown>,
) {
  console.warn("Notion SDK request failed", notionFailure(details));
}
