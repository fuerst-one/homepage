import type { CvProject, RichTextField } from "./models";
import { localeFromPath, type Locale } from "./i18n";
import { caseLabel } from "./projectCase";
import { sectorColor, sectorLabel } from "./projectTaxonomy";
import { caseStudyPageId } from "./projectCaseStudy";

export type WorkLens = "challenges" | "industries";
type Groupable = {
  id: string;
  industries: string[];
  matching?: { buyerNeeds: string[] };
};
export type WorkGroup = {
  id: string;
  label: string;
  color: string;
  ids: string[];
};

// Derived from the lab's categorical atlas: meaningful regions, with secondary
// memberships preserved. Coordinates are a layout, never a skill/similarity scale.
const CHALLENGES = [
  {
    id: "interfaces",
    en: "Complex interfaces",
    de: "Komplexe Interfaces",
    color: "#b2a8da",
    needs: [
      "Improve a complex interface",
      "Create an interactive experience",
      "Enable collaboration",
    ],
  },
  {
    id: "automation",
    en: "AI & automation",
    de: "KI & Automatisierung",
    color: "#e5b183",
    needs: [
      "Automate repetitive work",
      "Add AI capabilities",
      "Build internal tooling",
    ],
  },
  {
    id: "data",
    en: "Data & decisions",
    de: "Daten & Entscheidungen",
    color: "#80c5bd",
    needs: ["Make data actionable", "Deliver an industry-specific workflow"],
  },
  {
    id: "growth",
    en: "Commerce & conversion",
    de: "Commerce & Conversion",
    color: "#d69ca6",
    needs: ["Improve conversion", "Sell products", "Create a public website"],
  },
  {
    id: "launch",
    en: "Launch & validate",
    de: "Starten & validieren",
    color: "#c6dc96",
    needs: ["Launch a new product", "Validate a product idea"],
  },
  {
    id: "systems",
    en: "Connected systems",
    de: "Vernetzte Systeme",
    color: "#8bb8dd",
    needs: [
      "Integrate business systems",
      "Connect software and hardware",
      "Maintain and evolve a product",
      "Work in a team",
    ],
  },
] as const;

export function workMemberships(project: Groupable, lens: WorkLens): string[] {
  const ids =
    lens === "industries"
      ? [...new Set(project.industries.filter(Boolean))].sort()
      : CHALLENGES.filter((g) =>
          g.needs.some((need) => project.matching?.buyerNeeds.includes(need)),
        ).map((g) => g.id);
  return ids.length ? ids : ["other"];
}

export function workGroups(
  projects: Groupable[],
  lens: WorkLens,
  locale: Locale = "en",
): WorkGroup[] {
  const definitions =
    lens === "challenges"
      ? CHALLENGES.map((g) => ({
          id: g.id as string,
          label: g[locale],
          color: g.color as string,
        }))
      : [...new Set(projects.flatMap((p) => p.industries).filter(Boolean))]
          .sort()
          .map((id) => ({
            id,
            label: sectorLabel(id, locale),
            color: sectorColor(id),
          }));
  return [
    ...definitions,
    {
      id: "other",
      label: locale === "de" ? "Weitere Projekte" : "Other projects",
      color: "#a4ada5",
    },
  ]
    .map((g) => ({
      ...g,
      ids: projects
        .filter((p) => workMemberships(p, lens).includes(g.id))
        .map((p) => p.id),
    }))
    .filter((g) => g.ids.length);
}

export function landscapePoints(projects: Groupable[], lens: WorkLens) {
  const groups = workGroups(projects, lens);
  const rows = [...new Map(projects.map((p) => [p.id, p])).values()].sort(
    (a, b) => a.id.localeCompare(b.id),
  );
  return rows.map((project) => {
    const group = workMemberships(project, lens)[0];
    const index = groups.findIndex((g) => g.id === group);
    const members = rows.filter((p) => workMemberships(p, lens)[0] === group);
    const offset = members.findIndex((p) => p.id === project.id);
    const angle = offset * Math.PI * (3 - Math.sqrt(5));
    const radius = 0.48 * Math.sqrt((offset + 0.5) / members.length);
    const columns = groups.length > 6 ? 4 : 3;
    const center: [number, number, number] = [
      ((index % columns) - (columns - 1) / 2) * 1.65,
      (Math.floor(index / columns) -
        (Math.ceil(groups.length / columns) - 1) / 2) *
        -1.5,
      Math.sin(index * 2.1) * 0.55,
    ];
    const position: [number, number, number] = [
      center[0] + Math.cos(angle) * radius,
      center[1] + Math.sin(angle) * radius,
      center[2] + Math.sin(angle * 1.7) * radius * 0.65,
    ];
    return {
      id: project.id,
      group,
      center,
      position,
      color: groups[index].color,
    };
  });
}

