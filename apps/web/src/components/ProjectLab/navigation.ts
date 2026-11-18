export const PRIMARY_LAB_TABS = [
  { id: "coverage", label: "Needs & use cases" },
  { id: "bundles", label: "Skill pairings" },
  { id: "evolution", label: "Over time" },
  { id: "vectors", label: "Similarity workbench" },
] as const;
const INTERNAL_LAB_TABS = [
  { id: "evidence", label: "Evidence & tag audit" },
  { id: "shortlist", label: "Case shortlist" },
  { id: "research", label: "Scale & effort" },
  { id: "appeal", label: "Appeal & difficulty" },
  { id: "priorities", label: "Evidence priorities" },
  { id: "peers", label: "Comparable projects" },
  { id: "context", label: "Delivery context" },
  { id: "lifecycle", label: "Lifecycle & operations" },
] as const;
export function labTabs(publicView: boolean) {
  return publicView
    ? [...PRIMARY_LAB_TABS]
    : [...PRIMARY_LAB_TABS, ...INTERNAL_LAB_TABS];
}
