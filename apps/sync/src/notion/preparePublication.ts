import {
  CASE_VOCABULARY,
  type ProjectCase,
} from "@homepage/content/projectCase";
import { hasGermanTranslation } from "@homepage/content/localizeContent";
import {
  caseStudyPageId,
  publicCaseStudyLink,
  safeCaseStudyLink,
} from "@homepage/content/projectCaseStudy";
import slugs from "@homepage/content/data/project-slugs.json";
import {
  caseAssetKey,
  propertyAssetKey,
  type PublicPublication,
  type WebsiteContent,
  type RichTextContent,
  type RichTextField,
  type CvProject,
  type CaseStudyBlock,
} from "@homepage/content/models";
import type { Locale } from "@homepage/content/i18n";

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown) => (typeof value === "string" ? value : "");
const strings = (value: unknown) =>
  list(value).filter((item): item is string => typeof item === "string");
const localImage = (value: unknown): string | null =>
  typeof value === "string" &&
  /^\/api\/image\/[a-zA-Z0-9-]+\/(?:Logo|Screenshots|Avatar)(?:\?i=\d+)?$/.test(
    value,
  )
    ? value
    : null;
const supported = new Set([
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list_item",
  "numbered_list_item",
  "quote",
  "callout",
  "toggle",
  "code",
  "image",
  "divider",
]);