const text = (field: RichTextField) =>
  (field?.rich_text ?? [])
    .map((t) => t.plain_text)
    .join("")
    .trim();
export function workProject(project: CvProject, href: string, locale: Locale) {
  return {
    id: project.id,
    name: project.name,
    label: project.name.split(/\s[–—]\s/)[0],
    href,
    caseHref: caseStudyPageId(project, localeFromPath(href))
      ? `${href}/case-study`
      : null,
    contentLocale: project.contentLocale ?? locale,
    screenshot: project.screenshots?.[0] ?? null,
    summary:
      project.contentLocale === "de"
        ? text(project.description)
        : project.matching?.summary || text(project.description),
    outcome: text(project.kpis),
    ownership: caseLabel(project.matching?.ownership ?? "", locale),
    stages: (project.matching?.stages ?? []).map((s) => caseLabel(s, locale)),
    industries: project.industries,
    capabilities: project.capabilities.slice(0, 4),
    matching: { buyerNeeds: project.matching?.buyerNeeds ?? [] },
    startDate: project.startDate,
    endDate: project.endDate,
    status: project.status,
    hasConnectedRepo: project.hasConnectedRepo,
  };
}
export type WorkProject = ReturnType<typeof workProject>;

const SELECTED_IDS = [
  "15b86514-f736-803e-b9b7-e47ebc2406d1",
  "153f6668-f4d6-490a-8345-0b999b35305a",
  "11d86514-f736-80ed-935c-e6fe30b59d42",
];
export function selectedWork<T extends { id: string }>(projects: T[]): T[] {
  return SELECTED_IDS.flatMap((id) => projects.find((p) => p.id === id) ?? []);
}

function day(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return null;
  const date = value.slice(0, 10),
    time = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(time) &&
    new Date(time).toISOString().slice(0, 10) === date &&
    date >= "1970-01-01"
    ? date
    : null;
}
export function portfolioTimeline(
  projects: Pick<CvProject, "id" | "startDate" | "endDate" | "status">[],
  asOf: string,
) {
  const today = day(asOf);
  if (!today) throw new Error("Invalid portfolio date");
  const rows = [...new Map(projects.map((p) => [p.id, p])).values()].flatMap(
    (p) => {
      const start = day(p.startDate),
        end = day(p.endDate);
      if (!start || start > today || (p.endDate && (!end || end < start)))
        return [];
      return [
        {
          id: p.id,
          start: start.slice(0, 7),
          end: (end ?? (p.status === "In Progress" ? today : start)).slice(
            0,
            7,
          ),
        },
      ];
    },
  );
  if (!rows.length) return [];
  const first = rows.map((p) => p.start).sort()[0];
  const result: { month: string; starts: string[]; engagements: string[] }[] =
    [];
  const cursor = new Date(`${first}-01T00:00:00Z`);
  while (cursor.toISOString().slice(0, 7) <= today.slice(0, 7)) {
    const month = cursor.toISOString().slice(0, 7);
    result.push({
      month,
      starts: rows
        .filter((p) => p.start === month)
        .map((p) => p.id)
        .sort(),
      engagements: rows
        .filter((p) => p.start <= month && p.end >= month)
        .map((p) => p.id)
        .sort(),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}
export type PortfolioMonth = ReturnType<typeof portfolioTimeline>[number];

export type TimelineProject = { label: string; outsideGitHub: boolean };
export type TimelineMonth = { month: string; projects: TimelineProject[] };

export function timelineProjects(
  months: PortfolioMonth[],
  projects: Pick<
    WorkProject,
    "id" | "label" | "startDate" | "hasConnectedRepo"
  >[],
): TimelineMonth[] {
  const byId = new Map(projects.map((project) => [project.id, project]));
  return months.map(({ month, engagements }) => ({
    month,
    projects: engagements
      .flatMap((id) => byId.get(id) ?? [])
      .sort(
        (a, b) =>
          a.startDate.localeCompare(b.startDate) ||
          a.label.localeCompare(b.label),
      )
      // An unchecked project is not evidence of work outside GitHub.
      .map(({ label, hasConnectedRepo }) => ({
        label,
        outsideGitHub: hasConnectedRepo === false,
      })),
  }));
}
