import sharp from "sharp";
import { createHash } from "node:crypto";
import type { KnowledgeDocument } from "./publicationSource";
import { knowledgeDatabase } from "@homepage/database/database";
import { cachedImageDescription } from "@homepage/knowledge/imageDescriptions";
import { routerRequest } from "@homepage/knowledge/openRouter";
import {
  IMAGE_DESCRIPTION_MODEL,
  IMAGE_DESCRIPTION_VERSION,
  IMAGE_DESCRIPTION_PROMPT,
  IMAGE_DESCRIPTION_FORMAT,
  parseImageDescriptionVariants,
} from "@homepage/knowledge/imagePolicy";
import {
  reserveKnowledgeUsage,
  finishKnowledgeUsage,
} from "@homepage/knowledge/usage";

export async function prepareKnowledgeImage(
  content: Buffer,
  contentType: string,
): Promise<Buffer> {
  if (content.length > 8 * 1024 * 1024)
    throw new Error("Image size limit exceeded");
  if (!/^image\/(png|jpeg|webp|gif|avif)$/.test(contentType))
    throw new Error("Only raster images can be described");
  return sharp(content, { limitInputPixels: 40_000_000, failOn: "error" })
    .rotate()
    .resize({
      width: 1024,
      height: 1024,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}

/** Read exact mirrored public bytes. No source URLs or visitor content enter indexing. */
export async function describeKnowledgeImage(
  doc: KnowledgeDocument,
  sql = knowledgeDatabase(),
) {
  if (!doc.image) throw new Error("Image document required");
  const [asset] =
    await sql`SELECT a.content,a.content_type FROM public_content_assets a JOIN public_content p ON p.key='website-v3' AND p.payload->'assets'->>${doc.image.assetKey}=a.key WHERE a.key=${doc.image.assetId}`;
  if (!asset) throw new Error("Published image unavailable");
  // Validate/decode before claiming a paid checkpoint; unsupported inputs cost nothing.
  const jpeg = await prepareKnowledgeImage(
    asset.content as Buffer,
    asset.content_type as string,
  );
  const result = await cachedImageDescription(
    sql,
    {
      content: asset.content as Buffer,
      model: IMAGE_DESCRIPTION_MODEL,
      version: JSON.stringify([
        IMAGE_DESCRIPTION_VERSION,
        IMAGE_DESCRIPTION_PROMPT,
      ]),
    },
    async () => {
      const reservation = await reserveKnowledgeUsage("image-indexer", true);
      try {
        const data = await routerRequest("chat/completions", {
          model: IMAGE_DESCRIPTION_MODEL,
          messages: [
            { role: "system", content: IMAGE_DESCRIPTION_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Generate both the detailed description and concise alt text for this image.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${jpeg.toString("base64")}`,
                    detail: "high",
                  },
                },
              ],
            },
          ],
          response_format: IMAGE_DESCRIPTION_FORMAT,
          max_tokens: 360,
          temperature: 0,
        });
        const variants = parseImageDescriptionVariants(
          data.choices?.[0]?.message?.content,
        );
        const cost = data.usage?.cost;
        const costUsd =
          typeof cost === "number" && Number.isFinite(cost) && cost >= 0
            ? cost
            : undefined;
        await finishKnowledgeUsage(reservation, costUsd);
        return { ...variants, costUsd };
      } catch (error) {
        await finishKnowledgeUsage(reservation, undefined, true).catch(
          () => {},
        );
        throw error;
      }
    },
  );
  return {
    text: result.description,
    image: {
      ...doc.image,
      contentHash: result.contentHash,
      descriptionKey: result.key,
      descriptionHash: createHash("sha256")
        .update(result.description)
        .digest("hex"),
    },
  };
}
