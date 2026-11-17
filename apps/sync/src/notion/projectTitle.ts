/** Compose the public title without changing the editor's separate source fields. */
export function getNotionProjectTitle(
  properties: Record<string, unknown>,
  fallbackName = "",
): string {
  const plainText = (value: unknown, type: "title" | "rich_text") => {
    const parts = (value as Record<string, unknown> | undefined)?.[type];
    return Array.isArray(parts)
      ? parts
          .map((part) =>
            typeof part?.plain_text === "string" ? part.plain_text : "",
          )
          .join("")
          .trim()
      : "";
  };
  return [
    plainText(properties.Name, "title") || fallbackName.trim(),
    plainText(properties["Short Description"], "rich_text"),
  ]
    .filter(Boolean)
    .join(" – ");
}
