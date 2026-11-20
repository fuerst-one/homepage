export const PROFILE_TABS = [
  { id: "interests", sections: ["interests", "patterns"] },
  { id: "projects", sections: ["suggestions", "project-choices"] },
  { id: "signals", sections: ["activity"] },
  { id: "how-it-works", sections: ["how-it-works"] },
  { id: "settings", sections: ["profile-privacy"] },
] as const;
export type ProfileTabId = (typeof PROFILE_TABS)[number]["id"];

/** Links point at tabs or at sections inside them, e.g. `/profile#suggestions`. */
export function profileTabForHash(hash: string): ProfileTabId | null {
  const target = hash.replace(/^#/, "");
  if (!target) return null;
  const tab = PROFILE_TABS.find(
    ({ id, sections }) =>
      id === target || (sections as readonly string[]).includes(target),
  );
  return tab?.id ?? null;
}
