import { safeNotionLogger } from "./notionDiagnostics";
import { Client, collectPaginatedAPI } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import source from "../../data/notion-site-copy.json";
import { caseStudyPageId } from "../../lib/projectCaseStudy";
import { readPublicProjectCase } from "../../lib/projectCase";
import { knowledgeDatabase } from "../knowledge/database";
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
import { postgresSnapshotStore, refreshSnapshot } from "./snapshot";
import {
  WEBSITE_CONTENT_KEY,
  propertyAssetKey,
  caseAssetKey,
  type WebsiteContent,
} from "./websiteContent";

type Published = WebsiteContent & {
  caseVersions: Record<string, string>;
  incompleteCases: string[];
};

/** Only the background worker calls this. A failed read leaves the old publication intact. */
export async function syncWebsiteContent(force = false) {
  const sql = knowledgeDatabase(),
    store = postgresSnapshotStore(sql);
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
        raw as NotionProjectRaw[],
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
        caseVersions: Record<string, string> = {};
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
          caseVersions[id] = page.last_edited_time;
          const blocks =
            previous?.caseVersions?.[id] === page.last_edited_time &&
            !previous.incompleteCases?.includes(id)
              ? previous.studies[id]
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
          await mirrorBlocks(blocks);
        }
      }
      console.log("Website content prepared", {
        projects: projects.length,
        caseStudies: Object.keys(studies).length,
        assets: Object.keys(assets).length,
        deferredAssets,
      });
      return {
        projects,
        owner,
        icons: readProjectIcons(pages),
        cases,
        copy,
        studies,
        assets,
        caseVersions,
        incompleteCases: [...incompleteCases],
      };
    },
    force ? 0 : 300,
  );
  // Immutable old image versions are retained for a day for in-flight readers.
  await sql`DELETE FROM notion_assets WHERE created_at<clock_timestamp()-interval '1 day'
    AND key NOT IN (SELECT jsonb_object_values FROM notion_snapshots s,
      LATERAL jsonb_each_text(s.payload->'assets') AS a(asset_key,jsonb_object_values) WHERE s.key=${WEBSITE_CONTENT_KEY})`;
}
