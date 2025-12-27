import type { LoadedPlugin } from "./InsertSlot";

export type SlotPreset = {
  slotIndex: number;
  bypassed: boolean;
  plugin?: { pluginId: string; version: string; processor: string };
  params: Record<string, number>;
};

export type RackPreset = {
  name: string;
  createdAt: string;
  slots: SlotPreset[];
};

const KEY = "shear.presets.rack.v1";

export function loadRackPresets(): RackPreset[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveRackPresets(presets: RackPreset[]) {
  localStorage.setItem(KEY, JSON.stringify(presets));
}

export function makeRackPreset(args: {
  name: string;
  slots: Array<{ slotIndex: number; bypassed: boolean; loaded?: LoadedPlugin; params: Record<string, number> }>;
}): RackPreset {
  return {
    name: args.name,
    createdAt: new Date().toISOString(),
    slots: args.slots.map(s => ({
      slotIndex: s.slotIndex,
      bypassed: s.bypassed,
      plugin: s.loaded ? { pluginId: s.loaded.pluginId, version: s.loaded.version, processor: s.loaded.processor } : undefined,
      params: s.params
    }))
  };
}
