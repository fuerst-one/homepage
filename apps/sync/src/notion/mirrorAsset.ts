import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { safeCaseStudyImage } from "@homepage/content/projectCaseStudy";
import { knowledgeDatabase } from "@homepage/database/database";
import { getLegacyLogoPath } from "./notionImageProxy";

const LIMIT = 8 * 1024 * 1024;
// Existing externally hosted portfolio files. New origins require an explicit review.
const externalHosts = new Set([
  "nautic-internet.com",
  "cdn.public.zooplus.net",
  "burger-loop.fuerst.one",
]);
export function allowedAssetUrl(value: string) {
  if (safeCaseStudyImage(value)) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.port &&
      !url.username &&
      !url.password &&
      externalHosts.has(url.hostname)
    );
  } catch {
    return false;
  }
}

/** Immutable versions let the worker prepare bytes before atomically publishing a manifest. */
export async function mirrorAsset(
  key: string,
  source: string,
  revision: string,
  sql = knowledgeDatabase(),
) {
  const local = getLegacyLogoPath(source);
  if (!local && !allowedAssetUrl(source))
    throw new Error("Unsupported portfolio image origin");
  const canonical = new URL(source);
  canonical.search = "";
  const id = createHash("sha256")
    .update(JSON.stringify([key, canonical.href, revision]))
    .digest("hex");
  const [existing] = await sql`SELECT key FROM notion_assets WHERE key=${id}`;
  if (existing) return id;
  let content: Buffer, contentType: string;
  if (local) {
    content = await readFile(
      new URL(`../../assets/logos/${local.split("/").pop()}`, import.meta.url),
    );
    const ext = local.split(".").pop();
    contentType =
      ext === "svg"
        ? "image/svg+xml"
        : ext === "png"
          ? "image/png"
          : "image/jpeg";
  } else {
    const response = await fetch(source, {
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    contentType = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      .toLowerCase();
    if (
      !response.ok ||
      !/^image\/(?:jpeg|png|webp|gif|avif|svg\+xml)$/.test(contentType) ||
      !response.body
    ) {
      await response.body?.cancel();
      throw new Error("Portfolio image fetch failed");
    }
    const reader = response.body.getReader(),
      chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > LIMIT) {
        await reader.cancel();
        throw new Error("Portfolio image exceeds size limit");
      }
      chunks.push(value);
    }
    content = Buffer.concat(chunks);
  }
  if (content.length > LIMIT)
    throw new Error("Portfolio image exceeds size limit");
  await sql`INSERT INTO notion_assets(key,content,content_type) VALUES (${id},${content},${contentType}) ON CONFLICT DO NOTHING`;
  return id;
}
