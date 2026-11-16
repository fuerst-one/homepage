import { readPublicProjectCase } from "../../lib/projectCase";
import { caseStudyPageId } from "../../lib/projectCaseStudy";
import type { Locale } from "../../lib/i18n";
import { hasGermanTranslation } from "../../lib/localizeContent";

export type KnowledgeSeed = {
  id: string;
  projectId: string;
  title: string;
  locale: Locale;
  href: string;
  text: string;
  caseStudyId: string | null;
};
type Value = Record<string, unknown>;
const obj = (v: unknown): Value =>
  v && typeof v === "object" ? (v as Value) : {};
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const rich = (v: unknown) =>
  list(obj(v).rich_text ?? obj(v).title)
    .map((item) => obj(item).plain_text)
    .filter((v): v is string => typeof v === "string")
    .join("");

export function publicKnowledgeSeeds(
  page: unknown,
  slug: string,
): KnowledgeSeed[] {
  const source = obj(page),
    p = obj(source.properties);
  if (
    obj(p.Hidden).checkbox !== false ||
    source.archived ||
    source.in_trash ||
    typeof source.id !== "string" ||
    !/^[a-zA-Z0-9-]+$/.test(slug)
  )
    return [];
  const profile = readPublicProjectCase(page);
  if (!profile) return [];
  const title = rich(p.Name).slice(0, 200);
  if (!title) return [];
  const seeds: KnowledgeSeed[] = [];
  for (const locale of ["en", "de"] as const) {
    if (
      locale === "de" &&
      !hasGermanTranslation({
        germanReady: obj(p["German ready"]).checkbox === true,
        description: p["Project Description"],
        kpis: p.KPIs,
        descriptionDe: p["Project Description DE"],
        kpisDe: p["KPIs DE"],
      } as Parameters<typeof hasGermanTranslation>[0])
    )
      continue;
    const description = rich(
      p[locale === "de" ? "Project Description DE" : "Project Description"],
    );
    if (!description.trim()) continue;
    const text = [
      title,
      description,
      locale === "en" ? profile.summary : "",
      ...profile.buyerNeeds,
      ...profile.aiCapabilities,
      ...profile.stages,
      profile.ownership,
      profile.maintenance,
    ]
      .filter(Boolean)
      .join("\n\n");
    seeds.push({
      id: `${source.id}:${locale}`,
      projectId: source.id,
      title,
      locale,
      href: `/${locale}/projects/${slug}`,
      text,
      caseStudyId: caseStudyPageId(
        {
          caseStudyEn:
            typeof obj(p["Case study EN"]).url === "string"
              ? (obj(p["Case study EN"]).url as string)
              : null,
          caseStudyDe:
            typeof obj(p["Case study DE"]).url === "string"
              ? (obj(p["Case study DE"]).url as string)
              : null,
        },
        locale,
      ),
    });
  }
  return seeds;
}
