/** Public freshness uses explicit UTC source edits, never refresh or project dates. */
export function contentDate(value: unknown): string | undefined {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
  )
    return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  const normalized = date.toISOString();
  // Date parses some impossible calendar dates by rolling into the next month.
  return normalized.slice(0, 19) === value.slice(0, 19)
    ? normalized
    : undefined;
}

export function latestContentDate(...values: unknown[]): string | undefined {
  return values
    .map(contentDate)
    .filter((value): value is string => value !== undefined)
    .sort()
    .at(-1);
}