/** Construct every public record explicitly. Raw source objects never cross this boundary. */
export function preparePublication(value: unknown): PublicPublication {
  const source = record(value),
    manifest = record(source.assets),
    assets: Record<string, string> = {};
  const projects = list(source.projects)
    .map(record)
    .filter(
      (p) => p.hidden === false && !p.archived && !p.in_trash && text(p.id),
    );
  const sourceOwner = record(source.owner);
  const keepAsset = (key: string) => {
    const id = manifest[key];
    if (typeof id !== "string") return false;
    assets[key] = id;
    return true;
  };
  const profiles = new Map(
    list(source.cases)
      .map(record)
      .map((row) => [text(row.id), publicCase(row.caseStudy)]),
  );
  const ids = (p: Record<string, unknown>) => ({
    en: caseStudyPageId(p, "en"),
    de: caseStudyPageId(p, "de"),
  });
  const sourceStudies = record(source.studies);
  const locales = {} as Record<Locale, WebsiteContent>;
  for (const locale of ["en", "de"] as const) {
    const projectLinks: Record<string, string> = {};
    for (const p of projects) {
      const slug = (slugs as Record<string, string>)[text(p.id)] ?? text(p.id);
      projectLinks[text(p.id)] = `/${locale}/projects/${slug}`;
      for (const id of Object.values(ids(p)))
        if (id) projectLinks[id] = `/${locale}/projects/${slug}/case-study`;
    }
    const rich = (value: unknown): RichTextContent[] =>
      list(value).map((raw) => {
        const item = record(raw),
          a = record(item.annotations),
          content = text(item.plain_text) || text(record(item.text).content);
        const href = publicCaseStudyLink(
          text(item.href) || text(record(record(item.text).link).url),
          projectLinks,
        );
        return {
          type: "text",
          text: { content, link: href ? { url: href } : null },
          plain_text: content,
          href,
          annotations: {
            bold: a.bold === true,
            italic: a.italic === true,
            strikethrough: a.strikethrough === true,
            underline: a.underline === true,
            code: a.code === true,
            color: text(a.color) || "default",
          },
        };
      });
    const field = (value: unknown): RichTextField => ({
      type: "rich_text",
      rich_text: rich(record(value).rich_text),
    });
    const studies: Record<string, CaseStudyBlock[]> = {};
    const prepared = projects.map((p) => {
      const translated = hasGermanTranslation(
        p as unknown as Parameters<typeof hasGermanTranslation>[0],
      );
      const german = locale === "de" && translated,
        studyIds = ids(p);
      const activeIds = {
        en: studyIds.en && sourceStudies[studyIds.en] ? studyIds.en : null,
        de:
          translated && studyIds.de && sourceStudies[studyIds.de]
            ? studyIds.de
            : null,
      };
      const blocks = (values: unknown, studyId: string): CaseStudyBlock[] =>
        list(values).flatMap((raw) => {
          const b = record(raw),
            type = text(b.type),
            id = text(b.id);
          if (!supported.has(type) || !id) return [];
          const block: CaseStudyBlock = {
            id,
            type,
            richText: rich(b.richText),
            caption: rich(b.caption),
            children: blocks(b.children, studyId),
          };
          if (type === "image") {
            if (!keepAsset(caseAssetKey(studyId, id))) return [];
            block.imageUrl = `/api/projects/${encodeURIComponent(text(p.id))}/case-study/images/${encodeURIComponent(id)}?locale=${locale}`;
          }
          if (type === "code") block.language = text(b.language);
          return [block];
        });
      for (const id of Object.values(activeIds))
        if (id && !studies[id]) studies[id] = blocks(sourceStudies[id], id);
      const images = (property: string, values: unknown) => {
        const result = strings(values).flatMap((v, index) => {
          const path = localImage(v);
          return path &&
            keepAsset(propertyAssetKey(text(p.id), property, index))
            ? [path]
            : [];
        });
        return result.length ? result : null;
      };
      const project: CvProject = {
        id: text(p.id),
        name: text(p.name),
        logo: images("Logo", p.logo),
        screenshots: images("Screenshots", p.screenshots),
        icon:
          typeof record(source.icons)[text(p.id)] === "string"
            ? text(record(source.icons)[text(p.id)])
            : null,
        description: field(german ? p.descriptionDe : p.description),
        kpis: field(german ? p.kpisDe : p.kpis),
        contentLocale: german ? "de" : "en",
        availableLocales: translated ? ["en", "de"] : ["en"],
        caseStudyIds: activeIds,
        wowFactor: typeof p.wowFactor === "number" ? p.wowFactor : 0,
        status: text(p.status),
        featured: p.featured === true,
        projectType: text(p.projectType),
        startDate: text(p.startDate),
        endDate: text(p.endDate) || null,
        websiteUrl: safeCaseStudyLink(text(p.websiteUrl)),
        githubUrl: safeCaseStudyLink(text(p.githubUrl)),
        industries: strings(p.industries),
        experiences: strings(p.experiences),
        tools: strings(p.tools),
        languages: strings(p.languages),
        workplace: text(p.workplace),
        clients: list(p.clients)
          .map(record)
          .filter((c) => text(c.id) && text(c.name))
          .map((c) => ({
            id: text(c.id),
            name: text(c.name),
            url: safeCaseStudyLink(text(c.url)),
          })),
        position3d: [0, 1, 2].map((i) =>
          typeof list(p.position3d)[i] === "number" ? list(p.position3d)[i] : 0,
        ) as [number, number, number],
        matching: profiles.get(text(p.id)),
      };
      return project;
    });
    const ownerGerman = locale === "de" ? record(sourceOwner.german) : {};
    const ownerText = (key: string) =>
      text(ownerGerman[key]) || text(sourceOwner[key]);
    let avatarUrl = localImage(sourceOwner.avatarUrl);
    if (avatarUrl) {
      const path = new URL(avatarUrl, "https://local.invalid");
      const [, , , id, property] = path.pathname.split("/");
      if (!keepAsset(propertyAssetKey(id, property, 0))) avatarUrl = null;
    }
    const address = record(sourceOwner.address);
    locales[locale] = {
      evidence: prepared.map((p) => {
        const profile = profiles.get(p.id) ?? publicCase({});
        const slug = (slugs as Record<string, string>)[p.id] ?? p.id;
        return {
          id: p.id,
          name: p.name,
          href: `/${locale}/projects/${slug}`,
          summary:
            profile.summary ||
            p.description.rich_text
              .map((t) => t.plain_text)
              .join("")
              .slice(0, 600),
          summaryLocale: profile.summary ? "en" : p.contentLocale,
          caseStudy: { ...profile, summary: "" },
        };
      }),
      projects: prepared,
      owner: {
        name: text(sourceOwner.name),
        position: ownerText("position"),
        status: ownerText("status"),
        languages: ownerText("languages"),
        education: ownerText("education"),
        city: text(sourceOwner.city),
        available:
          typeof sourceOwner.available === "boolean"
            ? sourceOwner.available
            : null,
        avatarUrl,
        email: text(sourceOwner.email),
        address: {
          street: text(address.street),
          zip: text(address.zip),
          city: text(address.city),
          country: text(address.country),
        },
      },
      icons: Object.fromEntries(prepared.map((p) => [p.id, p.icon])),
      cases: prepared.map((p) => ({
        id: p.id,
        caseStudy: profiles.get(p.id) ?? publicCase({}),
      })),
      copy: Object.fromEntries(
        list(source.copy)
          .map(record)
          .map((row) => [text(row.key), text(row[locale]) || text(row.en)]),
      ),
      studies,
    };
  }
  return { version: 2, locales, assets };
}

function publicCase(value: unknown): ProjectCase {
  const raw = record(value);
  const selected = (key: keyof typeof CASE_VOCABULARY) =>
    strings(raw[key]).filter((v) => Object.hasOwn(CASE_VOCABULARY[key], v));
  return {
    buyerNeeds: selected("buyerNeeds"),
    stages: selected("stages"),
    domains: selected("domains"),
    aiUsage: selected("aiUsage"),
    aiCapabilities: selected("aiCapabilities"),
    ownership: Object.hasOwn(CASE_VOCABULARY.ownership, text(raw.ownership))
      ? text(raw.ownership)
      : "",
    maintenance: Object.hasOwn(
      CASE_VOCABULARY.maintenance,
      text(raw.maintenance),
    )
      ? text(raw.maintenance)
      : "",
    summary: text(raw.summary).slice(0, 600),
  };
}
