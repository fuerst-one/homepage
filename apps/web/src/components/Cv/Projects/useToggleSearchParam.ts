import { useProjectListStore } from "./projectListStore";

export const useToggleSearchParam = () => {
  const toggle = useProjectListStore((s) => s.toggle);
  return (key?: string, value?: string) => {
    if (!key || !value) return;
    toggle(key, value);
  };
};
