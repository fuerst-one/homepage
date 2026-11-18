import { SPACE_RECIPES, type SpaceLens, type SpaceView } from "./spaceTypes";

export type AtlasNavigation = {
  project: string;
  lens: SpaceLens;
  view: SpaceView;
};

export function readAtlasNavigation(
  query: Pick<URLSearchParams, "get">,
  projects: readonly { id: string }[],
): AtlasNavigation {
  const project = query.get("project");
  const lens = query.get("lens");
  const view = query.get("view");
  return {
    project: projects.some((item) => item.id === project) ? project! : "",
    lens:
      lens === "scale"
        ? "scale"
        : (SPACE_RECIPES.find((item) => item.id === lens)?.id ?? "product"),
    view: view === "2d" || view === "network" ? view : "3d",
  };
}

export function updateAtlasUrl(url: URL, change: Partial<AtlasNavigation>) {
  const defaults: AtlasNavigation = {
    project: "",
    lens: "product",
    view: "3d",
  };
  for (const key of ["project", "lens", "view"] as const) {
    const value = change[key];
    if (value === undefined) continue;
    if (value === defaults[key]) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
