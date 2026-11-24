import { knowledgeDatabase } from "@homepage/database/database";
import type { IndexNowStore } from "./syncIndexNow";

export function indexNowStore(sql = knowledgeDatabase()): IndexNowStore {
  return {
    async submitted() {
      const rows = await sql<
        { url: string; lastmod: string | null }[]
      >`SELECT url, lastmod FROM indexnow_submissions`;
      return new Map(rows.map(({ url, lastmod }) => [url, lastmod]));
    },
    async record(entries) {
      await sql`INSERT INTO indexnow_submissions ${sql(entries, "url", "lastmod")}
        ON CONFLICT (url) DO UPDATE SET lastmod=excluded.lastmod, submitted_at=now()`;
    },
  };
}
