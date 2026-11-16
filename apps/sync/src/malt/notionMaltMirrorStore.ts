import { safeNotionLogger } from "@homepage/database/notionDiagnostics";
import { Client } from "@notionhq/client";
import { createNotionFetch } from "../notion/createNotionFetch";
import {
  MALT_MIRROR_PROPERTY,
  MALT_REFRESH_PROPERTY,
  readMaltMirror,
  type MaltMirror,
} from "@homepage/content/maltMirror";
import type { MaltMirrorStore } from "@homepage/database/postgresMaltMirrorStore";
const pending = new Map<string, Promise<unknown>>();
const richText = (content: string) => ({
  rich_text: Array.from(
    { length: Math.ceil(content.length / 1800) },
    (_, index) => ({
      text: { content: content.slice(index * 1800, (index + 1) * 1800) },
    }),
  ),
});

export function notionMaltMirrorStore(): MaltMirrorStore {
  const pageId = process.env.NEXT_NOTION_OWNER_CONTACT_ID;
  if (!pageId || !process.env.NEXT_NOTION_TOKEN)
    throw new Error("malt_store_unconfigured");
  const client = new Client({
    logger: safeNotionLogger,
    auth: process.env.NEXT_NOTION_TOKEN,
    timeoutMs: 10_000,
    fetch: createNotionFetch(),
  });
  const read = async () => {
    const page = await client.pages.retrieve({ page_id: pageId });
    if (!("properties" in page)) throw new Error("malt_owner_not_found");
    const field = page.properties[MALT_MIRROR_PROPERTY];
    const value =
      field?.type === "rich_text"
        ? readMaltMirror(
            field.rich_text.map((text) => text.plain_text).join(""),
          )
        : null;
    if (!value) return null;
    const attempt = page.properties[MALT_REFRESH_PROPERTY];
    if (attempt?.type === "rich_text") {
      try {
        const parsed = JSON.parse(
          attempt.rich_text.map((text) => text.plain_text).join(""),
        );
        const checked = readMaltMirror(
          JSON.stringify({ ...value, lastAttempt: parsed }),
        );
        if (checked) value.lastAttempt = checked.lastAttempt;
      } catch {
        /* An absent or malformed attempt cannot erase a verified observation. */
      }
    }
    return value;
  };
  return {
    read,
    async write(value: MaltMirror, attemptOnly = false) {
      const checked = readMaltMirror(JSON.stringify(value));
      if (!checked) throw new Error("invalid_malt_mirror");
      // Serialize local writes and reject out-of-order observations. Notion has no cross-instance CAS.
      const before = pending.get(pageId) ?? Promise.resolve();
      const request = before
        .catch(() => {})
        .then(async () => {
          if (attemptOnly) {
            // Separate property: even a concurrent failed refresh cannot overwrite the observation.
            await client.pages.update({
              page_id: pageId,
              properties: {
                [MALT_REFRESH_PROPERTY]: richText(
                  JSON.stringify(checked.lastAttempt),
                ),
              },
            });
            return;
          }
          const latest = await read();
          if (
            latest?.observation &&
            checked.observation &&
            Date.parse(latest.observation.observedAt) >
              Date.parse(checked.observation.observedAt)
          )
            return "older" as const;
          await client.pages.update({
            page_id: pageId,
            properties: {
              [MALT_MIRROR_PROPERTY]: richText(
                JSON.stringify({ ...checked, lastAttempt: null }),
              ),
              [MALT_REFRESH_PROPERTY]: richText(
                JSON.stringify(checked.lastAttempt),
              ),
            },
          });
        });
      pending.set(pageId, request);
      try {
        return await request;
      } finally {
        if (pending.get(pageId) === request) pending.delete(pageId);
      }
    },
  };
}
