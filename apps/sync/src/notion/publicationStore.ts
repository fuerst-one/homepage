import { knowledgeDatabase } from "@homepage/database/database";
import {
  PUBLICATION_KEY,
  type PublicPublication,
} from "@homepage/content/models";
import { postgresSnapshotStore } from "./snapshot";
import { publishedKnowledgeDocuments } from "../knowledge/publicationSource";
import type { CaseStudyBlock } from "./caseStudyBlocks";

export type WorkerPublication = PublicPublication & {
  sourceCache?: Record<
    string,
    { revision: string; blocks: CaseStudyBlock[]; incomplete: boolean }
  >;
};

/** Fence the public publication and source lease in the same database transaction. */
export function publicationStore(sql = knowledgeDatabase()) {
  const base = postgresSnapshotStore(sql);
  return {
    ...base,
    async publish(key: string, token: string, value: unknown) {
      const snapshot = value as WorkerPublication;
      const publication: PublicPublication = {
        version: snapshot.version,
        locales: snapshot.locales,
        assets: snapshot.assets,
      };
      const hashes = Object.fromEntries(
        publishedKnowledgeDocuments(publication).map((doc) => [
          doc.id,
          doc.hash,
        ]),
      );
      if (publication.version !== 3)
        throw new Error("Unsupported publication version");
      return sql.begin(async (tx) => {
        const [owned] =
          await tx`UPDATE notion_snapshots SET payload=${tx.json(JSON.parse(JSON.stringify(snapshot)))},refreshed_at=clock_timestamp(),lease_token=NULL,lease_until=clock_timestamp(),retry_at=clock_timestamp() WHERE key=${key} AND lease_token=${token} AND lease_until>clock_timestamp() RETURNING key`;
        if (!owned) return false;
        await tx`INSERT INTO public_content(key,payload,refreshed_at) VALUES (${PUBLICATION_KEY},${tx.json(JSON.parse(JSON.stringify(publication)))},clock_timestamp()) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,refreshed_at=excluded.refreshed_at`;
        // Redactions and withdrawn locale/body variants leave search before any provider call.
        const removed =
          await tx`DELETE FROM knowledge_documents d WHERE NOT EXISTS
          (SELECT 1 FROM jsonb_each_text(${tx.json(hashes)}) expected WHERE expected.key=d.id AND expected.value=d.hash) RETURNING id`;
        if (removed.length) await tx`DELETE FROM knowledge_sync`;
        return true;
      });
    },
  };
}
