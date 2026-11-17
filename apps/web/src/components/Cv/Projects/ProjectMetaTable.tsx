import { CvProject } from "@homepage/content/models";
import { Tag } from "./Tag";

const ROW_LABELS: Partial<Record<keyof CvProject, string>> = {
  clients: "Clients",
  industries: "Industries",
  experiences: "Experiences",
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
  const filteredFields = Object.entries(ROW_LABELS)
    .filter(([projectKey]) => {
      const value = project[projectKey as keyof CvProject];
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== null;
    })
    .map(([key, label]) => ({
      label:
        locale === "de"
          ? (
              {
                clients: "Kunden",
                industries: "Branchen",
                experiences: "Erfahrungen",
                tools: "Tools",
                languages: "Sprachen",
              } as Record<string, string>
            )[key]
          : label,
      projectKey: key as keyof CvProject,
      value: project[key as keyof CvProject],
    }));

  if (filteredFields.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel space-y-3 border border-white/20 p-4 text-sm text-neutral-200">
      {filteredFields.map(({ label, projectKey, value }) => {
        const preview = formatPreviewValue(value);

        return (
          <details
            key={projectKey}
            className="glass-panel group border border-white/15 p-3"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-left text-[0.7rem] uppercase tracking-[0.3em] text-neutral-300 [&::-webkit-details-marker]:hidden">
              <span>{label}</span>
              <span className="flex items-center gap-2 text-[0.6rem] tracking-[0.25em] text-neutral-500">
                <span className="truncate text-neutral-300/80" title={preview}>
                  {preview}
                </span>
                <span
                  className="text-neutral-400 transition-transform group-open:rotate-180"
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
}: {
  projectKey: TKey;
  value: CvProject[TKey];
  filterable: boolean;
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
            {i}
          </Tag>
        ))}
      </div>
    );
  }
  return <span className="text-neutral-200">{value as string}</span>;
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
