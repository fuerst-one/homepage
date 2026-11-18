import { ProjectScaleFacts } from "./ProjectScaleFacts";
import { CvProject } from "@homepage/content/models";
import {
  sectorLabel,
  deliveryLabel,
  projectDeliveryModels,
} from "@homepage/content/projectTaxonomy";
import { Tag } from "./Tag";

const ROW_LABELS: Partial<Record<keyof CvProject, string>> = {
  clients: "Clients",
  industries: "Industries",
  productTypes: "Product formats",
  targetMarket: "Customer market",
  usageContext: "Usage context",
  deliveryModel: "Delivery & operation",
  capabilities: "Capabilities",
  methods: "Methods",
  tools: "Tools",
  languages: "Languages",
};

export const ProjectMetaTable = ({
  project,
  filterable = true,
  locale = "en",
}: {
  project: CvProject;
  filterable?: boolean;
  locale?: "en" | "de";
}) => {
  const fieldValue = (key: keyof CvProject) =>
    key === "deliveryModel" ? projectDeliveryModels(project) : project[key];
  const filteredFields = Object.entries(ROW_LABELS)
    .filter(([projectKey]) => {
      const value = fieldValue(projectKey as keyof CvProject);
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== null && value !== undefined && value !== "";
    })
    .map(([key, label]) => ({
      label:
        locale === "de"
          ? (
              {
                clients: "Kunden",
                industries: "Branchen",
                productTypes: "Produktformate",
                targetMarket: "Zielmarkt",
                usageContext: "Nutzungskontext",
                deliveryModel: "Bereitstellung & Betrieb",
                capabilities: "Kompetenzen",
                methods: "Methoden",
                tools: "Tools",
                languages: "Sprachen",
              } as Record<string, string>
            )[key]
          : label,
      projectKey: key as keyof CvProject,
      value: fieldValue(key as keyof CvProject),
    }));

  if (filteredFields.length === 0 && !project.scale) {
    return null;
  }

  return (
    <div className="glass-panel space-y-3 border border-white/20 p-4 text-sm text-neutral-200">
      <ProjectScaleFacts scale={project.scale} locale={locale} />
      {filteredFields.map(({ label, projectKey, value }) => {
        const preview = formatPreviewValue(
          (projectKey === "industries" || projectKey === "deliveryModel") &&
            Array.isArray(value)
            ? (value as string[]).map((item) =>
                projectKey === "industries"
                  ? sectorLabel(item, locale)
                  : deliveryLabel(item, locale),
              )
            : value,
        );

        return (
          <details
            key={projectKey}
            className="glass-panel group border border-white/15 p-3"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-left text-[0.7rem] uppercase tracking-[0.3em] text-neutral-300 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 break-words">{label}</span>
              <span className="flex min-w-0 items-center gap-2 text-[0.6rem] tracking-[0.25em] text-neutral-500">
                <span className="truncate text-neutral-300/80" title={preview}>
                  {preview}
                </span>
                <span
                  className="shrink-0 text-neutral-400 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                >
                  ▾
                </span>
              </span>
            </summary>
            <div className="mt-3 border-t border-white/10 pt-3 text-[0.75rem] tracking-normal text-neutral-200">
              <Property
                projectKey={projectKey}
                value={value}
                filterable={filterable}
                locale={locale}
              />
            </div>
          </details>
        );
      })}
    </div>
  );
};

const Property = <TKey extends keyof CvProject>({
  projectKey,
  value,
  filterable,
  locale,
}: {
  projectKey: TKey;
  value: CvProject[TKey];
  filterable: boolean;
  locale: "en" | "de";
}) => {
  if (projectKey === "clients") {
    return (
      <div className="flex flex-wrap gap-2">
        {(value as { id: string; name: string }[]).map((item) => (
          <Tag key={item.id} className="flex gap-0.5">
            <div>{item.name}</div>
          </Tag>
        ))}
      </div>
    );
  }
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-2">
        {(value as string[]).map((i, idx) => (
          <Tag
            key={idx}
            searchParamKey={filterable ? projectKey : undefined}
            value={i}
          >
            {projectKey === "industries"
              ? sectorLabel(i, locale)
              : projectKey === "deliveryModel"
                ? deliveryLabel(i, locale)
                : i}
          </Tag>
        ))}
      </div>
    );
  }
  return (
    <Tag
      searchParamKey={filterable ? projectKey : undefined}
      value={value as string}
    >
      {value as string}
    </Tag>
  );
};

const formatPreviewValue = (value: CvProject[keyof CvProject]) => {
  if (Array.isArray(value)) {
    const names = value
      .map((item) => {
        if (!item) {
          return null;
        }
        if (typeof item === "string") {
          return item;
        }
        if (typeof item === "object" && "name" in item) {
          return String(item.name);
        }
        return null;
      })
      .filter((item): item is string => !!item);

    if (!names.length) {
      return "None";
    }

    if (names.length <= 2) {
      return names.join(", ");
    }

    return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (!value) {
    return "None";
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof (value as { name?: unknown }).name === "string"
  ) {
    return String((value as { name: string }).name);
  }

  return String(value);
};
