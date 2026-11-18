import type { CvProject } from "@homepage/content/models";
import type { FilterParams } from "./Filter/utils";
import { CASE_VOCABULARY } from "@homepage/content/projectCase";

export type ProjectSearchParams = Partial<
  Record<
    keyof CvProject | keyof FilterParams | "all" | "focus",
    string | string[]
  >
>;
const FILTER_KEYS = new Set([
  ...Object.keys(CASE_VOCABULARY),
  "id",
  "name",
  "logo",
  "icon",
  "screenshots",
  "wowFactor",
  "status",
  "featured",
  "projectType",
  "startDate",
  "endDate",
  "websiteUrl",
  "githubUrl",
  "industries",
  "productTypes",
  "targetMarket",
  "usageContext",
  "deliveryModel",
  "deliveryModels",
  "capabilities",
  "methods",
  "tools",
  "languages",
  "workplace",
  "position3d",
]);

export const parseProjectSearchParams = (
  searchParams: ProjectSearchParams,
): FilterParams => {
  const entries = Object.entries(searchParams).flatMap(([key, rawValue]) => {
    if (!FILTER_KEYS.has(key) || rawValue == null) return [];
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    const normalized = Array.from(
      new Set(
        values
          .flatMap((value) => value.split(","))
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );
    return normalized.length ? [[key, normalized]] : [];
  });
  if (!entries.length && searchParams.all !== "1")
    return { featured: ["true"] };
  const result: FilterParams = {};
  for (const [key, values] of entries as [keyof FilterParams, string[]][]) {
    const canonical = key === "deliveryModels" ? "deliveryModel" : key;
    result[canonical] = [...new Set([...(result[canonical] ?? []), ...values])];
  }
  return result;
};

const filterSignature = (filters: FilterParams) =>
  JSON.stringify(
    Object.entries(filters)
      .filter(([, values]) => values?.length)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, values]) => [key, [...values!].sort()]),
  );

type SyncAction =
  | { type: "read"; filters: FilterParams; focusedProjectId: string | null }
  | { type: "write"; search: string }
  | { type: "wait" | "accept" | "idle" };
/** Wait for our own navigation to land before considering the old URL an external change. */
export function reconcileProjectUrl({
  urlSearch,
  filters,
  focusedProjectId,
  lastUrl,
  pendingUrl,
}: {
  urlSearch: string;
  filters: FilterParams;
  focusedProjectId: string | null;
  lastUrl: string | null;
  pendingUrl: string | null;
}): SyncAction {
  const params = new URLSearchParams(urlSearch);
  const parsed = parseProjectSearchParams(Object.fromEntries(params.entries()));
  const stateSignature = (stateFilters: FilterParams, focus: string | null) =>
    JSON.stringify([filterSignature(stateFilters), focus]);
  const signature = stateSignature(parsed, params.get("focus"));
  const signatureForUrl = (search: string) => {
    const query = new URLSearchParams(search);
    return stateSignature(
      parseProjectSearchParams(Object.fromEntries(query.entries())),
      query.get("focus"),
    );
  };
  let acknowledged = false;
  if (pendingUrl !== null) {
    acknowledged = signature === signatureForUrl(pendingUrl);
    if (
      !acknowledged &&
      lastUrl !== null &&
      signature === signatureForUrl(lastUrl)
    )
      return { type: "wait" };
  }
  if (
    !acknowledged &&
    (lastUrl === null || signature !== signatureForUrl(lastUrl))
  )
    return {
      type: "read",
      filters: parsed,
      focusedProjectId: params.get("focus"),
    };
  if (signature === stateSignature(filters, focusedProjectId))
    return { type: acknowledged ? "accept" : "idle" };
  for (const key of FILTER_KEYS) params.delete(key);
  params.delete("all");
  const entries = Object.entries(filters)
    .filter(([, values]) => values?.length)
    .sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) params.set("all", "1");
  for (const [key, values] of entries) params.set(key, values!.join(","));
  if (focusedProjectId) params.set("focus", focusedProjectId);
  else params.delete("focus");
  return { type: "write", search: params.toString() };
}
