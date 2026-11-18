import { createHash } from "node:crypto";
import type {
  CvProject,
  PublicPublication,
  CaseStudyBlock,
} from "@homepage/content/models";
import { propertyAssetKey, caseAssetKey } from "@homepage/content/models";
import type { Locale } from "@homepage/content/i18n";
import {
  IMAGE_DESCRIPTION_MODEL,
  IMAGE_DESCRIPTION_VERSION,
  IMAGE_DESCRIPTION_PROMPT,
} from "@homepage/knowledge/imagePolicy";
import type { KnowledgeDocument } from "./publicationSource";

/** Only images rendered by this locale's public project can become evidence. */
export function publishedImageDocuments(
  publication: PublicPublication,
  p: CvProject,
  locale: Locale,
  href: string,
): KnowledgeDocument[] {
  const images = new Map<
    string,
    { assetKey: string; assetId: string; href: string }
  >();
  const add = (assetKey: string, path: string) => {
    const assetId = publication.assets?.[assetKey];
    if (assetId) images.set(assetKey, { assetKey, assetId, href: path });
  };
  for (const path of p.screenshots ?? []) {
    const match = new RegExp(
      `^/api/image/${encodeURIComponent(p.id)}/Screenshots(?:\\?i=(\\d+))?$`,
    ).exec(path);
    if (!match) continue;
    const index = Number(match[1] ?? 0);
    if (Number.isInteger(index) && index >= 0 && index <= 50)
      add(propertyAssetKey(p.id, "Screenshots", index), path);
  }
  const study = p.caseStudyIds[locale];
  const visit = (blocks: CaseStudyBlock[]) => {
    for (const block of blocks) {
      const path = `/api/projects/${encodeURIComponent(p.id)}/case-study/images/${encodeURIComponent(block.id)}?locale=${locale}`;
      if (study && block.type === "image" && block.imageUrl === path)
        add(caseAssetKey(study, block.id), path);
      visit(block.children);
    }
  };
  if (study) visit(publication.locales[locale].studies[study] ?? []);
  return [...images.values()].map((image) => {
    const doc = {
      id: `${p.id}:${locale}:image:${createHash("sha256").update(image.assetKey).digest("hex").slice(0, 20)}`,
      projectId: p.id,
      title: p.name,
      locale,
      href,
      text: "",
      image,
    };
    return {
      ...doc,
      hash: createHash("sha256")
        .update(
          JSON.stringify([
            doc,
            IMAGE_DESCRIPTION_MODEL,
            IMAGE_DESCRIPTION_VERSION,
            IMAGE_DESCRIPTION_PROMPT,
          ]),
        )
        .digest("hex"),
    };
  });
}
