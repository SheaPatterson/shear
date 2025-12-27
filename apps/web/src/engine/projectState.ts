import type { RackPreset } from "./presets";

const KEY_PREFIX = "shear.project.v1:";

export type ProjectFxState = {
  projectId: string;
  rackPreset?: RackPreset;
};

export function loadProjectFxState(projectId: string): ProjectFxState {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + projectId);
    if (!raw) return { projectId };
    return JSON.parse(raw);
  } catch {
    return { projectId };
  }
}

export function saveProjectFxState(state: ProjectFxState) {
  localStorage.setItem(KEY_PREFIX + state.projectId, JSON.stringify(state));
}
