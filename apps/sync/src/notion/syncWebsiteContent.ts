import { safeNotionLogger } from "@homepage/database/notionDiagnostics";
import { Client, collectPaginatedAPI } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import source from "../data/notion-site-copy.json";
import { caseStudyPageId } from "@homepage/content/projectCaseStudy";
import { readPublicProjectCase } from "@homepage/content/projectCase";
import { knowledgeDatabase } from "@homepage/database/database";
import { createNotionReadFetch } from "./createNotionFetch";
import {
  fetchNotionProjectsDatabase,
  type NotionProjectRaw,
} from "./fetchNotionProjectsDatabase";
import { getCvProjects } from "./getCvProjects";
import { getCvOwner } from "./getCvOwner";
import { loadCaseStudyBlocks, type CaseStudyBlock } from "./caseStudyBlocks";
import { readProjectIcons } from "./projectIcons";
import { mirrorAsset } from "./mirrorAsset";
import { refreshSnapshot } from "./snapshot";
import { publicationStore, type WorkerPublication } from "./publicationStore";
import { preparePublication } from "./preparePublication";

import {
  WEBSITE_CONTENT_KEY,
  propertyAssetKey,
  caseAssetKey,
} from "@homepage/database/websiteContent";

type Published = WorkerPublication;

/** Only the background worker calls this. A failed read leaves the old publication intact. */
export async function syncWebsiteContent(force = false) {
  const sql = knowledgeDatabase(),
    store = publicationStore(sql);
  const previous = (await store.read(WEBSITE_CONTENT_KEY))?.value as
    | Published
    | undefined;
  await refreshSnapshot(
    store,
    WEBSITE_CONTENT_KEY,
    async (): Promise<Published> => {
      const notion = new Client({
        timeoutMs: 120_000,
        logger: safeNotionLogger,
        auth: process.env.NEXT_NOTION_TOKEN,
        fetch: createNotionReadFetch(),
      });
      const projectDb = process.env.NEXT_NOTION_PROJECT_DB_ID;
      const ownerId = process.env.NEXT_NOTION_OWNER_CONTACT_ID;
      if (!projectDb || !ownerId)
        throw new Error("Website Notion source unconfigured");
      const raw = await collectPaginatedAPI(notion.databases.query, {
        database_id: projectDb,
      });
      const parsed = await fetchNotionProjectsDatabase(
        raw.filter(
          (p) =>
            "properties" in p && "archived" in p && !p.archived && !p.in_trash,
        ) as NotionProjectRaw[],
      );
      const projects = await getCvProjects(parsed);
      const publicIds = new Set(projects.map((p) => p.id));
      const pages = raw.filter(
        (p): p is PageObjectResponse =>
          "properties" in p && publicIds.has(p.id),
      );
      const ownerPage = await notion.pages.retrieve({ page_id: ownerId });
      if (
        !("properties" in ownerPage) ||
        ownerPage.archived ||
        ownerPage.in_trash
      )
        throw new Error("Website owner unavailable");
      const owner = await getCvOwner(ownerPage);
      const copyPages = await collectPaginatedAPI(notion.databases.query, {
        database_id:
          process.env.NEXT_NOTION_SITE_COPY_DB_ID || source.databaseId,
      });
      const copy = copyPages.flatMap((page) => {
        if (!("properties" in page)) return [];
        const text = (key: string) => {
          const prop = page.properties[key];
          return prop?.type === "title"
            ? prop.title.map((t) => t.plain_text).join("")
            : prop?.type === "rich_text"
              ? prop.rich_text.map((t) => t.plain_text).join("")
              : "";
        };
        return [{ key: text("Key"), en: text("English"), de: text("German") }];
      });
      if (!copy.length) throw new Error("Website copy source empty");
      const cases = pages.flatMap((page) => {
        const caseStudy = readPublicProjectCase(page);
        return caseStudy ? [{ id: page.id, caseStudy }] : [];
      });
      const assets: Record<string, string> = {},
        studies: Record<string, CaseStudyBlock[]> = {},
        sourceCache: NonNullable<WorkerPublication["sourceCache"]> = {};
      let deferredAssets = 0;
      const incompleteCases = new Set<string>();
      const asset = async (key: string, url: string, version: string) => {
        try {
          assets[key] = await mirrorAsset(key, url, version, sql);
          return true;
        } catch {
          if (previous?.assets[key]) assets[key] = previous.assets[key];
          deferredAssets++;
          return false;
        }
      };
      for (const page of [...pages, ownerPage]) {
        for (const property of page.id === ownerPage.id
          ? ["Avatar"]
          : ["Logo", "Screenshots"]) {
          const value = page.properties[property];
          if (value?.type !== "files") continue;
          for (const [index, file] of value.files.entries()) {
            const url = "file" in file ? file.file.url : file.external.url;
            await asset(
              propertyAssetKey(page.id, property, index),
              url,
              page.last_edited_time,
            );
          }
        }
      }
      for (const project of projects) {
        for (const locale of ["en", "de"] as const) {
          const id = caseStudyPageId(project, locale);
          if (!id || studies[id]) continue;
          const page = await notion.pages.retrieve({ page_id: id });
          if (!("last_edited_time" in page) || page.archived || page.in_trash) {
            // Withdraw the published link along with its body in the same transaction.
            if (locale === "en") project.caseStudyEn = null;
            else project.caseStudyDe = null;
            continue;
          }
          const cached = previous?.sourceCache?.[id];
          const cachedAssetsAvailable = (items: CaseStudyBlock[]): boolean =>
            items.every(
              (block) =>
                (!block.imageUrl ||
                  Boolean(previous?.assets[caseAssetKey(id, block.id)])) &&
                cachedAssetsAvailable(block.children),
            );
          const reuse =
            cached?.revision === page.last_edited_time &&
            !cached.incomplete &&
            cachedAssetsAvailable(cached.blocks);
          const blocks = reuse
            ? cached.blocks
            : await loadCaseStudyBlocks(
                async (block_id, start_cursor) =>
                  notion.blocks.children.list({
                    block_id,
                    start_cursor,
                    page_size: 100,
                  }),
                id,
              );
          studies[id] = blocks;
          const mirrorBlocks = async (items: CaseStudyBlock[]) => {
            for (const block of items) {
              if (
                block.imageUrl &&
                !(await asset(
                  caseAssetKey(id, block.id),
                  block.imageUrl,
                  page.last_edited_time,
                ))
              )
                incompleteCases.add(id);
              await mirrorBlocks(block.children);
            }
          };
          if (reuse) {
            const restoreAssets = (items: CaseStudyBlock[]) => {
              for (const block of items) {
                const key = caseAssetKey(id, block.id);
                if (previous?.assets[key]) assets[key] = previous.assets[key];
                restoreAssets(block.children);
              }
            };
            restoreAssets(blocks);
          } else await mirrorBlocks(blocks);
          sourceCache[id] = {
            revision: page.last_edited_time,
            blocks,
            incomplete: incompleteCases.has(id),
          };
        }
      }
      console.log("Website content prepared", {
        projects: projects.length,
        caseStudies: Object.keys(studies).length,
        assets: Object.keys(assets).length,
        deferredAssets,
      });
      const publication = preparePublication({
        projects,
        owner,
        icons: readProjectIcons(pages),
        cases,
        copy,
        studies,
        assets,
      });
      return { ...publication, sourceCache };
    },
    force ? 0 : 300,
  );
  // Immutable old image versions are retained for a day for in-flight readers.
  await sql`DELETE FROM notion_assets WHERE created_at<clock_timestamp()-interval '1 day'
    AND key NOT IN (SELECT jsonb_object_values FROM public_content s,
      LATERAL jsonb_each_text(s.payload->'assets') AS a(asset_key,jsonb_object_values) WHERE s.key=${WEBSITE_CONTENT_KEY}
      UNION SELECT a.value FROM notion_snapshots legacy, LATERAL jsonb_each_text(legacy.payload->'assets') a WHERE legacy.key='website-v1')`;
}
