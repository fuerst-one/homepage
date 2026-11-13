import type icons from "../../data/landing-icon-svgs.json";

export type IconId = "react" | keyof typeof icons;
// Existing navigation sculptures retain indices 0–5.
export const ICON_IDS: IconId[] = [
  "react",
  "ship",
  "brain",
  "car",
  "route",
  "tasks",
  "test",
  "truck",
  "globe",
  "burger",
  "book",
  "document",
  "satellite",
  "tools",
  "box",
  "survey",
  "music",
  "compass",
  "charging",
  "paw",
  "cart",
  "containers",
  "map",
  "chart",
  "anchor",
  "robot",
  "basket",
  "watch",
  "code",
  "shirt",
  "wave",
  "spreadsheet",
  "leaf",
  "tooth",
  "palette",
];
export const iconShape = (icon: IconId) => 6 + ICON_IDS.indexOf(icon);

/** Notion owns the project choice; unsupported or empty values use the folder. */
export const getProjectIconShape = (icon: string | null | undefined) =>
  icon && ICON_IDS.includes(icon as IconId) ? iconShape(icon as IconId) : 0;

export const getKeywordIconShape = (
  field: string,
  value: string,
  fallback: number,
) =>
  field === "tools" && /^(react(\.js)?|react native)$/i.test(value.trim())
    ? iconShape("react")
    : fallback;
