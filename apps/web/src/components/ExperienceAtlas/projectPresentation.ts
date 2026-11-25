import type { Locale } from "@homepage/content/i18n";
import type { CvProject } from "@homepage/content/models";
import { hasGermanTranslation } from "@homepage/content/localizeContent";
import { flattenRichText } from "../../app/cv.pdf/flattenRichText";
import { projectPath } from "../../lib/seo";
import type { AtlasProject } from "./model";
import { publicProjectScale } from "@homepage/content/projectScale";
import type { SemanticDataset, SemanticSpace } from "./spaceTypes";

/** Reuse the fitted explorer, restricted to the current public publication. */
export function publishedExplorerData(
  snapshot: {
    atlas: (Omit<AtlasProject, "scale"> & { scale?: unknown })[];
    semantic: SemanticDataset;
  },
  published: CvProject[],
  locale: Locale,
) {
  const byId = new Map(published.map((project) => [project.id, project]));
  const allowed = new Set(
    snapshot.atlas.filter((p) => byId.has(p.id)).map((p) => p.id),
  );
  const projects = snapshot.atlas.flatMap((project) => {
    const current = byId.get(project.id);
    if (!current) return [];
    return [
      presentProject(
        {
          ...project,
          scale: publicProjectScale(project.scale),
          screenshots: current.screenshots ?? [],
          caseHref: null,
          related: project.related.filter((relation) =>
            allowed.has(relation.id),
          ),
        },
        current,
        locale,
      ),
    ];
  });
  const publicSpace = (space: SemanticSpace): SemanticSpace => {
    const indices = space.ids.flatMap((id, index) =>
      allowed.has(id) ? [index] : [],
    );
    return {
      ...space,
      ids: indices.map((i) => space.ids[i]),
      positions2d: indices.map((i) => space.positions2d[i]),
      positions3d: indices.map((i) => space.positions3d[i]),
      similarities: indices.map((i) =>
        indices.map((j) => space.similarities[i][j]),
      ),
      edges: space.edges.filter(
        (edge) => allowed.has(edge.a) && allowed.has(edge.b),
      ),
      excluded: space.excluded.filter((item) => allowed.has(item.id)),
      fieldTerms:
        space.fieldTerms &&
        Object.fromEntries(
          Object.entries(space.fieldTerms).filter(([id]) => allowed.has(id)),
        ),
      groups: space.groups.flatMap((group) => {
        const ids = group.ids.filter((id) => allowed.has(id));
        if (!ids.length) return [];
        return [
          {
            ...group,
            ids,
            medoid: ids.includes(group.medoid) ? group.medoid : ids[0],
            terms:
              ids.length === group.ids.length
                ? group.terms
                : [
                    ...new Set(
                      ids.flatMap((id) => space.fieldTerms?.[id] ?? []),
                    ),
                  ].slice(0, 4),
          },
        ];
      }),
    };
  };
  return {
    projects,
    semanticData: {
      ...snapshot.semantic,
      spaces: {
        product: publicSpace(snapshot.semantic.spaces.product),
        engineering: publicSpace(snapshot.semantic.spaces.engineering),
        practice: publicSpace(snapshot.semantic.spaces.practice),
      },
    },
  };
}

/** Localized prose and destinations stay separate from canonical model inputs. */
export function presentProject(
  project: AtlasProject,
  published: CvProject | undefined,
  locale: Locale,
): AtlasProject {
  const contentLocale = published?.contentLocale ?? "en";
  const linkLocale =
    locale === "de" && published && hasGermanTranslation(published)
      ? "de"
      : "en";
  const caseLocale =
    locale === "de" && published?.caseStudyIds?.de ? "de" : "en";
  return {
    ...project,
    presentation: {
      accentColor: published?.accentColor ?? null,
      description:
        (published && flattenRichText(published.description)) ||
        project.subtitle ||
        project.summary,
      locale: contentLocale,
      projectHref: published ? projectPath(published, linkLocale) : null,
      caseHref: published?.caseStudyIds?.[caseLocale]
        ? `${projectPath(published, caseLocale)}/case-study`
        : project.caseHref,
      caseLocale,
    },
  };
}
