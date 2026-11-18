"use client";
import { useEffect, useState } from "react";
import type { Locale } from "@homepage/content/i18n";
import type { PublicImageDescription } from "@homepage/database/imageDescriptions";
import { GeneratedImageDescription } from "./GeneratedImageDescription";
const pending = new Map<string, Promise<PublicImageDescription[]>>();
function descriptions(projectId: string, locale: Locale) {
  const url = `/api/projects/${encodeURIComponent(projectId)}/image-descriptions?locale=${locale}`;
  const previous = pending.get(url);
  if (previous) return previous;
  const request = fetch(url, { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data.descriptions)
        ? data.descriptions.filter(
            (row: PublicImageDescription) =>
              typeof row?.href === "string" &&
              typeof row.description === "string" &&
              row.description.length <= 4000 &&
              typeof row.altText === "string" &&
              row.altText.length <= 160 &&
              row.language === "en",
          )
        : [];
    })
    .catch(() => [])
    .finally(() => pending.delete(url));
  pending.set(url, request);
  return request;
}
export function useImageDescriptions(
  projectId: string | undefined,
  locale: Locale,
  initialDescriptions?: PublicImageDescription[],
) {
  const [loaded, setLoaded] = useState<{
    projectId: string;
    locale: Locale;
    rows: PublicImageDescription[];
  } | null>(null);
  useEffect(() => {
    if (!projectId) return;
    let active = true;
    void descriptions(projectId, locale).then((rows) => {
      if (active) setLoaded({ projectId, locale, rows });
    });
    return () => {
      active = false;
    };
  }, [projectId, locale]);
  return loaded && loaded.projectId === projectId && loaded.locale === locale
    ? loaded.rows
    : (initialDescriptions ?? []);
}
export function ImageDescription({
  projectId,
  imageUrl,
  locale,
  initialDescriptions,
}: {
  projectId: string;
  imageUrl: string;
  locale: Locale;
  initialDescriptions?: PublicImageDescription[];
}) {
  const rows = useImageDescriptions(projectId, locale, initialDescriptions);
  const description = rows.find((row) => row.href === imageUrl)?.description;
  return (
    <GeneratedImageDescription
      key={imageUrl}
      description={description ?? ""}
      locale={locale}
    />
  );
}
