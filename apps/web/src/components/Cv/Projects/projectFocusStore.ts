"use client";

import { create } from "zustand";

export type ProjectFocusState = {
  focusedProjectId: string | null;
  hoveredProjectId: string | null;
  inViewProjectIds: string[];
  setFocusedProjectId: (id: string | null) => void;
  setHoveredProjectId: (id: string | null) => void;
  setInViewProjectIds: (ids: string[]) => void;
};

export const useProjectFocusStore = create<ProjectFocusState>((set) => ({
  focusedProjectId: null,
  hoveredProjectId: null,
  inViewProjectIds: [],
  setFocusedProjectId: (id) => set({ focusedProjectId: id }),
  setHoveredProjectId: (id) => set({ hoveredProjectId: id }),
  setInViewProjectIds: (ids) => set({ inViewProjectIds: ids }),
}));
