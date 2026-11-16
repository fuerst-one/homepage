import type { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";

export const readProjectIcons = (pages: QueryDatabaseResponse["results"]) => {
  const icons: Record<string, string | null> = {};
  for (const page of pages) {
    if (page.object !== "page" || !("properties" in page)) continue;
    const property = page.properties["3D Icon"];
    icons[page.id] =
      property?.type === "select" ? (property.select?.name ?? null) : null;
  }
  return icons;
};
