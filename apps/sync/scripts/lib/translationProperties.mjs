/** Preserve the source's links and annotations; translating prose must not change them. */
export function translateRichText(source, parts) {
  if (source.length !== parts.length)
    throw new Error("Translation must preserve rich-text segment count");
  return source.map((item, index) => {
    if (item.type !== "text")
      throw new Error("Only text rich-text segments can be seeded");
    return {
      type: "text",
      text: { content: parts[index], link: item.text.link },
      annotations: item.annotations,
    };
  });
}

export function missingTranslationProperties(properties, translation) {
  const changes = {};
  for (const [source, target, parts] of [
    ["Project Description", "Project Description DE", translation.description],
    ["KPIs", "KPIs DE", translation.kpis],
  ]) {
    const existing = properties[target]?.rich_text ?? [];
    if (
      existing.some(
        (item) => item.plain_text?.trim() || item.text?.content?.trim(),
      )
    )
      continue;
    if (parts.length)
      changes[target] = {
        rich_text: translateRichText(properties[source].rich_text, parts),
      };
  }
  return changes;
}
