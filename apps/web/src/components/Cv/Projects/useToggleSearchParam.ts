import { useFiltersStore } from "./filtersStore";
import { recordVisitorInteraction } from "../../VisitorProfile/profileStore";

export const useToggleSearchParam = () => {
  const toggle = useFiltersStore((s) => s.toggle);
  return (key?: string, value?: string) => {
    if (!key || !value) return;
    if (
      !Object.entries(useFiltersStore.getState().filters)
        .find(([field]) => field === key)?.[1]
        ?.includes(value)
    )
      recordVisitorInteraction("filter_selected", `${key}:${value}`);
    toggle(key, value);
  };
};
